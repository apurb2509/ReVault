"""
Master LangGraph state machine.

Each module is a node in the graph. The router decides which node(s) to
activate based on the incoming event type and failure cause. All nodes
share the same AgentState typed dict and write their outputs back into it.
"""
import uuid
from typing import Annotated, Any, TypedDict

from langgraph.graph import END, StateGraph

from models.payment_event import EventType, FailureCause, PaymentEvent


class AgentState(TypedDict):
    # Input
    event: PaymentEvent
    customer_id: str
    merchant_id: str

    # Set by the router
    active_modules: list[str]

    # Outputs written by each module
    rca_result: dict[str, Any] | None
    recovery_actions_taken: list[dict[str, Any]]
    compliance_blocks: list[dict[str, Any]]
    ptp_created: dict[str, Any] | None
    voice_script: str | None
    advisory: str | None

    # Final status
    escalated: bool
    recovered: bool
    error: str | None


def _route_event(state: AgentState) -> list[str]:
    """
    Determines which agent modules to activate for a given event.
    Multiple modules can run for the same event (e.g. abandonment + PTP).
    """
    event = state["event"]
    modules: list[str] = []

    match event.event_type:
        case EventType.PAYMENT_FAILED:
            modules.append("degradation_watchdog")
            if event.failure_cause == FailureCause.FRAUD_SUSPECTED:
                # Fraud goes straight to human — no further automation
                modules.append("human_escalation")
            else:
                modules.append("mandate_sequencer")
        case EventType.ORDER_ABANDONED:
            modules.append("abandonment_hunter")
        case EventType.SUBSCRIPTION_PENDING | EventType.SUBSCRIPTION_HALTED:
            modules.append("subscription_rescue")
            modules.append("mandate_sequencer")
        case EventType.INVOICE_EXPIRED:
            modules.append("receivables_pursuit")
        case EventType.PAYMENT_CAPTURED:
            # Recovery confirmed — mark any open PTP records as KEPT
            modules.append("ptp_tracker")

    return modules


def build_graph() -> StateGraph:
    # Import agent nodes here to avoid circular imports at module load time
    from agents.degradation_watchdog import run as degradation_node
    from agents.abandonment_hunter import run as abandonment_node
    from agents.subscription_rescue import run as subscription_node
    from agents.receivables_pursuit import run as receivables_node
    from agents.mandate_sequencer import run as mandate_node
    from agents.voice_agent import run as voice_node
    from agents.ptp_tracker import run as ptp_node

    graph = StateGraph(AgentState)

    graph.add_node("router", lambda state: {**state, "active_modules": _route_event(state)})
    graph.add_node("degradation_watchdog", degradation_node)
    graph.add_node("abandonment_hunter", abandonment_node)
    graph.add_node("subscription_rescue", subscription_node)
    graph.add_node("receivables_pursuit", receivables_node)
    graph.add_node("mandate_sequencer", mandate_node)
    graph.add_node("voice_agent", voice_node)
    graph.add_node("ptp_tracker", ptp_node)

    graph.set_entry_point("router")

    # Router fans out to whichever modules are active
    graph.add_conditional_edges(
        "router",
        lambda state: state["active_modules"] or [END],
    )

    # All terminal modules go to END
    for node in [
        "degradation_watchdog",
        "abandonment_hunter",
        "subscription_rescue",
        "receivables_pursuit",
        "mandate_sequencer",
        "voice_agent",
        "ptp_tracker",
    ]:
        graph.add_edge(node, END)

    return graph.compile()


# Module-level compiled graph — instantiated once at startup
compiled_graph = build_graph()
