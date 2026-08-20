===============================================================
REVAULT — THE COMPLETE AI REVENUE RECOVERY OPERATING SYSTEM
Razorpay Buildathon 2026 — Track 3: AI Revenue Recovery
"Don't just find the leak. Stop it. Measure it. Win it back."
===============================================================

This is not a dashboard. This is not a chatbot. This is an autonomous, multi-agent
Revenue Recovery Operating System that actively detects, diagnoses, and executes
recovery across every form of revenue leakage that Razorpay merchants face — from
real-time payment degradation to B2B invoice chasers to subscription mandate
sequencers. Every rupee tracked. Every decision explained. Every action auditable.

NOTE BEFORE ANYTHING ELSE (added):
Razorpay already ships a live product called "UPI Autopay with Intelligent
Revenue-Protect" that improves mandate success and recovers failed debits across
registration, debit, and cancellation. Two of the modules below (Subscription
Rescue and Mandate Retry Sequencer) sit close to that product's territory. This is
not disqualifying, but it must be said out loud in the pitch rather than discovered
by a judge. Suggested framing: "Razorpay's Revenue-Protect improves success at the
mandate level. ReVault adds a cross-channel, root-cause-aware layer on top of that
— Hinglish voice recovery, Promise-to-Pay tracking, and B2B receivables — which
Revenue-Protect does not touch." Use this in the pitch, early.

===============================================================
SCOPE: EVERY PROBLEM IN TRACK 3, SOLVED
===============================================================

Track 3 Example Direction                          ReVault Module                         Status
Payment degradation -> root cause -> recovery       Degradation Watchdog + RCA Engine       Module 1
Checkout drop-off recovery                          Abandonment Hunter Agent                Module 2
Failed-subscription recovery                        Subscription Rescue + Mandate Sequencer Module 3
B2B receivables chaser                              Receivables Pursuit Agent               Module 4
Mandate retry sequencer                             Intelligent Retry Orchestrator          Module 5
Hinglish voice recovery                             VoiceIQ Recovery Agent                  Module 6
Promise-to-pay tracker                              PTP Commitment Engine                   Module 7

The bar is met:
- Measured money recovered across a batch
- Compliant escalation with stopping rules
- Full immutable audit trail on every action
- Does not just identify — executes recovery end-to-end

===============================================================
REAL PROBLEMS — VERIFIED, WITH CORRECTIONS (added)
===============================================================

Problem Set 1: Payment Degradation (Real-Time)
- Razorpay processes 500M+ transactions/month; bank-specific failure spikes can hit
  within 30 seconds
- Merchants currently have zero real-time feedback when a specific bank/method is
  degrading
- No system exists that auto-detects -> root-causes -> switches recovery mode for
  degraded traffic
- Gap: Razorpay's Optimizer does routing before payment. Nobody handles
  after-failure recovery intelligently.

Problem Set 2: Checkout Abandonment (The Silent Killer)
- Cart abandonment tied to payment failure (not pure user intent) is a widely
  discussed driver in India-focused checkout research. The original "70%" figure
  used to describe this is unsourced — either find a citable source before putting
  it on a slide, or soften to "a significant share of abandonment is payment
  failure, not intent" and argue from mechanism instead.
- Razorpay's abandoned-cart webhook only works with Magic Checkout — standard
  checkout merchants are blind
- Gap: no product today watches standard orders that are "created but never paid"
  and auto-recovers them

Problem Set 3: Subscription & Mandate Failures (High MRR Impact)
- CORRECTED STAT: the figure "UPI Autopay failure: 55-90% across Indian banks" is
  not accurate and should not be used. Verified figures from current sources: UPI
  AutoPay failure rates run roughly 8-15%, versus 2-3% for card mandates, with some
  categories spiking past 20% after RBI's 2021 rule requiring additional
  authentication above ₹5,000. Use these numbers instead, and cite them as
  industry estimates unless you've personally confirmed a specific source.
- DISCLOSURE (added): Razorpay's own "UPI Autopay Intelligent Revenue-Protect"
  already targets this exact problem (mandate success improvement, failed-debit
  recovery, churn reduction). The pitch needs the differentiation line from the
  top of this document here, not as an afterthought.
- Razorpay's native retry is largely fixed-schedule ("try tomorrow"); the
  opportunity is dynamic, cause-aware retry timing (funds vs. bank down vs. limit)
  layered on top of existing retry infrastructure
- Gap that still holds: no system dynamically re-classifies failure cause on every
  retry attempt and adapts rail (UPI vs card vs link) accordingly, with a full
  reasoning trail attached to every decision

Problem Set 4: B2B Receivables (Hidden Revenue Graveyard)
- Manual, spreadsheet-based invoice follow-up is common at Indian SMEs. Verify the
  "60% of B2B companies" and "45-75 day DSO" figures before presenting them as
  sourced facts; if no citable source is found, present them as reasonable
  estimates rather than hard statistics.
- Gap: no Razorpay-native product closes the loop from invoice -> automated
  multi-touch chasing -> payment link -> reconciliation

Problem Set 5: Promise-to-Pay Tracking (Broken Promise = Lost Revenue)
- Verbal/digital payment promises without structured follow-up are known to
  underperform. Same caution applies to the "40-60% failure rate" figure — treat
  as an estimate unless sourced.
- No existing Razorpay integration tracks PTP commitments and triggers escalation
  on broken promises — this is the strongest, most defensible gap claim in the
  whole plan. Lean on it hard in the pitch.

===============================================================
SYSTEM ARCHITECTURE — SINGLE CANONICAL VERSION (added: consolidated)
===============================================================

NOTE (added): The original planning material contained two different
architectures — this LangGraph/FastAPI/Redis Streams version, and a separate
Go + Kafka "Implementation Plan" further below. Both are kept in this document
(nothing removed), but only ONE should be built as the primary system: the
architecture below. The Go/Kafka version is retained at the end as a documented
"future scale-out path" — genuinely useful for a "how would this scale" slide,
but a second, competing architecture in the same pitch reads as unresolved
thinking rather than a deliberate choice.

ReVault — Architecture

  INGESTION LAYER
    Razorpay Webhooks | Polling Scheduler | Manual Batch Upload
        |
  EVENT PROCESSING (Redis Streams)
    Dedup | Priority Queue | Rate Limiter | Compliance Filter
        |
  LANGGRAPH AGENT ORCHESTRATOR
    Module 1: Degradation Watchdog     Module 2: Abandonment Hunter
    Module 3: Subscription Rescue      Module 4: B2B Receivables
    Module 5: Mandate Retry            Module 6: VoiceIQ Agent
    Module 7: PTP Tracker
    Shared: Gemini LLM | Compliance Engine | Audit Logger
        |
  ACTION EXECUTION LAYER
    Razorpay Payment Links API | WhatsApp Business API | Voice TTS
    Razorpay Subscriptions API | Email (SendGrid free) | SMS Gateway
        |
  PERSISTENCE & ANALYTICS
    PostgreSQL (Audit Trail + Events) | Redis (State + Queue)
    TimescaleDB extension (time-series metrics)
        |
  OPERATOR CONTROL PLANE
    React Dashboard (Real-time) | WebSocket Feed | Batch Report View
    Human-in-the-Loop Approvals | Agent Thought Traces | Config Panel

===============================================================
MODULE DEEP-DIVES
===============================================================

---------------------------------------------------------------
Module 1: Payment Degradation Watchdog
"Detect that the bleeding has started. Stop it before the merchant notices."
---------------------------------------------------------------

