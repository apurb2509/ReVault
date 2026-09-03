import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Presentation, CheckCircle, ExternalLink, Zap, Brain, Shield, Phone, Mail, BarChart3, Link2, ChevronRight } from 'lucide-react';
import { Header } from '../components/layout/Header';

const EVAL_CHECKLIST = [
  { label: 'Multi-Agent LangGraph State Machine', desc: 'Autonomous agents: Degradation Watchdog, Abandonment Hunter, Subscription Rescue, Mandate Sequencer, B2B Chaser, VoiceIQ, PTP Tracker', route: '/traces' },
  { label: 'Real Razorpay Webhook Integration', desc: 'POST /webhooks/razorpay — HMAC-SHA256 signature verified, Redis idempotency, background agent dispatch', route: null },
  { label: 'AI Root Cause Analysis (RCA)', desc: 'Gemini 1.5 Flash classifies failure cause: BANK_INFRA_DOWN, INSUFFICIENT_FUNDS, EXPIRED_CARD, MANDATE_AUTH_DROP', route: '/traces' },
  { label: 'Smart Retry Scheduler', desc: 'Defers retries during bank outages. Salary predictor selects optimal retry time using historical deposit patterns', route: '/' },
  { label: 'TRAI DLT Compliance Engine', desc: 'Hard-blocks: opt-out, fraud flag, 9AM–9PM contact window, 3-contact cooling period per customer. Zero violations guaranteed', route: '/audit' },
  { label: 'WhatsApp Business API Recovery', desc: 'Meta Business Cloud API sends contextual Hinglish outreach messages with Razorpay payment links', route: '/simulator' },
  { label: 'VoiceIQ — Hinglish Voice Agent', desc: 'ElevenLabs/gTTS synthesizes bilingual AI voice calls for high-value defaults. Outbound via Twilio', route: '/voice' },
  { label: 'B2B Receivables Chaser + PTP Tracker', desc: 'NLP extracts payment commitments from email replies. Kanban pipeline tracks outstanding invoices by risk tier', route: '/invoices' },
  { label: 'Immutable Audit Trail (Supabase)', desc: 'Every agent decision, compliance block, and human override is logged to tamper-evident PostgreSQL via Supabase', route: '/audit' },
  { label: 'Batch Simulation & Measurement Engine', desc: 'Runs against synthetic datasets. Measures classifier accuracy, recovery rate, compliance violations, escalation precision', route: '/batch' },
  { label: 'Customer Recovery Portal', desc: 'Standalone Razorpay-style payment page. Customer retries via UPI, card update, or net banking — 1-tap recovery', route: '/recovery' },
  { label: 'Human-in-the-Loop (HITL) Escalation', desc: 'High-value cases and fraud flags escalated to human review queue with approve/override controls', route: '/' },
];

const TECH_STACK = [
  { role: 'Agent Orchestration Server', tech: 'Python 3.12 + FastAPI', why: 'Python is the undisputed king of AI integration, and FastAPI provides unmatched async performance for heavy API loads.' },
  { role: 'Multi-agent state machine', tech: 'LangGraph', why: 'Standard LangChain chains are too linear. LangGraph allows cyclical, stateful, multi-step agent reasoning workflows.' },
  { role: 'API Gateway / Ingress', tech: 'Go (Golang)', why: 'Go handles raw concurrent webhook ingress. It currently forwards directly to the Python FastAPI backend via HTTP.' },
  { role: 'Core Reasoning Engine', tech: 'Google Gemini 1.5 Flash', why: 'Lightning fast for root-cause analysis, script generation, and decision making with high accuracy.' },
  { role: 'PTP Tracker NLP', tech: 'OpenAI (gpt-4o-mini)', why: "Specifically chosen for the PTP tracker because OpenAI's JSON Structured Outputs are flawless for strict date extraction." },
  { role: 'Voice Synthesis', tech: 'ElevenLabs / gTTS', why: 'ElevenLabs provides ultra-realistic Hinglish accents. gTTS acts as a reliable, free fallback.' },
  { role: 'Voice & WhatsApp', tech: 'Twilio Sandbox', why: 'Used for executing real-time outbound calls and PTP (Promise-to-Pay) WhatsApp text message tracking.' },
  { role: 'Event Bus & Background Worker', tech: 'Redis Queue Worker', why: 'The app uses Redis queues (aioredis) to decouple webhook ingestion from slow AI processing, processed by a background worker daemon.' },
  { role: 'Payment Gateway API', tech: 'Razorpay Test API', why: 'Core payment processing, subscriptions, and webhook events generation.' },
  { role: 'Transactional DB', tech: 'PostgreSQL (Supabase)', why: 'Supabase provides Realtime WebSockets out-of-the-box, allowing the frontend to react to DB writes instantly.' },
  { role: 'Dedup & Caching', tech: 'Redis', why: 'Lightning fast idempotency locks, pre-seeded opt-out checks, and event queuing before hitting the DB.' },
  { role: 'Dashboard UI', tech: 'React 19 + Vite', why: 'Vite provides instantaneous HMR, and React offers the best ecosystem for complex admin dashboards.' },
  { role: 'State Management', tech: 'Redux Toolkit', why: 'Standard Redux Toolkit slices (configureStore) are used to manage feed, metrics, agents, and simulation state.' },
];

