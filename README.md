# ReVault — AI Revenue Recovery Operating System

> **"Don't just find the leak. Stop it. Measure it. Win it back."**

ReVault is an autonomous, multi-agent revenue recovery platform. It doesn't just alert you when payments fail — it detects the failure, diagnoses the root cause using AI, executes a compliant recovery action, and tracks whether real money was actually recovered. Every decision is logged. Every action is auditable. Every rupee matters.

---

## 🛑 The 7 Revenue Problems & How ReVault Solves Them

| The Revenue Leak (Problem) | The ReVault AI Solution (Module) |
|---|---|
| **1. Unnoticed Systemic Outages:** Bank infrastructure goes down, causing hundreds of payments to fail silently before merchants realize it. | **Payment Degradation Watchdog:** Detects real-time payment success rate drops per bank/method, runs AI root-cause analysis, and pushes merchant advisories instantly. |
| **2. High-Intent Drop-offs:** Users add items to cart, initiate checkout, but abandon it midway due to friction. | **Abandonment Hunter Agent:** Finds created but unpaid orders, waiting for a smart interval before running a tiered WhatsApp/SMS recovery sequence. |
| **3. Blind Subscription Retries:** Subscriptions retry blindly on a T+1 schedule regardless of why it failed (e.g. retrying an expired card is pointless). | **Subscription Rescue Agent:** Classifies subscription failures *before* the native retry fires, picking the exact right recovery strategy per cause (e.g. asking for a new card instead of retrying). |
| **4. Overdue B2B Invoices:** Following up on unpaid B2B invoices is highly manual, awkward, and prone to human delay. | **B2B Receivables Pursuit Agent:** Ages outstanding invoices, scores risk, and runs a multi-touch autonomous recovery sequence (email → WhatsApp → voice → human escalation). |
| **5. Rigid Mandate Rails:** Failed UPI mandates keep retrying on UPI, even if the user's UPI app is temporarily blocked. | **Intelligent Mandate Retry Sequencer:** Dynamically re-classifies the failure cause on every retry and switches rails (e.g., failing on UPI? Send a card payment link). |
| **6. Generic SMS Reminders:** Text messages are ignored. Personal touch is lost at scale. | **VoiceIQ Recovery Agent:** Generates highly personalized, context-aware Hinglish voice scripts via LLMs, synthesizes them to human voice, and places the call. |
| **7. Broken Payment Promises:** A user replies "I'll pay on Friday", but nobody tracks it to hold them accountable. | **Promise-to-Pay (PTP) Engine:** Uses OpenAI NLP to extract exact dates from natural customer replies, monitors the promise, and escalates immediately if broken. |

---

## 🏗️ Architecture & Data Flow (Real-Time Sequence)

Below is the real-time data flow sequence chart mapping how an event flows from Razorpay through ReVault's AI agents.

![Architecture & Data Flow](frontend/architecture_diagram/architecture.gif)

The ingestion layer is high-throughput and idempotent. All agent actions must pass through a deterministic **Compliance Engine** before execution — *the LLM recommends, but the hard-coded rules decide.*

---

## 💻 Tech Stack & Why I Preferred It

### Backend & Orchestration
| Technology | Role | Why I Preferred It |
|---|---|---|
| **Python 3.12 + FastAPI** | Agent Orchestration Server | Python is the undisputed king of AI integration, and FastAPI provides unmatched async performance for heavy API loads. |
| **LangGraph** | Multi-agent state machine | Standard LangChain chains are too linear. LangGraph allows cyclical, stateful, multi-step agent reasoning workflows. |
| **Go (Golang)** | API Gateway / Ingress | Go handles raw concurrent webhook ingress. It currently forwards directly to the Python FastAPI backend via HTTP. |

### AI / NLP Models
| Technology | Role | Why I Preferred It |
|---|---|---|
| **Google Gemini 1.5 Flash** | Core Reasoning Engine | Lightning fast for root-cause analysis, script generation, and decision making with high accuracy. |
| **OpenAI (gpt-4o-mini)** | PTP Tracker NLP | Specifically chosen for the PTP tracker because OpenAI's JSON Structured Outputs are flawless for strict date extraction. |
| **ElevenLabs / gTTS** | Voice Synthesis | ElevenLabs provides ultra-realistic Hinglish accents. gTTS acts as a reliable, free fallback. |

