# ReVault — AI Revenue Recovery Operating System

> *"Don't just find the leak. Stop it. Measure it. Win it back."*

Built for **Razorpay Buildathon 2026 · Track 3: AI Revenue Recovery**

---

## What is ReVault?

ReVault is an autonomous, multi-agent revenue recovery platform built on top of the Razorpay ecosystem. It goes well beyond dashboards and alerts — it actively detects where money is leaking, figures out *why*, and then executes a recovery strategy end-to-end.

Every rupee tracked. Every decision explained. Every action auditable.

It handles seven distinct revenue leakage scenarios, each covered by a dedicated AI agent:

| Module | Agent | What it tackles |
|--------|-------|-----------------|
| 1 | **Degradation Watchdog** | Real-time payment failure spike detection + root cause classification |
| 2 | **Abandonment Hunter** | Orders created but never paid — auto-recovery via payment links |
| 3 | **Subscription Rescue** | Halted subscriptions diagnosed and won back before churn |
| 4 | **B2B Receivables Pursuit** | Overdue invoice chasing with smart escalation tiers |
| 5 | **Mandate Retry Sequencer** | Cause-aware retry scheduling across UPI, card, and payment links |
| 6 | **VoiceIQ Recovery Agent** | Personalized Hinglish voice calls for high-value recoveries |
| 7 | **PTP Commitment Engine** | Tracks "I'll pay on Friday" promises — and follows up when they break |

---

## Why it exists

Indian payments infrastructure is resilient, but failures still happen at scale — UPI rails go down, mandates hit limits, customers abandon carts mid-flow, and B2B invoices age into write-offs. Razorpay's own tooling handles a lot, but there are gaps:

- **Standard-checkout merchants** have no visibility into abandoned orders (Magic Checkout only)
- **Subscription retries** are largely fixed-schedule — no cause-aware timing
- **B2B invoice follow-up** is still spreadsheets and manual WhatsApps at most Indian SMEs
- **Promise-to-Pay tracking** doesn't exist anywhere in the Razorpay product suite today

ReVault addresses all of these in one system, with full audit trails on every decision.

---

## How it works

```
Razorpay Webhooks / Polling / Manual Upload
           │
    Redis Streams (dedup, priority queue, rate limiting)
           │
    LangGraph Agent Orchestrator
    ├── Module 1: Degradation Watchdog
    ├── Module 2: Abandonment Hunter
    ├── Module 3: Subscription Rescue
    ├── Module 4: B2B Receivables
    ├── Module 5: Mandate Sequencer
    ├── Module 6: VoiceIQ Agent
    └── Module 7: PTP Tracker
           │
    Action Execution Layer
    (Razorpay APIs · WhatsApp Business · ElevenLabs/gTTS · SendGrid)
           │
    PostgreSQL + TimescaleDB (audit trail, events, PTP records)
           │
    React Dashboard (real-time WebSocket feed · HITL approvals · batch reports)
```

Every agent action passes through a **Compliance Engine** before it fires. Hard stops: max 3 attempts per failed payment, 24-hour cooling period, no contacts between 9 PM and 9 AM (TRAI DLT), immediate human escalation for anything fraud-flagged.

---

## Key features

**Cause-aware recovery, not blind retries**
The system classifies each failure (bank down, insufficient funds, card expired, mandate limit, fraud) and picks a strategy specific to that cause — including timing retries to predicted salary credit days for funds failures.

**Promise-to-Pay tracking**
When a customer says "I'll pay this Friday" over WhatsApp or a voice call, the NLP engine parses it, logs the commitment, and checks on Friday. If the payment didn't come, it escalates immediately and re-tiers the customer's risk score. No other Razorpay-native product does this.

**Hinglish voice recovery (Module 6)**
For high-value recoveries, the system generates a personalized Hinglish voice script via Gemini, converts it to audio (gTTS / ElevenLabs), and plays it in the dashboard during demo — or triggers a simulated outbound call.

**Human-in-the-Loop at the right moments**
Fraud-flagged cases never get auto-acted on. Broken PTP promises, high-value B2B invoices past 90 days, and compliance edge cases all surface in the HITL approval queue. The system knows when not to act.

**Immutable audit trail**
Every agent decision — including Gemini's full reasoning — is stored alongside the action. Judges can click any recovery event and see exactly what data was analyzed, what was considered, and why a specific action was chosen.

---

## Tech stack

**Backend:** Python 3.12 · FastAPI · LangGraph · APScheduler · Redis Streams · SQLAlchemy · Pydantic v2 · WebSockets

**AI / LLM:** Google Gemini 1.5 Flash (primary) · Gemini 1.5 Pro (fallback) · gTTS · ElevenLabs

**Database:** PostgreSQL (Supabase free tier) · TimescaleDB extension · Redis (Upstash)

**Frontend:** React 18 + TypeScript · Redux Toolkit · Recharts · TanStack Table · Framer Motion · shadcn/ui + Radix · Socket.io-client

**Infrastructure:** Railway.app (backend + DB) · Vercel (frontend) · GitHub Actions (CI/CD)

**External APIs:** Razorpay Test Mode · Meta WhatsApp Business (1,000 free conversations/month) · SendGrid (100 emails/day free) · Google AI Studio (1,500 req/day free)

