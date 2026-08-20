# ReVault — AI Revenue Recovery Operating System

> **"Don't just find the leak. Stop it. Measure it. Win it back."**

ReVault is an autonomous, multi-agent revenue recovery platform built for Razorpay merchants. It doesn't just alert you when payments fail — it detects the failure, diagnoses the root cause using AI, executes a compliant recovery action, and tracks whether real money was actually recovered. Every decision is logged. Every action is auditable. Every rupee matters.

Built for the **Razorpay Buildathon 2026 — Track 3: AI Revenue Recovery**.

---

## What Problem Does This Solve?

Razorpay processes 500M+ transactions a month. A significant portion of that revenue never makes it through — failed payments, abandoned checkouts, halted subscriptions, overdue B2B invoices, and broken payment promises quietly drain merchant revenue every day.

The existing tools either tell you *something failed* (but not why), or retry blindly on a fixed schedule (without adapting to the root cause). Nobody has built a single system that addresses all these failure modes intelligently, in one place, with a full audit trail.

**ReVault does.**

---

## The Seven Modules

| Module | What It Does |
|---|---|
| **1. Payment Degradation Watchdog** | Detects real-time payment success rate drops per bank/method, runs AI root-cause analysis, pushes merchant advisories |
| **2. Abandonment Hunter Agent** | Finds orders that were created but never paid, runs a tiered WhatsApp/SMS recovery sequence |
| **3. Subscription Rescue Agent** | Classifies subscription failures before the native T+1 retry fires, picks the right recovery strategy per cause |
| **4. B2B Receivables Pursuit Agent** | Ages outstanding invoices, scores risk, and runs a multi-touch recovery sequence (email → WhatsApp → voice → escalation) |
| **5. Intelligent Mandate Retry Sequencer** | Goes beyond fixed-schedule retries — dynamically re-classifies failure cause on every retry and switches rails (UPI → card → payment link) |
| **6. VoiceIQ Recovery Agent** | Generates personalized Hinglish voice scripts via Gemini and gTTS, plays them in the dashboard, tracks call outcomes |
| **7. Promise-to-Pay Commitment Engine** | Extracts payment commitments from customer replies ("I'll pay Friday"), monitors the promise, and escalates immediately on a broken promise |

---

## Architecture

```
INGESTION LAYER
  Razorpay Webhooks  →  Polling Scheduler  →  Manual Batch Upload
          │
EVENT PROCESSING  (Apache Kafka)
  Dedup  →  Priority Queue  →  Rate Limiter  →  Compliance Filter
          │
LANGGRAPH AGENT ORCHESTRATOR  (Python / FastAPI)
  Module 1: Degradation Watchdog     Module 2: Abandonment Hunter
  Module 3: Subscription Rescue      Module 4: B2B Receivables
  Module 5: Mandate Retry            Module 6: VoiceIQ Agent
  Module 7: PTP Tracker
  Shared: Gemini 1.5 Flash  │  Compliance Engine  │  Audit Logger
          │
ACTION EXECUTION LAYER
  Razorpay Payment Links API  │  WhatsApp Business API  │  gTTS Voice
  Razorpay Subscriptions API  │  SendGrid Email
          │
PERSISTENCE & ANALYTICS
  PostgreSQL (audit trail, events, PTP records)
  Redis (retry state machine, dedup, cache)
          │
OPERATOR CONTROL PLANE  (React 18 + TypeScript)
  Real-time WebSocket Feed  │  HITL Approval Queue  │  Batch Report
  Agent Thought Traces  │  Voice Replay Center  │  Config Panel
```

The ingestion layer is a **Go** service — high-throughput, signature-validated, idempotent. It publishes normalized events to **Kafka**. The Python **FastAPI** service runs the LangGraph agent graph. All agent actions pass through a deterministic **Compliance Engine** before execution — the LLM recommends, the rules decide.

---

## Tech Stack