What it does:
- Continuously polls Razorpay's GET /v1/payments (past 15 min) and computes a
  rolling success rate per bank/method/error_code combination
- If success rate drops >15% from the 24hr baseline for any specific bank/method
  -> triggers ALERT
- Gemini-powered RCA maps error patterns to one of: BANK_INFRA_DOWN,
  CARD_ISSUER_BLOCK, UPI_RAIL_DEGRADED, GATEWAY_ROUTING_ISSUE, FRAUD_FILTER_SPIKE
- ADDED: a sixth category, FRAUD_SUSPECTED, which routes straight to human
  escalation with zero automated contact. Trigger this branch at least once in the
  live demo — showing the system refuse to auto-act is a stronger "compliant
  escalation" proof point than showing more automation.
- Automatically generates merchant-facing advisory + adjusts downstream recovery
  strategy

Root Cause Engine (Gemini prompt):
You are a payment infrastructure analyst.
Payment failure batch (last 15 minutes):
{failure_summary}
Historical baseline (24hr rolling avg):
{baseline_metrics}
Identify:
1. Root cause category (BANK_INFRA_DOWN, CARD_ISSUER_BLOCK, UPI_RAIL_DEGRADED,
   GATEWAY_ROUTING_ISSUE, FRAUD_FILTER_SPIKE, FRAUD_SUSPECTED)
2. Affected segments (which bank / payment method / amount range)
3. Confidence score (0-1)
4. Recommended merchant action
5. Expected resolution window (if infrastructure issue)
6. ADDED: auto_action_permitted (true/false) — treated as advisory only; the
   Compliance Engine, not the model, has final authority
Output as structured JSON.

Recovery Action Triggered:
- BANK_INFRA_DOWN -> switch checkout nudge to alternative methods; hold retries
  until bank recovers
- CARD_ISSUER_BLOCK -> send card update link immediately; escalate if >50
  customers affected
- UPI_RAIL_DEGRADED -> auto-switch recommendation to card/netbanking in checkout
- ADDED: FRAUD_SUSPECTED -> zero auto-action, immediate human escalation, logged
  and surfaced in the HITL queue

What's Built:
- degradation_monitor.py — Background task (APScheduler, runs every 2 min)
- rca_engine.py — LangGraph node that calls Gemini with failure batch
- merchant_advisory.py — Generates human-readable advisory pushed to dashboard +
  email
- WebSocket event: DEGRADATION_ALERT pushed to all connected dashboards in
  real-time

---------------------------------------------------------------
Module 2: Abandonment Hunter Agent
"Every uncaptured payment has a name. Find them. Bring them back."
---------------------------------------------------------------

What it does:
- Watches for Razorpay orders that reach created status but never transition to
  paid within a configurable window (default: 30 min)
- Detects TWO types of abandonment:
  Type A: Payment initiated, failed -> payment.failed webhook received
  Type B: Order created, no payment attempt -> polled via
          GET /v1/orders/{id}/payments returning empty
- Segments abandonments by: amount tier, customer history, time-of-day, repeat vs
  new customer
- Executes tiered recovery:
  Tier 1 (0-30 min): Instant WhatsApp with one-tap payment link + "Your order is
    waiting!" message
  Tier 2 (2 hrs): Personalized WhatsApp/SMS with a limited-time discount (only if
    merchant config allows)
  Tier 3 (24 hrs): Final nudge or escalation to merchant's sales team

Cart Recovery Link Creation (Razorpay API):
# Uses Razorpay Payment Links API to create a pre-filled recovery link
POST /v1/payment_links
{
  "amount": <original_order_amount>,
  "currency": "INR",
  "description": "Complete your pending order #{order_id}",
  "customer": {
    "name": "{customer_name}",
    "email": "{email}",
    "contact": "{phone}"
  },
  "notify": {"sms": true, "email": true},
  "callback_url": "https://revault.app/recovery/confirmed",
  "expire_by": <unix_timestamp_24hr>
}

Outcome Tracking:
- Each abandonment event tracked: DETECTED -> LINK_CREATED -> MESSAGE_SENT ->
  LINK_OPENED -> PAYMENT_ATTEMPTED -> RECOVERED/FAILED
- Full conversion funnel visible in dashboard

ADDED: "Recovered" must only be counted once a real payment.captured (or
test-mode equivalent) webhook is observed — never on link creation or message
delivery alone. Enforce this in code as a hard rule, not just in documentation.

---------------------------------------------------------------
Module 3: Subscription Rescue Agent
"A cancelled subscription is not a lost customer. A halted one is a recoverable
one."
---------------------------------------------------------------

What it does:
- Listens to subscription.pending and subscription.halted webhooks
- Immediately upon subscription.pending: classifies failure type BEFORE the
  native T+1 retry fires
- If classification = BANK_DOWN -> waits 2 hours, then checks if bank recovered
  -> triggers recovery WhatsApp
- If classification = INSUFFICIENT_FUNDS -> waits until predicted salary credit
  day -> sends reminder
- If classification = CARD_EXPIRED -> sends card update flow link immediately
- If classification = MANDATE_LIMIT_EXCEEDED -> sends alternative payment link
  (card/different UPI)
- For subscription.halted (all retries exhausted): activates win-back sequence

Salary Day Predictor (AI feature):
# Analyzes customer's historical transaction patterns to predict salary day
# Uses Gemini to reason about when the customer typically has funds
# Example:
- Customer pays on 1st of every month -> salary_day = 1
- Customer pays 3-5 days after 25th -> salary_day = ~25
- No pattern -> defaults to 1st and 15th of month

Win-Back Sequence (subscription.halted):
Day 0: WhatsApp "Hey {name}, your {plan} subscription was paused." — one-tap
  payment link for outstanding invoice
Day 2: Hinglish WhatsApp: "Aapka subscription band ho gaya hai..." — reminder with
  urgency (service paused messaging)
Day 5: VoiceIQ call (simulated) — personalized recovery conversation
Day 7: Human escalation flag in merchant's ReVault dashboard
Day 10: Final offer — reactivation with 1 month free if merchant approves
STOP: No further contact after Day 10

Metrics Output:
- Recovery rate by failure cause
- Average days to recovery per cause type
- MRR at risk vs MRR recovered
- Churn prevention rate (subscriptions returned to active state)

NOTE (added): This module's decision logic (cause classification, salary-day
targeting, win-back sequencing) overlaps heavily with Module 5's retry state
machine. They are kept as two documented modules here per your instruction to
keep everything intact, but at implementation time it is cleaner to run them as
one shared state machine (Module 5) with Module 3's triggers as additional cause
branches inside it, rather than two separate agents duplicating state.

---------------------------------------------------------------
Module 4: B2B Receivables Pursuit Agent
"Your invoice was sent 45 days ago. Your money is still sitting in someone else's
bank."
---------------------------------------------------------------

What it does:
- Merchant uploads or syncs outstanding invoices (CSV/manual/Razorpay payment
  link history)
- Agent calculates Days Outstanding per invoice, segments by risk tier:
  Green (0-30 days): Send polite email reminder
  Yellow (31-60 days): WhatsApp nudge + payment link + urgency message
  Orange (61-90 days): Personal WhatsApp + Hinglish voice call
  Red (90+ days): Formal notice + human escalation + stop further AI contact
- Tracks every touchpoint in PTP Tracker (Module 7)
- Creates Razorpay Payment Links for each overdue invoice on demand
- Generates aging report automatically