**Total running cost: ₹0**

---

## Project structure

```
revault/
├── backend/
│   ├── main.py                       # FastAPI app, WebSocket hub
│   ├── config.py                     # Env vars, feature flags
│   ├── agents/                       # LangGraph agent nodes
│   │   ├── graph.py                  # Master state machine
│   │   ├── degradation_watchdog.py   # Module 1
│   │   ├── abandonment_hunter.py     # Module 2
│   │   ├── subscription_rescue.py    # Module 3
│   │   ├── receivables_pursuit.py    # Module 4
│   │   ├── mandate_sequencer.py      # Module 5
│   │   ├── voice_agent.py            # Module 6
│   │   └── ptp_tracker.py            # Module 7
│   ├── tools/                        # Agent tools
│   │   ├── razorpay_client.py
│   │   ├── payment_links.py
│   │   ├── whatsapp_sender.py
│   │   ├── voice_synthesizer.py
│   │   ├── email_sender.py
│   │   └── gemini_client.py
│   ├── services/
│   │   ├── webhook_handler.py
│   │   ├── compliance_engine.py
│   │   ├── audit_logger.py
│   │   ├── retry_scheduler.py
│   │   ├── salary_predictor.py
│   │   └── degradation_monitor.py
│   ├── models/                       # Pydantic models
│   ├── db/                           # SQLAlchemy + Alembic
│   └── routers/                      # FastAPI route handlers
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── CommandCenter/        # Live recovery feed
│       │   ├── Analytics/            # Charts and metrics
│       │   ├── AuditTrail/           # Agent thought traces
│       │   ├── BatchReport/          # Simulation results + CSV export
│       │   ├── Invoices/             # B2B invoice management
│       │   ├── PTPTracker/           # Promise-to-pay calendar
│       │   ├── VoicePlayer/          # Hinglish audio playback
│       │   └── HITL/                 # Human-in-the-loop approvals
│       └── store/                    # Redux slices
├── simulation/
│   ├── generate_synthetic_data.py    # 355 realistic failure events
│   ├── batch_runner.py               # Run all agents on batch
│   └── metrics_evaluator.py          # Recovery rate + accuracy stats
├── docs/
│   ├── ARCHITECTURE.md
│   ├── COMPLIANCE.md
│   ├── AGENT_PLAYBOOKS.md
│   ├── API_REFERENCE.md
│   └── DIFFERENTIATION.md
├── tests/
├── docker-compose.yml
└── railway.toml
```

---

## Getting started

### Prerequisites

- Python 3.12+
- Node.js 18+
- Docker (for local Postgres + Redis)
- Razorpay test API keys
- Google AI Studio API key (Gemini)

### Local setup

```bash
# Clone the repo
git clone https://github.com/apurb2509/ReVault.git
cd ReVault

# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux
pip install -r requirements.txt

# Copy and fill in your environment variables
cp .env.example .env

# Start local services (Postgres + Redis)
docker-compose up -d

# Run database migrations
alembic upgrade head

# Start the backend
uvicorn main:app --reload

# Frontend (separate terminal)
cd ../frontend
npm install
npm run dev
```

The dashboard will be at `http://localhost:5173`. The API runs at `http://localhost:8000`.

### Environment variables

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
GEMINI_API_KEY=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
SENDGRID_API_KEY=
ELEVENLABS_API_KEY=
DATABASE_URL=
REDIS_URL=
```

---

## Running the batch simulation

The simulation suite generates 355 synthetic failure events (failed payments, abandoned orders, halted subscriptions, overdue B2B invoices, broken PTP promises) and runs all agents on them.

```bash
cd simulation
python generate_synthetic_data.py
python batch_runner.py
python metrics_evaluator.py
```

Results are written to `simulation/results/` and exported as a CSV that can be dropped directly into the submission.

---

## Compliance

Every recovery action goes through the Compliance Engine before it executes. The hard stops are non-negotiable:

- Max **3 recovery attempts** per failed payment event
- **24-hour cooling period** between contacts for the same customer
- **No contacts between 9 PM and 9 AM** (TRAI DLT compliance)
- Fraud-flagged payments → **immediate human escalation, zero auto-action**
- Active dispute → **freeze all recovery actions**
- Customer opt-out → **permanent removal** from all automated flows
- Chargeback initiated → **compliance hold**, no further contact

All blocked actions are still logged — the audit trail is complete regardless of whether an action fires or not.

---

## How ReVault differs from Razorpay Revenue-Protect

Razorpay's "UPI Autopay Intelligent Revenue-Protect" improves mandate-level success and recovers failed debits — it's a good product. ReVault adds a different layer on top:

- **Cross-channel, cause-aware recovery** (not just mandate success)
- **Hinglish voice recovery** for high-value segments
- **Promise-to-Pay tracking** — no equivalent in the Razorpay product suite
- **B2B receivables chasing** from invoice to payment link to reconciliation
- **Full agent reasoning trail** attached to every decision, inspectable by the merchant

These are complementary, not competing.

---

## License

MIT

---

*Built with [LangGraph](https://github.com/langchain-ai/langgraph), [Razorpay APIs](https://razorpay.com/docs/), and [Google Gemini](https://ai.google.dev/) — all within free-tier constraints.*
