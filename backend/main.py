import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import webhooks, events
from services.degradation_monitor import DegradationMonitor
from services.sequence_scheduler import SequenceScheduler
from tools.razorpay_client import RazorpayClient
from routers.events import broadcaster

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


async def rca_trigger(segment: dict, current_payments: list[dict]) -> None:
    """
    Triggered by DegradationMonitor when a bank/method success rate drops >15%.
    Builds a synthetic PaymentEvent and runs it through the full LangGraph RCA pipeline
    so the degradation_watchdog agent can generate a Gemini root-cause analysis and
    merchant advisory — closing the detection-to-action loop.
    """
    logger.info("RCA trigger fired for degradation segment: %s", segment)

    import uuid
    from agents.graph import compiled_graph, AgentState
    from models.payment_event import PaymentEvent, EventType, FailureCause
    from db.database import async_session

    # Map degradation bank/method info to a FailureCause best guess
    cause_guess = FailureCause.BANK_INFRA_DOWN
    if segment.get("method") in ("upi", "upi_qr"):
        cause_guess = FailureCause.UPI_RAIL_DEGRADED

    async with async_session() as db:
        try:
            event = PaymentEvent(
                razorpay_event_id=f"degradation_{uuid.uuid4().hex[:12]}",
                event_type=EventType.PAYMENT_FAILED,
                failure_cause=cause_guess,
                amount=0,
                raw_payload={
                    "degradation_segment": segment,
                    "current_payments_sampled": len(current_payments),
                    "alert_type": "DEGRADATION_ALERT",
                    "baseline_rate": segment.get("baseline_rate"),
                    "current_rate": segment.get("current_rate"),
                    "drop": segment.get("drop"),
                },
            )
            db.add(event)
            await db.commit()
            await db.refresh(event)

            initial_state: AgentState = {
                "event": event,
                "customer_id": "system_degradation_monitor",
                "merchant_id": "default",
                "active_modules": [],
                "rca_result": None,
                "recovery_actions_taken": [],
                "compliance_blocks": [],
                "ptp_created": None,
                "voice_script": None,
                "advisory": None,
                "escalated": False,
                "recovered": False,
                "error": None,
            }

            final_state = await compiled_graph.ainvoke(initial_state)
            rca = final_state.get("rca_result") or {}
            advisory = final_state.get("advisory", "")
            logger.info(
                "RCA completed — bank: %s, method: %s, root_cause: %s (conf: %.2f), advisory: %s",
                segment.get("bank"), segment.get("method"),
                rca.get("root_cause"), rca.get("confidence", 0), advisory,
            )
        except Exception as exc:
            logger.error("rca_trigger LangGraph invocation failed for segment %s: %s", segment, exc)


async def trigger_live_test_startup():
    import asyncio
    await asyncio.sleep(10)
    logger.info("Executing automated Startup Live Test for WhatsApp...")
    
    from routers.realtime import TriggerEventRequest, process_realtime_event
    from db.database import async_session
    
    req = TriggerEventRequest(
        event_type="payment.failed",
        customer_name="Apurb",
        phone_number=settings.your_personal_phone_number,
        amount=250000,
        failure_cause="INSUFFICIENT_FUNDS"
    )
    
    try:
        async with async_session() as db:
            await process_realtime_event(req, db)
    except Exception as e:
        logger.error(f"Startup live test failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ReVault API...")

    # Initialize background degradation monitor (polls Razorpay every 2 min)
    rzp = RazorpayClient()
    monitor = DegradationMonitor(rzp, broadcaster, rca_trigger)
    monitor.start()

    # Initialize sequence scheduler — fires deferred contact sequences:
    #   abandonment tier 2/3, subscription win-back, mandate retries, PTP follow-up
    import redis.asyncio as aioredis
    redis_client = aioredis.from_url(settings.redis_url, ssl_cert_reqs="none")
    seq_scheduler = SequenceScheduler(redis_client)
    seq_scheduler.start()

    import asyncio
    if settings.startup_live_test:
        asyncio.create_task(trigger_live_test_startup())

    yield

    logger.info("Shutting down ReVault API...")
    monitor.stop()
    seq_scheduler.stop()
    await redis_client.aclose()


app = FastAPI(
    title="ReVault API",
    description="Autonomous AI Revenue Recovery Operating System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import api, webhooks, twilio_voice, events, batch, realtime

app.include_router(api.router)
app.include_router(webhooks.router)
app.include_router(twilio_voice.router)
app.include_router(events.router)
app.include_router(batch.router)
app.include_router(realtime.router)

@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}