Invoice Intelligence (Gemini-powered):
Given this invoice history for customer {company_name}:
{invoice_history}
Last payment: {last_payment_date}
Current outstanding: ₹{amount} (Invoice #{inv_number}, due {due_date})
Customer payment behavior: {payment_pattern}
Generate:
1. Risk score (0-100)
2. Recommended recovery tone (gentle/firm/legal)
3. Most effective outreach channel for this customer
4. Personalized WhatsApp message (in Hinglish if appropriate)
5. Escalation trigger date

Collection Workflow:
Invoice -> [Age Calculator] -> [Risk Scorer (Gemini)] -> [Channel Selector]
  -> [WhatsApp / Email / Voice]
  -> [PTP Capture]
  -> [Payment Link Created]
  -> [Payment Confirmed -> Mark Closed]

---------------------------------------------------------------
Module 5: Intelligent Mandate Retry Sequencer
"Stop retrying blindly. Know WHEN to retry, HOW OFTEN, and on WHICH RAIL."
---------------------------------------------------------------

NOTE (added): Pitch this explicitly as complementary to, not competing with,
Razorpay's Revenue-Protect: Revenue-Protect improves mandate-level success; this
module adds a cause-aware retry layer with a fully logged reasoning trail on top,
plus cross-rail fallback (UPI -> card -> payment link) that a merchant can
inspect and audit end-to-end.

What it does:
- Goes beyond Razorpay's native T+1 retry — builds a dynamic retry schedule based
  on failure cause
- Maintains retry state machine per subscription in Redis
- Implements exponential backoff for infrastructure failures
- Implements salary-day targeting for funds failures
- Cross-rail retry: if UPI fails -> try auto-debit on card (if mandate exists)
  -> else create payment link

Retry Decision Matrix:
Failure Cause          Retry 1              Retry 2            Retry 3   Action if All Fail
BANK_INFRA_DOWN         +2 hrs               +6 hrs             +24 hrs   Alert merchant + link
INSUFFICIENT_FUNDS      Next salary day      +3 days            +7 days   Human escalation
UPI_LIMIT_EXCEEDED      Switch to card       Create pay link    —         Escalate
MANDATE_CANCELLED       Send re-mandate link —                  —         Win-back sequence
AUTH_FAILURE            Send OTP-auth link   Retry next day     —         Human review
TECHNICAL_ERROR         +15 min              +1 hr              +4 hrs    Mark for retry batch

Retry Scheduler (Redis-backed state machine):
class RetryState:
    payment_id: str
    cause: FailureCause
    attempt_count: int
    next_retry_at: datetime
    max_attempts: int   # Enforced stopping rule
    escalated: bool
    opted_out: bool

What Makes This Unique:
- Dynamically re-classifies on each retry attempt (maybe funds appeared!)
- Does NOT retry if: customer opted out, fraud flag set, payment already
  recovered manually, max attempts hit
- Full retry decision logged with reasoning for every step

---------------------------------------------------------------
Module 6: VoiceIQ Recovery Agent
"Not everyone reads WhatsApp. Some people need to hear a human voice."
---------------------------------------------------------------

What it does:
- Generates personalized Hinglish voice recovery scripts using Gemini
- Converts to audio using ElevenLabs (free: 10k chars/month) or gTTS (completely
  free)
- Triggers voice calls for: high-value subscriptions, B2B receivables
  (Yellow/Orange tier), PTP broken promises
- Simulates outbound call for demo; plays audio in dashboard
- Records outcome: ANSWERED, VOICEMAIL, NO_ANSWER, OPTED_OUT

Hinglish Script Generator (Gemini):
Generate a 30-second Hinglish voice recovery script for:
- Customer: {name}
- Amount: ₹{amount}
- Failure reason: {cause}
- Previous contacts: {contact_history}
- Tone: Warm, empathetic, helpful (NOT aggressive, NOT robotic)
- End with: "Aapke WhatsApp pe payment link bhej diya hai"
- Compliance: Must include opt-out option ("Agar aap callback nahi chahte...")

Rules:
- Max 60 words
- Natural Hinglish blend (not pure Hindi, not pure English)
- Personalize with customer's name
- Mention specific amount and product

Sample Output:
"Namaste {name} ji! Main ReVault se bol raha hoon. Aapka ₹2,499 ka payment is
mahine process nahi ho paya. Koi baat nahi — hum jaante hain aisi cheezein hoti
rehti hain. Maine aapke WhatsApp pe ek naya payment link bhej diya hai. Aap jab
bhi convenient ho, wahan se complete kar sakte hain. Agar koi problem ho toh
humse seedha baat kar sakte hain. Dhanyavaad!"

Voice Delivery (Demo-Ready):
- Web Audio API plays generated voice in dashboard during demo
- Shows call transcript + outcome tracking
- Escalation if no answer after 2 attempts

ADDED: Given live-demo risk with any real-time voice pipeline, pre-generate 2-3
Hinglish clips with gTTS ahead of time as a fallback, even if the live pipeline
is expected to work.

---------------------------------------------------------------
Module 7: Promise-to-Pay (PTP) Commitment Engine
"A promise is just words. Track it. Follow up. Enforce it."
---------------------------------------------------------------

NOTE (added): This remains the strongest, cleanest differentiation claim in the
whole project — no existing Razorpay product does this.

What it does:
- When a customer responds to any recovery touchpoint (WhatsApp, voice, email),
  NLP extracts payment commitment
- Parses natural language: "I'll pay on Friday" -> ptp_date = next_friday; "Will
  send this week" -> ptp_date = +5 days
- Creates PTP record with: amount, promised date, channel, confidence score
- On PTP date: auto-check if payment received via Razorpay API
- If paid -> close case, mark recovery success
- If not paid (broken promise) -> escalate immediately, mark customer risk tier
  up
- Generates PTP kept/broken rate report per merchant

PTP State Machine:
IDENTIFIED -> PROMISED -> [MONITORING] -> KEPT / BROKEN
                              |               |
                          [Close]     [Escalate + Risk Flag]

NLP Commitment Extractor (Gemini):
Customer response to payment reminder:
"{customer_message}"
Extract:
1. Is there a payment commitment? (yes/no)
2. Promised payment date (parse natural language dates)
3. Promised amount (if mentioned)
4. Confidence in commitment (high/medium/low)
5. Any dispute raised? (yes/no)
6. Escalation needed? (yes/no)
Output JSON.

PTP Analytics Dashboard Widget:
- Total PTPs created this month
- PTP kept rate: example figure 64% (industry benchmark cited as 40-60% — verify
  or soften this benchmark before presenting it as fact)
- Broken PTPs triggered: example figure 23 escalations
- Revenue recovered through PTP tracking: ₹X

===============================================================
COMPLETE TECH STACK (JUSTIFIED)
===============================================================

Backend
Tech                       Role                              Why
Python 3.12 + FastAPI      API server + webhook handler       Async-native for webhook
                                                               handling, widely used in
                                                               fintech backends
LangGraph 0.2+ (OSS)       Multi-agent orchestration          MIT-licensed, free, stateful,
                                                               declarative graph reduces
                                                               code overhead
APScheduler                Background polling + retry sched   Lightweight, no broker needed
                                                               at this scale
Redis Streams (Upstash)    Event queue + state machine        Ordered, persistent event log,
                                                               free tier sufficient
SQLAlchemy + Alembic       ORM + migrations                   Industry-standard Python DB
                                                               layer
Pydantic v2                Data validation                    Type-safe financial data
                                                               models
WebSockets (FastAPI)       Real-time dashboard feed           Push agent events to UI
                                                               without polling

AI / LLM
Tech                       Role                              Why
Google Gemini 1.5 Flash    RCA, script generation, NLP        Free tier, structured JSON
                                                               output, fast
Gemini 1.5 Pro (fallback)  Complex reasoning tasks             More capable for edge cases
gTTS / ElevenLabs          Voice synthesis                     gTTS = completely free;
                                                               ElevenLabs for premium
                                                               Hinglish within free tier

Database
Tech                       Role                              Why
PostgreSQL (Supabase free) Primary DB: events, audit, PTP      ACID guarantees matter for
                                                               financial data
TimescaleDB extension      Time-series metrics                 Free OSS extension on
                                                               Postgres, built for
                                                               payment analytics
Redis                      State machine, dedup, cache         Fast sub-ms ops

Frontend
Tech                       Role                              Why
React 18 + TypeScript      Dashboard                           Mature, widely used stack for
                                                               dashboards
Redux Toolkit + RTK Query  State + API                         Auto-caching, clean state
                                                               management
Recharts                   Analytics charts                    Lightweight, React-native
                                                               charting
TanStack Table             Batch report tables                 Best-in-class headless table
Framer Motion              Animations                          Premium feel for live
                                                               recovery feed
shadcn/ui + Radix          Component library                   Production-grade accessible
                                                               components
Socket.io-client           WebSocket connection                Real-time agent event stream

Infrastructure (All Free)
Tech                       Role                              Why
Railway.app                Backend hosting                     Free 500hrs + Postgres +
                                                               Redis, single deploy
Vercel                     Frontend hosting                     Free, CDN, instant deploys
GitHub Actions             CI/CD                                Free 2,000 min/month

External APIs (All Free Tier)
API                        Module                             Free Tier
Razorpay Test Mode         All modules                         Unlimited (test mode)
Meta WhatsApp Business     Modules 2, 3, 4, 6                   1,000 conversations/month
SendGrid                   All email                           100 emails/day free
ElevenLabs                 Module 6                            10,000 chars/month
Google AI Studio (Gemini)  All AI                               1,500 req/day

Total Cost: ₹0

NOTE (added): Drop any claim that this stack "mirrors Razorpay's exact internal
tech stack" unless you can point to a specific, current, verifiable source for
each claim (e.g. a specific engineering blog post naming FastAPI or LangGraph
internally). Judges who work there will know their own stack better than an
outside team will. Justify each tool on its own technical merits, as done above,
rather than on an unverified claim of internal parity.

===============================================================
COMPLETE REPOSITORY STRUCTURE
===============================================================

revault/
├── backend/
│   ├── main.py                       # FastAPI app, WebSocket hub
│   ├── config.py                     # Env vars, feature flags
│   │
│   ├── agents/                       # LangGraph agent nodes
│   │   ├── graph.py                  # Master LangGraph state machine
│   │   ├── degradation_watchdog.py   # Module 1
│   │   ├── abandonment_hunter.py     # Module 2
│   │   ├── subscription_rescue.py    # Module 3
│   │   ├── receivables_pursuit.py    # Module 4
│   │   ├── mandate_sequencer.py      # Module 5
│   │   ├── voice_agent.py            # Module 6
│   │   └── ptp_tracker.py            # Module 7
│   │
│   ├── tools/                        # Agent tools (function calls)
│   │   ├── razorpay_client.py        # Razorpay API wrapper (test mode)
│   │   ├── payment_links.py          # Create/track recovery links
│   │   ├── whatsapp_sender.py        # Meta WhatsApp Business API
│   │   ├── voice_synthesizer.py      # gTTS + ElevenLabs
│   │   ├── email_sender.py           # SendGrid
│   │   └── gemini_client.py          # Gemini LLM wrapper
│   │
│   ├── services/
│   │   ├── webhook_handler.py        # Razorpay webhook verification + routing
│   │   ├── compliance_engine.py      # Stopping rules, opt-out, time windows
│   │   ├── audit_logger.py           # Immutable audit trail
│   │   ├── retry_scheduler.py        # Redis-backed retry state machine
│   │   ├── salary_predictor.py       # Customer salary day analysis
│   │   └── degradation_monitor.py    # Background polling job (APScheduler)
│   │
│   ├── models/
│   │   ├── payment_event.py          # Pydantic models
│   │   ├── recovery_action.py
│   │   ├── audit_entry.py
│   │   ├── ptp_record.py
│   │   └── invoice.py
│   │
│   ├── db/
│   │   ├── database.py               # SQLAlchemy engine + session
│   │   ├── migrations/               # Alembic migration files
│   │   └── schemas.sql               # Full DB schema
│   │
│   └── routers/
│       ├── webhooks.py               # POST /webhooks/razorpay
│       ├── events.py                 # GET /events (SSE + WS)
│       ├── recovery.py               # Recovery action APIs
│       ├── invoices.py               # B2B invoice management
│       ├── analytics.py              # Metrics + batch report
│       └── config.py                 # Merchant config panel API
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CommandCenter/        # Main recovery feed
│   │   │   │   ├── LiveFeed.tsx      # Real-time event stream
│   │   │   │   ├── AgentCard.tsx     # Per-module status
│   │   │   │   └── RecoveryAlert.tsx # Urgent alert banner
│   │   │   ├── Analytics/
│   │   │   │   ├── RecoveryMetrics.tsx # Key metrics cards
│   │   │   │   ├── FunnelChart.tsx     # Abandonment funnel
│   │   │   │   ├── TimelineChart.tsx   # Recovery over time
│   │   │   │   └── HeatmapGrid.tsx     # Failure by bank/time
│   │   │   ├── AuditTrail/
│   │   │   │   ├── AuditLog.tsx      # Scrollable immutable log
│   │   │   │   └── ThoughtTrace.tsx  # Agent reasoning display
│   │   │   ├── BatchReport/
│   │   │   │   ├── BatchTable.tsx    # Simulation results
│   │   │   │   └── ExportButton.tsx  # CSV export
│   │   │   ├── Invoices/             # B2B invoice management UI
│   │   │   ├── PTPTracker/           # Promise-to-pay view
│   │   │   ├── VoicePlayer/          # Play Hinglish voice calls
│   │   │   └── HITL/                 # Human-in-the-loop approvals
│   │   ├── store/
│   │   │   ├── recoverySlice.ts
│   │   │   ├── auditSlice.ts
│   │   │   └── configSlice.ts
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts       # Real-time event subscription
│   │   │   └── useRecoveryMetrics.ts
│   │   └── App.tsx
│   └── package.json
│
├── simulation/
│   ├── generate_synthetic_data.py    # Generate realistic failure events
│   ├── batch_runner.py               # Run all agents on batch, measure results
│   ├── metrics_evaluator.py          # Compute precision, recall, recovery rate
│   └── sample_data/
│       ├── failed_payments.json      # Synthetic failed payment events
│       ├── abandoned_orders.json     # Abandoned checkout events
│       ├── halted_subscriptions.json # Halted subscription events
│       └── b2b_invoices.json         # Overdue B2B invoice records
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── COMPLIANCE.md                 # All stopping rules documented
│   ├── AGENT_PLAYBOOKS.md            # Each module's decision logic
│   ├── API_REFERENCE.md
│   └── DIFFERENTIATION.md            # ADDED: how ReVault differs from
│                                      # Razorpay's own Optimizer/Revenue-Protect
│
├── tests/
│   ├── test_degradation_monitor.py
│   ├── test_classifier.py
│   ├── test_retry_sequencer.py
│   ├── test_compliance_engine.py     # Critical — verify guardrails work
│   └── test_ptp_extractor.py
│
├── docker-compose.yml                # Local dev: Postgres + Redis + Backend
├── railway.toml                      # Railway deployment config
└── README.md

===============================================================
DATABASE SCHEMA (KEY TABLES)
===============================================================

-- Core event log (all payment events)
CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razorpay_event_id TEXT UNIQUE,
    event_type TEXT NOT NULL,        -- payment.failed, subscription.halted, order.abandoned...
    payment_id TEXT,
    order_id TEXT,
    subscription_id TEXT,
    amount INTEGER,                  -- in paise
    currency TEXT DEFAULT 'INR',
    failure_cause TEXT,               -- classified by AI
    failure_confidence FLOAT,
    raw_payload JSONB,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recovery actions (every action agent takes)
CREATE TABLE recovery_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES payment_events(id),
    module TEXT NOT NULL,             -- ABANDONMENT_HUNTER, SUBSCRIPTION_RESCUE, ...
    action_type TEXT NOT NULL,        -- WHATSAPP_SENT, PAYMENT_LINK_CREATED, VOICE_CALL, ...
    channel TEXT,
    payload JSONB,                    -- full message content, link, etc.
    agent_reasoning TEXT,             -- Gemini's reasoning stored here
    compliance_checked BOOLEAN DEFAULT TRUE,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    outcome TEXT,                     -- DELIVERED, OPENED, PAYMENT_MADE, NO_RESPONSE, FAILED
    outcome_recorded_at TIMESTAMPTZ,
    amount_recovered INTEGER          -- non-null ONLY once a real payment.captured event
                                       -- is observed (ADDED: enforce this at code level)
);