### Backend
| Technology | Role |
|---|---|
| Python 3.12 + FastAPI | API server, webhook handler, AI/agent service |
| Go (Golang) | High-throughput event ingestion service |
| LangGraph 0.2+ | Multi-agent orchestration |
| Node.js | WhatsApp & notification workers |
| Apache Kafka (Upstash free tier) | Primary event bus |
| Redis (Upstash free tier) | Retry state machine, dedup, rate limiting |
| PostgreSQL (Supabase free tier) | Transactional DB, audit trail |
| APScheduler | Background polling jobs |

### AI / LLM
| Technology | Role |
|---|---|
| Google Gemini 1.5 Flash | Root cause analysis, script generation, NLP PTP extraction |
| Gemini 1.5 Pro | Complex reasoning fallback |
| gTTS | Free voice synthesis |
| ElevenLabs (free tier) | Higher-quality Hinglish voice (10k chars/month) |

### Frontend
| Technology | Role |
|---|---|
| React 18 + TypeScript | Operator dashboard |
| Redux Toolkit + RTK Query | State management + API layer |
| Recharts | Analytics and recovery charts |
| TanStack Table | Batch report tables |
| Sass | Styling |
| Socket.io-client | Real-time WebSocket event feed |

### Infrastructure
| Technology | Role |
|---|---|
| Docker + Docker Compose | Local dev environment |
| GitHub Actions | CI/CD |
| Render.com (free) | Backend hosting |
| Vercel (free) | Frontend hosting |
| Supabase (free) | Managed PostgreSQL |
| Upstash (free) | Managed Kafka + Redis |

**Total infrastructure cost: ₹0** — every tool runs on a genuinely free, no-card-required tier.

---

## Repository Structure

```
revault/
├── backend/
│   ├── main.py                       # FastAPI app entry point, WebSocket hub
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
│   ├── tools/                        # Agent tools (Razorpay, WhatsApp, voice, email)
│   │   ├── razorpay_client.py
│   │   ├── payment_links.py
│   │   ├── whatsapp_sender.py
│   │   ├── voice_synthesizer.py
│   │   ├── email_sender.py
│   │   └── gemini_client.py
│   │
│   ├── services/
│   │   ├── webhook_handler.py        # Razorpay webhook verification + routing
│   │   ├── compliance_engine.py      # Stopping rules, opt-out, time windows
│   │   ├── audit_logger.py           # Immutable audit trail writer
│   │   ├── retry_scheduler.py        # Redis-backed retry state machine
│   │   ├── salary_predictor.py       # Salary day analysis for funds failures
│   │   └── degradation_monitor.py    # APScheduler background polling job
│   │
│   ├── models/                       # Pydantic models
│   ├── db/                           # SQLAlchemy engine, Alembic migrations, schema
│   ├── routers/                      # FastAPI route handlers
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/               # React components per dashboard screen
│   │   ├── pages/                    # Route-level pages
│   │   ├── store/                    # Redux slices
│   │   ├── hooks/                    # useWebSocket, useRecoveryMetrics
│   │   └── App.tsx
│   └── package.json
│
├── docker-compose.yml                # Postgres + Redis + Kafka + all services
└── README.md
```

---

## Dashboard Screens

**Recovery Command Center** — Live WebSocket feed of every agent action. Running total of recovered revenue. 7 agent status cards. HITL approval queue.

**Agent Thought Traces** — Expand any recovery event to see the full Gemini reasoning chain: what data was analyzed, what was considered, what was decided, and why. The AI is never a black box.

**Batch Simulation Report** — Table of all test records with input → classified cause → action taken → outcome → amount recovered. Filter by module or cause. Export to CSV.

**B2B Invoice Tracker** — Kanban board: Outstanding → PTP Active → Paid → Escalated. Click any invoice to see the full recovery timeline.

**PTP Dashboard** — Calendar view of all pending payment promises. Color-coded by urgency. Broken promises surface in the HITL queue instantly.

**Voice Replay Center** — Library of all VoiceIQ calls. Hit play to hear the Hinglish audio in the browser. Shows the AI reasoning for tone and script selection.

---

## Compliance Engine

Every agent action passes through a deterministic compliance gate before execution. The LLM recommends — the rules decide. No automated action bypasses this.

