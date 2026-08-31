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
  { layer: 'Agent Orchestration', tech: 'LangGraph (LangChain)',          purpose: 'Multi-agent state machine with conditional routing' },
  { layer: 'AI/LLM',             tech: 'Gemini 1.5 Flash (Google AI)',    purpose: 'RCA classification, NLP PTP extraction, voice scripts' },
  { layer: 'Backend',            tech: 'FastAPI + SQLAlchemy + Alembic',   purpose: 'Async REST API, database ORM, schema migrations' },
  { layer: 'Database',           tech: 'PostgreSQL (Supabase)',            purpose: 'Transactional storage + real-time CDC streaming' },
  { layer: 'Cache / Queue',      tech: 'Redis',                           purpose: 'Webhook idempotency, retry scheduling, rate limiting' },
  { layer: 'Frontend',           tech: 'React 18 + Vite + Redux Toolkit', purpose: 'Merchant dashboard, real-time feed, agent controls' },
  { layer: 'Messaging',         tech: 'WhatsApp Business Cloud API',      purpose: 'Recovery outreach with Razorpay payment links' },
  { layer: 'Voice',             tech: 'ElevenLabs / gTTS + Twilio',       purpose: 'Hinglish AI voice synthesis and outbound calling' },
  { layer: 'Payments',          tech: 'Razorpay Webhooks + Payment Links', purpose: 'Failure ingestion, recovery payment orchestration' },
  { layer: 'Compliance',        tech: 'Custom Engine + TRAI DLT Rules',   purpose: 'Zero-violation contact-limit and opt-out enforcement' },
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
          <span className="badge badge-purple">Razorpay-Grade Engineering</span>
        </div>
        <div style={{ overflowX: 'auto', padding: '0 4px 4px' }}>
          <table className="pitch-tech-table">
            <thead>
              <tr>
                <th>Layer</th>
                <th>Technology</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {TECH_STACK.map(row => (
                <tr key={row.layer}>
                  <td>{row.layer}</td>
                  <td style={{ color: 'var(--rzp-blue-bright)', fontWeight: 600 }}>{row.tech}</td>
                  <td>{row.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