-- Retry state machine
CREATE TABLE retry_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES payment_events(id),
    attempt_number INTEGER DEFAULT 0,
    max_attempts INTEGER NOT NULL,
    next_retry_at TIMESTAMPTZ,
    retry_rail TEXT,                  -- UPI, CARD, PAYMENT_LINK
    cause TEXT,
    status TEXT DEFAULT 'SCHEDULED',  -- SCHEDULED, EXECUTING, COMPLETED, ABANDONED
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promise-to-pay records
CREATE TABLE ptp_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id TEXT,
    event_id UUID REFERENCES payment_events(id),
    promised_amount INTEGER,
    promised_date DATE,
    extraction_source TEXT,           -- WHATSAPP_REPLY, VOICE_RESPONSE, EMAIL_REPLY
    commitment_confidence TEXT,       -- HIGH, MEDIUM, LOW
    status TEXT DEFAULT 'ACTIVE',     -- ACTIVE, KEPT, BROKEN, DISPUTED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- B2B invoices
CREATE TABLE b2b_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE,
    customer_company TEXT,
    customer_contact TEXT,
    customer_phone TEXT,
    amount INTEGER,
    due_date DATE,
    days_outstanding INTEGER GENERATED ALWAYS AS
        (CURRENT_DATE - due_date) STORED,
    risk_tier TEXT,                   -- GREEN, YELLOW, ORANGE, RED
    payment_link_id TEXT,             -- Razorpay payment link ID
    status TEXT DEFAULT 'OUTSTANDING',-- OUTSTANDING, PTP, PAID, DISPUTED, ESCALATED
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable audit trail
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    module TEXT,
    action_id UUID REFERENCES recovery_actions(id),
    event_id UUID REFERENCES payment_events(id),
    actor TEXT DEFAULT 'SYSTEM',      -- SYSTEM, HUMAN_OVERRIDE
    decision_log JSONB,               -- Full agent thought process
    compliance_log JSONB              -- What rules were checked
);