**Hard stopping rules (non-negotiable):**
1. Max 3 recovery attempts per failed payment event
2. 24-hour cooling period between contacts per customer
3. No contacts between 9 PM – 9 AM (TRAI DLT compliance)
4. Fraud-flagged payments → immediate human escalation, zero auto-action
5. Active dispute → freeze all recovery actions
6. Customer opt-out → permanent removal from all automated flows
7. Chargeback initiated → compliance hold, no contact

"Recovered" is only counted after a real `payment.captured` webhook is observed — never on link creation or message delivery alone. This is enforced at code level.

---

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Python 3.12+
- Node.js 20+
- Go 1.22+
- A Razorpay test-mode account (free, no card)
- A Supabase project (free)
- Upstash account for Kafka + Redis (free)
- Google AI Studio API key for Gemini (free, 1500 req/day)

### Local Setup

**1. Clone and configure environment**
```bash
git clone https://github.com/your-username/revault.git
cd revault
# Create backend/.env and fill in your API keys

```

**2. Start infrastructure with Docker Compose**
```bash
docker-compose up -d
```
This starts PostgreSQL, Redis, Kafka, and Zookeeper locally.

**3. Set up the backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head              # Run database migrations
uvicorn main:app --reload --port 8000
```

**4. Set up the frontend**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` for the dashboard and `http://localhost:8000/docs` for the FastAPI Swagger UI.

### Environment Variables

Create `backend/.env` from the example file. Key variables:

```env
# Razorpay (test mode — no real money)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Google Gemini
GEMINI_API_KEY=...

# Database (Supabase or local Docker Postgres)
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/revault

# Redis (Upstash or local Docker Redis)
REDIS_URL=redis://localhost:6379

# Kafka (Upstash or local Docker Kafka)
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# WhatsApp Business Cloud API
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...

# SendGrid
SENDGRID_API_KEY=...

# ElevenLabs (optional — gTTS is the free fallback)
ELEVENLABS_API_KEY=...
```

---

## Running the Simulation

ReVault ships with a synthetic dataset of 355 records covering every failure type — insufficient funds, bank infrastructure down, expired cards, UPI limit exceeded, abandoned checkouts, halted subscriptions, and overdue B2B invoices.

```bash
cd backend

# Generate synthetic failure events
python simulation/generate_synthetic_data.py

# Run all agents across the full batch
python simulation/batch_runner.py

# Evaluate recovery metrics
python simulation/metrics_evaluator.py
```

The batch report shows recovered revenue per module, classifier accuracy, false positive rate, compliance violations (should be zero), and correct escalations.

---

## External APIs Used

| API | Modules | Free Tier |
|---|---|---|
| Razorpay Test Mode | All | Unlimited |
| Meta WhatsApp Business | 2, 3, 4, 6 | 1,000 conversations/month |
| SendGrid | All email | 100 emails/day |
| ElevenLabs | Module 6 | 10,000 chars/month |
| Google AI Studio (Gemini) | All AI | 1,500 requests/day |

---

## A Note on Razorpay's Existing Products

Razorpay already ships **UPI Autopay with Intelligent Revenue-Protect**, which improves mandate success rates and recovers failed debits. Two of ReVault's modules (Subscription Rescue and Mandate Retry Sequencer) work in a related space.

The distinction is intentional and worth stating clearly: Razorpay's Revenue-Protect operates at the mandate level. ReVault adds a **cross-channel, root-cause-aware layer on top** — Hinglish voice recovery, Promise-to-Pay tracking, B2B receivables pursuit, and a full reasoning trail attached to every decision — which Revenue-Protect does not address.

---

## Contributing

This project was built for a 48-hour hackathon. If you're picking it up after the event, the code follows production-oriented engineering principles throughout — clean separation of concerns, explicit error handling, idempotent event processing, atomic financial state transitions, and a full audit trail.

Start with `backend/services/compliance_engine.py` to understand the safety model, then `backend/agents/graph.py` to understand how the LangGraph state machine is wired.

---

## License

MIT

---

*ReVault — Every rupee tracked. Every decision explained. Every action auditable.*