### Data & Infrastructure
| Technology | Role | Why I Preferred It |
|---|---|---|
| **Redis Queue Worker** | Event Bus & Background Worker | Instead of Kafka, the app uses Redis queues (`aioredis`) to decouple webhook ingestion from slow AI processing, processed by a background worker daemon. |
| **PostgreSQL (Supabase)** | Transactional DB | Supabase provides Realtime WebSockets out-of-the-box, allowing the frontend to react to DB writes instantly. |
| **Redis** | Dedup & Caching | Lightning fast idempotency locks, pre-seeded opt-out checks, and event queuing before hitting the DB. |

### Frontend
| Technology | Role | Why I Preferred It |
|---|---|---|
| **React 19 + Vite** | Dashboard UI | Vite provides instantaneous HMR, and React offers the best ecosystem for complex admin dashboards. |
| **Redux Toolkit** | State Management | Standard Redux Toolkit slices (`configureStore`) are used to manage feed, metrics, agents, and simulation state. |

---

## ⚙️ Getting Started (Simplified)

I have consolidated the entire architecture into a master orchestrator script. 

### Prerequisites
1. Install Python 3.12+ and Node.js.
2. Ensure you have access to a PostgreSQL database (like Supabase) and a Redis server.

### 🔑 Required Environment Variables
You must create `.env` files in both the frontend and backend directories before running the app.

**`backend/.env`:**
```env
# Database & Queues
DATABASE_URL=postgresql://postgres:[password]@db.supabase.co:5432/postgres
REDIS_URL=redis://localhost:6379
SUPABASE_URL=https://[YOUR-ID].supabase.co
SUPABASE_KEY=[YOUR-SERVICE-ROLE-KEY]

# Payments (Razorpay)
RAZORPAY_KEY_ID=[your_key_id]
RAZORPAY_KEY_SECRET=[your_key_secret]
RAZORPAY_WEBHOOK_SECRET=[your_webhook_secret]

# AI Providers
GEMINI_API_KEY=[your_gemini_key]
OPENAI_API_KEY=[your_openai_key]       # For PTP NLP Tracker
ELEVENLABS_API_KEY=[optional_for_voice]

# Comms (Twilio)
TWILIO_ACCOUNT_SID=[your_sid]
TWILIO_AUTH_TOKEN=[your_token]
TWILIO_WHATSAPP_NUMBER=whatsapp:+[number]
TWILIO_VOICE_NUMBER=+[number]
```

**`frontend/.env`:**
```env
# Supabase Realtime (Required for local dev)
VITE_SUPABASE_URL=https://[YOUR-ID].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]

# Live Production Overrides (Not needed for localhost)
# VITE_API_URL=https://revault-backend.onrender.com
# VITE_WS_URL=wss://revault-backend.onrender.com/ws
```

### 1. Start the Unified Backend
Close any running terminals. Open a new terminal in the `ReVault` root directory:
```powershell
cd backend
python start.py
```
> **What this does:** This single script automatically boots **Ngrok** (and updates your `.env`), starts the **Uvicorn/FastAPI** server, boots a **Redis Worker Daemon**, and automatically runs the **Batch Runner** simulation in the background, streaming all logs perfectly into this one terminal!

### 2. Start the Frontend
Open a second terminal:
```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173` to view the live dashboard!

---

## 🛡️ The Compliance Engine

Every agent action passes through a deterministic compliance gate. No automated action bypasses this.
1. Max 3 recovery attempts per failed payment.
2. 24-hour cooling period between contacts.
3. No contacts between 9 PM – 9 AM IST (TRAI DLT compliance).
4. Fraud-flagged payments → immediate freeze.
5. Customer opt-out → permanent removal.

---
*ReVault — Every rupee tracked. Every decision explained. Every action auditable.*