-- Merchant configuration
CREATE TABLE merchant_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    max_recovery_attempts INTEGER DEFAULT 3,
    cooling_period_hours INTEGER DEFAULT 24,
    contact_start_hour INTEGER DEFAULT 9,
    contact_end_hour INTEGER DEFAULT 21,
    allow_discount_offers BOOLEAN DEFAULT FALSE,
    discount_percent FLOAT DEFAULT 5.0,
    whatsapp_enabled BOOLEAN DEFAULT TRUE,
    voice_enabled BOOLEAN DEFAULT FALSE,
    email_enabled BOOLEAN DEFAULT TRUE,
    b2b_mode BOOLEAN DEFAULT FALSE
);

===============================================================
COMPLIANCE ENGINE (NON-NEGOTIABLE GUARDRAILS)
===============================================================

class ComplianceEngine:
    """
    Every agent action passes through this engine before execution.
    If any check fails, the action is BLOCKED and reason is logged.
    """
    def check(self, action: RecoveryAction, customer: Customer) -> ComplianceResult:
        checks = [
            self._check_opted_out(customer),         # DND / opt-out list
            self._check_time_window(action),          # 9 AM - 9 PM only (TRAI)
            self._check_max_attempts(action),          # Max 3 per payment
            self._check_cooling_period(customer),       # 24hr between contacts
            self._check_fraud_flag(action.event_id),      # Fraud -> NO auto-action
            self._check_dispute_flag(action.event_id),     # Active dispute -> HOLD
            self._check_daily_limit(customer),            # Max 2 contacts/day
        ]
        for check in checks:
            if not check.passed:
                self.audit_logger.log_blocked(action, check.reason)
                return ComplianceResult(allowed=False, reason=check.reason)
        return ComplianceResult(allowed=True)

Stopping Rules (Absolute):
1. Max 3 recovery attempts per failed payment event
2. 24-hour cooling period between contacts per customer
3. No contacts between 9 PM – 9 AM (TRAI DLT compliance)
4. Fraud-flagged payments -> immediate human escalation, zero auto-action
5. Active dispute -> freeze all recovery actions
6. Customer opt-out -> permanent removal from all automated flows
7. Chargeback initiated -> compliance hold, no contact

===============================================================
SIMULATION & BATCH TESTING
===============================================================

Synthetic Dataset (Demo Batch)
# 355 total records across all failure types:
DATASET = {
    "failed_payments": 150,       # Various error codes, banks, amounts
    "abandoned_orders": 75,       # Different abandonment windows
    "halted_subscriptions": 80,   # Multiple subscription plans
    "b2b_invoices": 30,           # Different aging buckets
    "ptp_broken": 20,             # Historical broken promises
}

# Realistic Indian distribution:
PAYMENT_METHODS = {"UPI": 45%, "Card": 30%, "Netbanking": 15%, "Wallet": 10%}
FAILURE_CAUSES = {
    "INSUFFICIENT_FUNDS": 35%,
    "BANK_INFRA_DOWN": 20%,
    "CARD_EXPIRED": 12%,
    "UPI_LIMIT_EXCEEDED": 10%,
    "USER_ABANDONED": 15%,
    "AUTH_FAILURE": 5%,
    "FRAUD_BLOCKED": 3%,   # These should NEVER be auto-recovered
}
AMOUNT_DISTRIBUTION = {
    "<500": 20%,           # Low-value subscriptions
    "500-2500": 40%,       # Mid-tier SaaS / e-commerce
    "2500-10000": 30%,     # High-value transactions
    ">10000": 10%,         # B2B / enterprise
}

Batch Evaluation Metrics (template — treat as target scenario until the batch
runner has actually executed and produced real numbers; do not present pre-written
numbers as real results, added note)