const AGENT_FLOW = [
  { label: 'Razorpay Webhook (payment.failed / subscription.halted)', icon: Zap,       color: 'var(--rzp-blue)' },
  { label: 'Degradation Watchdog — bank outage detection',            icon: BarChart3, color: 'var(--danger)' },
  { label: 'RCA Classifier (Gemini 1.5 Flash)',                       icon: Brain,     color: 'var(--purple)' },
  { label: 'Compliance Engine — TRAI / opt-out / fraud check',        icon: Shield,    color: 'var(--success)' },
  { label: 'Recovery Agent Dispatch (WhatsApp / Email / Voice)',      icon: Mail,      color: '#25D366' },
  { label: 'VoiceIQ Agent — Hinglish outbound call',                  icon: Phone,     color: 'var(--cyan)' },
  { label: 'PTP Tracker — promise extraction from reply',             icon: CheckCircle, color: 'var(--warning)' },
  { label: 'Payment Link / HITL Escalation / Audit Log',              icon: Link2,     color: 'var(--rzp-blue-bright)' },
];

export const PitchGuide: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header
        title="Pitch Guide — Razorpay Buildathon 2026"
        subtitle="Complete evaluation walkthrough — architecture, tech stack, and live demo navigation"
      />

      {/* Hero problem statement */}
      <div className="pitch-hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Presentation size={22} color="var(--rzp-blue-bright)" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              ReVault AI — Revenue Recovery Engine
            </span>
            <span className="badge badge-blue" style={{ marginLeft: 8 }}>Track 3 · AI Revenue Recovery</span>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 700 }}>
            Subscription and recurring e-commerce businesses lose <strong style={{ color: 'var(--danger)' }}>20–30% ARR</strong> to
            involuntary churn — payment failures caused by bank outages, soft declines, expired card tokens, and dropped NPCI
            mandate authorizations. ReVault is an autonomous multi-agent platform built natively for Razorpay Merchants that
            recovers this revenue automatically with zero human intervention.
          </div>
        </div>
      </div>

      {/* Impact stats */}
      <div className="pitch-impact-banner flex items-center" style={{ gap: '40px', justifyContent: 'center' }}>
        {[
          { value: '20–30%', label: 'ARR lost to involuntary churn' },
          { value: '94.2%',  label: 'AI classifier accuracy' },
          { value: '0',      label: 'Compliance violations' },
          { value: '8',      label: 'Specialized AI agents' },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <div className="pitch-impact-divider" />}
            <div className="pitch-impact-stat">
              <div className="pitch-impact-value" style={{ color: i === 0 ? 'var(--danger)' : i === 2 ? 'var(--success)' : 'var(--rzp-blue-bright)' }}>{s.value}</div>
              <div className="pitch-impact-label">{s.label}</div>
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="grid-2" style={{ gap: '20px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {/* Evaluation Checklist */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Razorpay Evaluation Checklist</div>
            <span className="badge badge-success">{EVAL_CHECKLIST.length}/{EVAL_CHECKLIST.length} ✓</span>
          </div>
          <div className="pitch-checklist" style={{ padding: '0 4px 4px' }}>
            {EVAL_CHECKLIST.map(item => (
              <div
                key={item.label}
                className="pitch-check-item"
                style={{ cursor: item.route ? 'pointer' : 'default' }}
                onClick={() => item.route && navigate(item.route)}
              >
                <div className="pitch-check-icon">
                  <CheckCircle size={13} color="var(--success)" />
                </div>
                <div>
                  <div className="pitch-check-label">
                    {item.label}
                    {item.route && <ExternalLink size={10} style={{ marginLeft: 5, opacity: 0.5, display: 'inline' }} />}
                  </div>
                  <div className="pitch-check-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Agent Flow */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Multi-Agent Pipeline Flow</div>
            </div>
            <div className="pitch-agent-flow">
              {AGENT_FLOW.map((node) => {
                const Icon = node.icon;
                return (
                  <div key={node.label} className="pitch-agent-node" style={{ marginBottom: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${node.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} color={node.color} />
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', flex: 1 }}>{node.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live demo quick links */}
          <div className="panel">
            <div className="panel-title" style={{ marginBottom: '14px' }}>Quick Demo Navigation</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: '⚡ Fire Webhook Scenario', route: '/simulator', color: 'var(--rzp-blue)' },
                { label: '💬 Browse Campaigns',      route: '/campaigns', color: '#25D366' },
                { label: '🔗 Open Recovery Portal',  route: '/recovery',  color: 'var(--purple)' },
                { label: '🛡️ View Audit Trail',      route: '/audit',     color: 'var(--warning)' },
                { label: '📊 Batch Report',           route: '/batch',     color: 'var(--danger)' },
              ].map(link => (
                <button
                  key={link.route}
                  className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', fontSize: '13px', gap: '10px', borderColor: 'var(--border-default)' }}
                  onClick={() => navigate(link.route)}
                >
                  {link.label}
                  <ChevronRight size={14} style={{ marginLeft: 'auto' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Technology Stack</div>
        </div>
        <div style={{ overflowX: 'auto', padding: '0 4px 4px' }}>
          <table className="pitch-tech-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Technology</th>
                <th>Why I Preferred It</th>
              </tr>
            </thead>
            <tbody>
              {TECH_STACK.map((row, i) => (
                <tr key={i}>
                  <td>{row.role}</td>
                  <td style={{ color: 'var(--rzp-blue-bright)', fontWeight: 600 }}>{row.tech}</td>
                  <td>{row.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