┌─────────────────────────────────────────────────────┐
│ ReVault Batch Test Results                           │
│                                                       │
│ Total at-risk revenue:      ₹ 8,42,750                │
│ Total recovered:            ₹ 4,93,200  (58.5%)        │
│                                                       │
│ By Module:                                            │
│ ├── Payment Degradation     ₹ 1,12,000  (alert)         │
│ ├── Abandonment Hunter      ₹ 1,24,500  (54.2%)         │
│ ├── Subscription Rescue     ₹ 1,89,200  (67.1%)         │
│ ├── B2B Receivables         ₹   82,700  (48.3%)         │
│ ├── Mandate Sequencer       ₹   65,400  (71.2%)         │
│ └── PTP Tracker             ₹   19,400  (63.0%)         │
│                                                       │
│ Classifier Accuracy:        87.3%                     │
│ False Positive Rate:        6.2%                      │
│ Compliance Violations:      0                          │
│ Escalations (correct):      23/23                      │
└─────────────────────────────────────────────────────┘

===============================================================
FRONTEND: WHAT YOU'LL SEE (NOT JUST CHARTS)
===============================================================

Screen 1: Recovery Command Center
- Top bar: Live counter — "₹4,93,200 recovered this session"
- Left panel: 7 agent status cards (green = active, orange = processing, grey =
  idle)
- Center: Real-time event feed (WebSocket) — every agent action appears as a
  card:
  [14:32:07] ABANDONMENT HUNTER
  Detected: Order #ORD123 (₹2,499) abandoned 31 min ago
  -> Gemini classified: PAYMENT_FAILED (BANK_DOWN, conf: 0.91)
  -> Created Payment Link: plink_abc123
  -> WhatsApp sent to +91-98XXXXXXXX
  Status: DELIVERED ✓
- Right panel: Compliance status + Human-in-the-loop approval queue

Screen 2: Agent Thought Traces (The "Wow" Screen)
- Expands any recovery action to show full Gemini reasoning
- Shows: what data was analyzed -> what was considered -> what was decided -> why
- Proves the AI is not a black box

Screen 3: Batch Simulation Report
- Table of all 355 records with: input -> classified cause -> action taken ->
  outcome -> amount recovered
- Filter by module, cause, outcome
- Summary stats with charts
- Export to CSV for submission evidence

Screen 4: B2B Invoice Tracker
- Kanban view: Outstanding -> PTP Active -> Paid -> Escalated
- Click any invoice -> see full recovery timeline
- Create payment link button -> generates Razorpay link inline

Screen 5: PTP Dashboard
- Calendar view of all pending payment promises
- Color-coded: today (yellow), overdue (red), upcoming (green)
- Broken promise -> escalation triggered -> shows in HITL queue

Screen 6: Voice Replay Center
- Library of all VoiceIQ calls generated
- Play button -> hear the Hinglish audio in browser
- Show transcript + AI reasoning for tone selection

===============================================================
EXECUTION TIMELINE
===============================================================

PHASE 1: Foundation (Hours 0–6)
├── Project scaffold, env setup, Razorpay test keys
├── PostgreSQL schema + SQLAlchemy models
├── Redis connection + Upstash setup
├── FastAPI app with WebSocket hub
└── LangGraph graph skeleton (7 nodes, no logic yet)

PHASE 2: Core Agents (Hours 6–20)
├── [H6-9]   Module 1: Degradation Watchdog + RCA Engine
├── [H9-12]  Module 2: Abandonment Hunter + Payment Link creation
├── [H12-16] Module 3: Subscription Rescue + win-back sequence
├── [H16-18] Module 5: Mandate Retry Sequencer (Redis state machine)
└── [H18-20] Module 7: PTP Tracker + NLP commitment extractor

PHASE 3: Communication Layer (Hours 20–28)
├── [H20-22] WhatsApp Business API integration + message templates
├── [H22-25] Module 4: B2B Receivables Pursuit Agent
├── [H25-27] Module 6: VoiceIQ + gTTS + ElevenLabs Hinglish generation
└── [H27-28] Compliance Engine + full audit logger

PHASE 4: Frontend Dashboard (Hours 28–38)
├── [H28-31] Recovery Command Center (real-time WebSocket feed)
├── [H31-33] Agent Thought Traces screen
├── [H33-35] Batch Report + Analytics
├── [H35-37] B2B Invoices + PTP Calendar + Voice Replay
└── [H37-38] Human-in-the-Loop approval panel

PHASE 5: Simulation & Polish (Hours 38–46)
├── [H38-40] Synthetic data generator (355 records)
├── [H40-42] Batch runner + metrics evaluator
├── [H42-44] Edge cases, stopping rules testing, compliance validation
└── [H44-46] UI polish, animations, loading states

PHASE 6: Demo Prep (Hours 46–48)
├── Demo script rehearsal + edge case Q&A prep
├── Backup mode: pre-recorded video of real-time run
└── README + submission documentation

NOTE (added): This is an aggressive timeline for building all 7 modules fully in
48 hours. If the team is small, consider protecting Modules 1, 2, 5, and 7 as the
core that must work perfectly, and treating Modules 3, 4, and 6 as
time-permitting — better to have four modules working flawlessly with real API
calls than seven modules that are half-wired on demo day. This note is guidance,
not a scope cut — the full plan above is retained as written.

===============================================================
DEMO SCRIPT: 5 MINUTES THAT WIN THE HACKATHON
===============================================================

Minute 1: The Problem (Data-Driven)
ORIGINAL: "Razorpay processes ₹10 lakh crore annually. Of that, we estimate
8–12% never makes it due to payment failures, subscription halts, abandoned
carts, and overdue invoices. That's ₹80,000–1,20,000 crore leaking every year —
and nobody has built a single system that addresses all of it. Until now."

NOTE (added): Verify the "8-12% leakage" figure before using it live — if it
can't be sourced, replace with a version that names the mechanism instead of an
unverified aggregate number, and add the Revenue-Protect differentiation line
here: "Razorpay's own Revenue-Protect already improves mandate-level success.
What's missing is the layer above it — cause-aware recovery across every
channel, with a full audit trail. That's ReVault."

Minute 2: Live Degradation Demo
[Trigger batch of 50 payment failures with BANK_INFRA_DOWN cause]
- "Watch the Degradation Watchdog fire. It detected a 34% drop in SBI UPI
  success rate. Gemini classified it as BANK_INFRA_DOWN with 94% confidence.
  It's already switched the checkout nudge to HDFC cards for affected merchants
  — and held all pending retries until the bank recovers."
- ADDED: also trigger one FRAUD_SUSPECTED case and show the system refuse to
  auto-act, escalating to a human instead — this is a strong "compliant
  escalation" moment for judges.

Minute 3: Subscription Rescue + VoiceIQ
[Trigger 3 subscription halted events — different causes]
- "Three subscriptions halted. Different causes, different strategies. One gets
  a salary-day retry. One gets a card update link. One gets a Hinglish voice
  call — let's hear it:" [Play VoiceIQ audio]
  "Namaste Priya ji! Aapka ₹999 ka Netflix plan band ho gaya hai..."

Minute 4: B2B Receivables + PTP
[Show invoice dashboard — 5 overdue invoices, one marked BROKEN_PROMISE]
- "This invoice from TechCorp is 67 days overdue. The AI scored it Orange —
  sent personalized WhatsApp, got a promise to pay Friday. Friday came. No
  payment. Immediately escalated. Human approval queue. Not chased further
  without review."

Minute 5: The Numbers
[Show batch report]
- "355 records. ₹8.4 lakh at risk. ₹4.9 lakh recovered — 58.5% overall recovery
  rate. Zero compliance violations. Every single fraud-flagged payment
  escalated correctly. That's ReVault." (Replace with real numbers once the
  batch runner has actually executed, added note.)

===============================================================
WHY THIS ABSOLUTELY WINS
===============================================================

Judging Criterion                  How ReVault Maxes It
Detects revenue at risk            Real-time via webhooks + polling, across 5
                                    distinct revenue leak types
Determines right intervention      7 specialized AI agents, each with
                                    Gemini-powered root cause classification
Executes bounded recovery          Real Razorpay API calls: payment links,
                                    subscription retries, webhook handlers
Measured money recovered           Batch report: per-module ₹ recovered,
                                    recovery rate, classifier accuracy
Compliant escalation               Full compliance engine: 7 stopping rules,
                                    opt-out, fraud flag, HITL
Stopping rules                     Enforced at code level in ComplianceEngine,
                                    not just documented
Audit trail                        Immutable DB log: every agent decision,
                                    reasoning, compliance check
Not just identifying               Every module EXECUTES: links created,
                                    messages sent, calls placed, retries
                                    scheduled
AI meaningfully used               LLM powers RCA, script generation, NLP PTP
                                    extraction, strategy selection — always
                                    behind a deterministic compliance gate,
                                    never given unilateral authority over money
                                    movement (added clarification)
End-to-end                         Razorpay webhook -> Agent -> Action ->
                                    Outcome -> Dashboard: fully connected

===============================================================
"BUT CAN YOU REALLY BUILD ALL THIS IN 48 HOURS?"
===============================================================

Yes — here's why:
1. Most agent logic is prompt engineering + API calls — not complex algorithms
2. LangGraph makes multi-agent orchestration declarative — low code overhead
3. FastAPI + SQLAlchemy = 30-min to working CRUD
4. shadcn/ui + Recharts = premium dashboard in hours, not days
5. Razorpay test mode = no real bank integration complexity
6. Simulation data = pre-generated, not needing real user data
7. WhatsApp API = template messages, approved in advance

Priority stack if time runs short:
- Core: Modules 1, 2, 3, 5 (payment degradation + abandonment + subscriptions +
  retry) — the meat
- Secondary: Module 6 (voice) + Module 7 (PTP) — impressive extras
- Drop last if needed: Module 4 (B2B) — add to slides as "roadmap" if not
  implemented

Built with: Python 3.12 · FastAPI · LangGraph · Google Gemini 1.5 · React 18 ·
TypeScript · Redux Toolkit · PostgreSQL · TimescaleDB · Redis Streams · Razorpay
Test APIs · WhatsApp Business Cloud API · ElevenLabs · gTTS · Railway.app ·
Vercel

Total infrastructure cost: ₹0

===============================================================
APPENDIX: ALTERNATIVE / FUTURE SCALE-OUT IMPLEMENTATION PLAN
(originally a separate, competing plan — kept in full, relabeled as an appendix
showing a scale-out path rather than the primary build)
===============================================================

ReVault will be implemented as an event-driven, microservices-based AI revenue
recovery system. This alternative version connects Razorpay test-mode events to
a Go-based ingestion and orchestration layer, a Python/FastAPI AI decision
engine, PostgreSQL for transactional state, Kafka or Redis Pub/Sub for
asynchronous processing, and a React dashboard for real-time recovery and audit
visibility.

1. System Architecture
Razorpay Test Mode -> Webhook Gateway -> Go Event Ingestion Service
Go Event Ingestion Service -> Kafka / Redis Pub/Sub
Event Consumer -> PostgreSQL
Event Consumer -> Python FastAPI AI / Root Cause Engine
AI Decision Engine -> Intervention Router
Intervention Router -> Voice AI / WhatsApp Payment Link / Email Workflow
Recovery Event -> Razorpay Payment Status -> PostgreSQL
All state transitions and API actions -> Immutable Audit Trail
PostgreSQL + Audit Data -> React.js Dashboard

2. Phase 1 — Razorpay Event Ingestion
The first implementation layer will simulate real payment and invoice events
using Razorpay test mode.
- Configure Razorpay test-mode webhooks.
- Listen for payment.failed, invoice.expired, and subscription.halted.
- Validate webhook signatures before processing events.
- Assign every event a unique event ID for idempotent processing.
- Capture customer, merchant, invoice, payment, subscription, amount,
  timestamp, and failure information available in the payload.
- Do not perform AI processing directly inside the webhook request. The
  webhook should acknowledge quickly and publish the event asynchronously.

3. Phase 2 — Go Ingestion and Event Orchestration
Go will act as the high-throughput backend responsible for receiving events and
coordinating downstream processing.
- Build a Go HTTP service for Razorpay webhook ingestion.
- Validate authentication/signatures and request structure.
- Normalize different Razorpay event formats into a common internal event
  schema.
- Publish normalized events to Kafka using the Upstash free tier, or Redis
  Pub/Sub if Kafka is impractical during development.
- Implement retry handling for temporary downstream failures.
- Use idempotency keys to prevent duplicate recovery actions.
- Maintain explicit state transitions such as DETECTED, DIAGNOSED,
  ACTION_SELECTED, CALLED_USER, LINK_SENT, PROMISE_RECEIVED, PAUSED, RECOVERED,
  and ESCALATED.

4. Phase 3 — Root Cause AI / Diagnoser
The Python FastAPI service will expose the AI decision engine to the Go
orchestration layer.
- Receive the normalized payment or invoice event from the Go service.
- Analyze failure codes and event metadata.
- Differentiate failure categories such as GATEWAY_ERROR and
  BAD_REQUEST_INSUFFICIENT_FUNDS.
- Classify the revenue-risk scenario and determine whether automated recovery
  is permitted.
- Return a structured decision instead of free-form text.
- Use LangChain to structure the AI workflow and Groq API with Llama-3 for fast
  inference.
- Keep deterministic safety checks around the LLM so the model cannot directly
  execute an unrestricted money movement action.

5. Phase 4 — Intervention Router
The Intervention Router selects the next-best bounded action based on the
diagnosed failure and recovery policy.

Path A — Hinglish Voice Recovery
- Trigger when a high-value B2C subscription/payment fails because of
  insufficient funds.
- Pass only the required customer and payment context to the voice workflow.
- Use Twilio, Sarvam AI, or OpenAI Realtime depending on the available free
  credits and integration feasibility.
- The voice agent explains the failed payment in Hinglish.
- Ask whether the customer wants a new UPI/payment link sent through WhatsApp.
- If the customer agrees, generate a Razorpay Payment Link through the test
  API.
- Send the payment link through the WhatsApp API.
- Move the state to LINK_SENT.
- Listen for the successful payment event.
- When the payment succeeds, mark the recovery as RECOVERED and update the
  recovered-money metric.
- If the call fails, the customer declines, or the action cannot be completed,
  fall back to the standard reminder workflow.

Path B — Promise-to-Pay Tracker
- Trigger for overdue B2B invoices.
- Send an automated payment reminder email.
- Receive and process the customer's email reply.
- Use the LLM to extract the intent from unstructured email text.
- Detect Promise to Pay intent.
- Extract the temporal commitment, such as next Thursday or next Friday.
- Normalize the commitment into an actionable date.
- Update the internal PostgreSQL ledger with the promise date.
- Change the invoice state to PROMISED / PAUSED.
- Stop further automated chasing until the promised date.
- On or after the promised date, check whether payment has been received.
- If payment is received, mark the invoice RECOVERED.
- If payment is not received, resume the configured recovery workflow or
  escalate according to the stopping rules.

6. Phase 5 — Payment Recovery and Verification
Every payment action must be verified against the Razorpay test-mode payment
status.
- Do not treat a generated payment link or customer acknowledgement as
  recovered revenue.
- Recovered revenue is counted only after a successful payment event is
  observed.
- Associate every successful recovery with the original failed payment/invoice
  and recovery action.
- Calculate total recovered amount across the complete test batch.
- Track recovery rate, number of interventions, successful interventions,
  failed interventions, and escalations.

7. Phase 6 — Audit Trail
The audit trail is a core component rather than an optional logging layer.
- Record the initial event.
- Record the diagnosed failure reason.
- Record the AI decision and selected intervention.
- Record every external API call.
- Record payment-link generation and delivery.
- Record voice-call status.
- Record customer consent/response where applicable.
- Record Promise-to-Pay extraction and committed date.
- Record stopping and resumption decisions.
- Record successful or failed recovery.
- Record fallback and escalation.
- Each record should contain event ID, entity ID, timestamp, previous state,
  new state, action, actor/service, and result.

8. Phase 7 — Database Design
PostgreSQL will hold the transactional state because the system tracks
financial events, invoices, payment attempts, promises, and recovery outcomes.
- customers — customer identity and communication information.
- payments — payment attempts, amounts, status, failure codes, and timestamps.
- subscriptions — recurring-payment/subscription state.
- invoices — B2B invoice state, due dates, amounts, and payment status.
- recovery_cases — one recovery case per revenue-leakage event.
- interventions — individual recovery actions and their outcomes.
- promises_to_pay — extracted commitment, promised date, source email, and
  status.
- audit_events — append-only state-transition and API-action history.
- recovery_metrics — aggregated recovered amount and batch-level metrics.

9. Phase 8 — AI Safety, Compliance, and Stopping Rules
The LLM should recommend or classify an action, while deterministic business
rules control whether the action is allowed.
- Do not allow the AI to independently choose arbitrary payment amounts or
  modify financial records without validation.
- Require a valid invoice/payment/subscription association before recovery
  actions.
- Do not send repeated reminders after a valid Promise-to-Pay commitment.
- Respect the promised date as a stopping boundary.
- Limit the number of automated recovery attempts.
- Escalate when automated recovery reaches the configured attempt limit or
  confidence threshold.
- If AI parsing fails or produces an invalid date/intent, fall back to a
  standard reminder rather than making an unsafe state change.
- Log every safety decision in the audit trail.

10. Phase 9 — Graceful Failure
- If the AI service is unavailable, use deterministic failure-code mapping and
  the standard reminder workflow.
- If the voice service fails or the call drops, fall back to email/SMS or the
  standard Razorpay reminder.
- If WhatsApp delivery fails, record the failure and use the configured
  fallback channel.
- If Kafka/Redis is temporarily unavailable, retry event publication without
  duplicating the event.
- If a downstream API times out, retry within a bounded limit.
- Never mark a payment as recovered solely because an API call succeeded;
  verify the actual payment status.
- Every failure path must remain visible in the audit trail.

11. Phase 10 — React Dashboard
The frontend will provide a visually clear operational dashboard using React.js
and Vanilla CSS.
- Money Recovered — total amount successfully recovered across the batch.
- At-Risk Revenue — total amount currently associated with unresolved recovery
  cases.
- Recovery Rate — percentage of eligible revenue recovered.
- Active Recovery Cases — current unresolved cases.
- Promise-to-Pay Cases — invoices currently paused because of customer
  commitments.
- Intervention Success — successful versus failed recovery actions.
- Recovery Timeline — event-by-event progression of a case.
- Audit Trail — complete state transitions and API actions.
- Failure Distribution — root causes such as insufficient funds and gateway
  errors.
- Escalations — cases that could not be resolved automatically.

12. Phase 11 — Demo Dataset and Batch Evaluation
The project should be demonstrated on a controlled batch rather than a single
happy-path transaction.
- Create multiple failed-payment scenarios.
- Include insufficient-funds failures.
- Include gateway/network failures.
- Include expired invoices.
- Include subscription-halted scenarios.
- Include B2B email responses containing different Promise-to-Pay phrasings.
- Include successful recovery cases.
- Include failed-call and failed-delivery cases.
- Include ambiguous or malformed AI inputs to demonstrate graceful failure.
- Measure recovered money across the complete batch.

13. Phase 12 — Testing Strategy
- Unit tests for failure classification.
- Unit tests for Promise-to-Pay intent and date extraction.
- Unit tests for stopping-rule evaluation.
- Unit tests for state-transition validation.
- API tests for the Go webhook service.
- API tests for the FastAPI AI service.
- Integration tests for Go -> broker -> FastAPI -> PostgreSQL.
- Integration tests for Razorpay test-mode payment recovery.
- Failure tests for duplicate webhooks and retry scenarios.
- End-to-end tests covering DETECTED -> DIAGNOSED -> ACTION_SELECTED ->
  INTERVENTION -> RECOVERED.
- Batch-level evaluation of recovered amount and recovery rate.

14. Phase 13 — Deployment
- Deploy the Go backend as the primary API/orchestration service.
- Deploy the FastAPI service separately as the AI/agent service.
- Run PostgreSQL as the transactional database.
- Use Upstash Kafka or Redis Pub/Sub for asynchronous events.
- Deploy the React frontend separately.
- Store API keys and webhook secrets as environment variables/secrets.
- Use Docker for reproducible local and deployment environments.
- Configure health checks for Go, FastAPI, PostgreSQL, and the message broker.
- Maintain structured logs for debugging and audit visibility.

15. End-to-End Demo Flow
- Create a Razorpay test-mode payment/subscription.
- Trigger a payment failure such as BAD_REQUEST_INSUFFICIENT_FUNDS.
- Razorpay sends payment.failed to the Go webhook service.
- Go validates and publishes the event.
- The event is persisted and consumed asynchronously.
- FastAPI diagnoses the failure.
- The Intervention Router selects Hinglish Voice Recovery.
- The voice agent contacts the customer and asks for permission to send a
  payment link.
- The customer agrees.
- A Razorpay Payment Link is generated and sent.
- A successful test payment is made.
- The recovery event is detected.
- The case changes to RECOVERED.
- The recovered amount increases on the dashboard.
- The audit trail shows every step from DETECTED to RECOVERED.

16. Promise-to-Pay Demo Flow
- Create an overdue B2B invoice in the test dataset.
- ReVault sends an automated reminder.
- The simulated customer replies: "We will release the payment next Thursday."
- The email processor sends the response to the FastAPI NLP engine.
- The LLM extracts Promise to Pay intent and the temporal commitment.
- The date is normalized and validated.
- PostgreSQL is updated with the commitment.
- The invoice enters a paused state.
- Further automated chasing stops until the promised date.
- The dashboard displays the Promise-to-Pay state.
- When the payment is received, the invoice becomes RECOVERED.
- If payment is not received after the commitment date, the recovery workflow
  resumes or escalates according to the stopping rules.

17. Final Success Criteria
- Events are ingested reliably and processed asynchronously.
- Root causes are diagnosed using structured AI output.
- Recovery actions are bounded by deterministic business rules.
- The system demonstrates at least the Hinglish Voice Recovery and
  Promise-to-Pay Tracker paths.
- Successful payment, not merely intervention, determines recovered money.
- The system shows measured money recovered across a batch.
- Promise-to-Pay commitments stop automated chasing until the committed date.
- Every important decision and state transition is auditable.
- AI/API failures have deterministic fallback paths.
- The dashboard clearly communicates recovery performance and audit history.
- The complete workflow can be demonstrated using Razorpay test-mode events and
  controlled test data.

===============================================================
END OF DOCUMENT
===============================================================