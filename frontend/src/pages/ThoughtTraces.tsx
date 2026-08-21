import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Brain, CheckCircle } from 'lucide-react';
import { Header } from '../components/layout/Header';

interface TraceStep {
  label: string;
  content: string;
  json?: string;
}

interface AgentTrace {
  id: string;
  agent: string;
  module: string;
  event_ref: string;
  timestamp: string;
  outcome: string;
  outcome_type: 'success' | 'warning' | 'danger';
  steps: TraceStep[];
}

const TRACES: AgentTrace[] = [
  {
    id: 'tr-001',
    agent: 'Abandonment Hunter',
    module: 'ABANDONMENT_HUNTER',
    event_ref: 'ORD-8821',
    timestamp: '14:32:07 IST',
    outcome: '₹2,499 RECOVERED',
    outcome_type: 'success',
    steps: [
      {
        label: 'Data Analyzed',
        content: 'Order #ORD-8821 created at 14:01:07. No payment attempt in 31 minutes. Customer: Rahul Sharma (+91-98XXXXXX), amount: ₹2,499, method: UPI (SBI). Previous orders: 3 (all paid). Failure event: payment.failed received at 14:28.',
      },
      {
        label: 'Root Cause Classification (Gemini)',
        content: 'Sent failure batch to Gemini 1.5 Flash. Response: BANK_INFRA_DOWN (confidence: 0.91). SBI UPI success rate dropped 34% vs 24hr baseline. auto_action_permitted: true.',
        json: '{\n  "cause": "BANK_INFRA_DOWN",\n  "confidence": 0.91,\n  "affected_segment": {"bank": "SBI", "method": "UPI"},\n  "recommended_action": "Create payment link, send via WhatsApp Tier-1",\n  "auto_action_permitted": true\n}',
      },
      {
        label: 'Compliance Check',
        content: 'Ran 7-check Compliance Engine: opted_out=false, time_window=09:00-21:00 ✓ (14:32 IST), max_attempts=1 of 3 ✓, cooling_period=0 contacts today ✓, fraud_flag=false ✓, dispute_flag=false ✓, daily_limit=0 of 2 ✓. ALL PASSED.',
      },
      {
        label: 'Action Executed',
        content: 'Created Razorpay Payment Link via POST /v1/payment_links. Link ID: plink_Mk8pQv. Sent WhatsApp Tier-1 message to +91-98XXXXXX. Delivery confirmed: DELIVERED.',
      },
      {
        label: 'Outcome',
        content: 'payment.captured webhook received at 14:47:32 for plink_Mk8pQv. Amount: ₹2,499. Recovery confirmed. Case closed. Amount added to session recovered total.',
      },
    ],
  },
  {
    id: 'tr-002',
    agent: 'Degradation Watchdog',
    module: 'DEGRADATION_WATCHDOG',
    event_ref: 'DEGRADE-SBI-001',
    timestamp: '14:28:00 IST',
    outcome: 'FRAUD ESCALATED → HITL',
    outcome_type: 'danger',
    steps: [
      {
        label: 'Data Analyzed',
        content: 'Background poll at 14:28:00. Fetched last 15-min payment batch from GET /v1/payments. SBI UPI: 312 failures out of 547 attempts (57.1% success). 24hr baseline: 91.2%. Drop: 34.1% — exceeds 15% alert threshold.',
      },
      {
        label: 'RCA Engine (Gemini)',
        content: 'Also detected: payment #pay_IAmXz3 shows unusual IP geolocation mismatch + high-velocity pattern. Gemini flagged: FRAUD_SUSPECTED (confidence: 0.97). This overrides BANK_INFRA_DOWN for this specific payment.',
        json: '{\n  "cause": "FRAUD_SUSPECTED",\n  "confidence": 0.97,\n  "pattern": "velocity_anomaly + geo_mismatch",\n  "auto_action_permitted": false,\n  "escalation": "IMMEDIATE_HUMAN"\n}',
      },
      {
        label: 'Compliance Override',
        content: 'FRAUD_SUSPECTED → Compliance Engine forces: auto_action_permitted=false regardless of Gemini suggestion. Zero automated contact with this customer. Case forwarded to HITL queue.',
      },
      {
        label: 'Action Executed',
        content: 'Pushed HITL item to Human-in-the-Loop queue (id: HITL-001). Sent DEGRADATION_ALERT WebSocket event to all connected dashboards. Generated merchant advisory: "SBI UPI degraded, HDFC recommended for affected merchants."',
      },
      {
        label: 'Outcome',
        content: 'ESCALATED. No auto-action taken on fraud case. Degradation advisory dispatched. SBI UPI retries held for 2 hours.',
      },
    ],
  },
  {
    id: 'tr-003',
    agent: 'VoiceIQ Agent',
    module: 'VOICEIQ_AGENT',
    event_ref: 'VOICE-001',
    timestamp: '13:45:22 IST',
    outcome: '₹9,999 RECOVERED',
    outcome_type: 'success',
    steps: [
      {
        label: 'Data Analyzed',
        content: 'subscription.halted for sub_Kp7mRn. Customer: Priya Mehta, ₹9,999/month Netflix Premium. Failure cause: CARD_ISSUER_BLOCK. Day 5 of win-back sequence. Previous contacts: Day 0 (WhatsApp, no response), Day 2 (Hinglish WhatsApp, read but no action).',
      },
      {
        label: 'Script Generation (Gemini)',
        content: 'Sent context to Gemini. Tone selected: WARM_EMPATHETIC (high-value, first halted, no prior defaults, premium plan). Script generated in Hinglish (58 words, within 60-word limit).',
        json: '"Namaste Priya ji! Main ReVault se bol raha hoon. Aapka ₹9,999 ka subscription is mahine process nahi ho paya. Koi baat nahi — card update karna bahut simple hai. Maine aapke WhatsApp pe link bhej diya hai. Aap jab bhi convenient ho complete kar sakte hain. Dhanyavaad!"',
      },
      {
        label: 'Voice Synthesis',
        content: 'Script sent to ElevenLabs API (voice: Aarav, Hinglish). Audio generated: 31 seconds. Stored as voice_VOICE-001.mp3.',
      },
      {
        label: 'Compliance Check',
        content: 'All 7 checks passed. opted_out=false, time 09:00-21:00 ✓, max_attempts=2 of 5 (voice) ✓, cooling_period=3 days since last contact ✓.',
      },
      {
        label: 'Outcome',
        content: 'Call ANSWERED. Customer updated card during call. payment.captured received at 14:12. ₹9,999 recovered. Case closed. Subscription reactivated.',
      },
    ],
  },
  {
    id: 'tr-004',
    agent: 'PTP Tracker',
    module: 'PTP_TRACKER',
    event_ref: 'PTP-001',
    timestamp: '09:14:00 IST',
    outcome: 'BROKEN PROMISE — Escalated',
    outcome_type: 'danger',
    steps: [
      {
        label: 'Promise Extraction',
        content: 'WhatsApp reply from Rahul Sharma (TechCorp): "Will transfer by Friday for sure. Accounts team has been notified." NLP extracted commitment.',
        json: '{\n  "has_commitment": true,\n  "promised_date": "2026-08-15",\n  "promised_amount": 82700,\n  "confidence": "HIGH",\n  "dispute_raised": false,\n  "escalation_needed": false\n}',
      },
      {
        label: 'PTP Record Created',
        content: 'PTP record inserted. Invoice #INV-204 status → PROMISED. Automated chasing PAUSED. Cooling applied: no further WhatsApp/email/voice until promised date.',
      },
      {
        label: 'Monitoring',
        content: 'Scheduled Razorpay API check for Aug 15 18:00 IST (end of business day). Auto-reconciliation job queued.',
      },
      {
        label: 'Broken Promise Detected',
        content: 'Aug 15 18:00 IST — GET /v1/payments?invoice=INV-204 returned no successful payment. Promise marked BROKEN. Customer risk tier elevated: YELLOW → ORANGE.',
      },
      {
        label: 'Outcome',
        content: 'ESCALATED. HITL item created (HITL-002). Further automated chasing halted per compliance rules. Human decision required.',
      },
    ],
  },
  {
    id: 'tr-005',
    agent: 'Mandate Sequencer',
    module: 'MANDATE_SEQUENCER',
    event_ref: 'RETRY-sub_Mn4j',
    timestamp: '12:00:00 IST',
    outcome: '₹799 RECOVERED',
    outcome_type: 'success',
    steps: [
      {
        label: 'Failure Classification',
        content: 'subscription.pending for sub_Mn4j at 10:00. Cause: BANK_INFRA_DOWN (SBI). Retry state machine initialized. Attempt 1 scheduled for +2 hrs.',
      },
      {
        label: 'Re-classification on Retry',
        content: 'At 12:00, before retrying, re-fetched SBI UPI status. Baseline check: success rate restored to 88.4%. Cause RE-CLASSIFIED: BANK_INFRA_DOWN → TECHNICAL_TRANSIENT (resolved). Retry permitted on same rail (UPI).',
      },
      {
        label: 'Retry Execution',
        content: 'Auto-debit retry via Razorpay Subscriptions API (invoice_id: inv_sub_Mn4j_Sep). Result: SUCCESS. payment.captured received.',
      },
      {
        label: 'Outcome',
        content: '₹799 recovered. subscription.active status restored. Retry state machine cleared. Full retry reasoning logged to audit trail.',
      },
    ],
  },
];

const OUTCOME_BADGE_CLASS: Record<string, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
};

export const ThoughtTraces: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>('tr-001');

  return (
    <>
      <Header
        title="Agent Thought Traces"
        subtitle='Gemini reasoning chains — "The AI is not a black box."'
      />

      <div style={{ marginBottom: '24px', padding: '16px 20px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Brain size={20} color="var(--purple)" />
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Every AI decision is inspectable</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Click any trace below to expand full Gemini reasoning: data analyzed → root cause → compliance check → action → outcome.
          </div>
        </div>
      </div>

      {TRACES.map(trace => {
        const isOpen = openId === trace.id;
        return (
          <div key={trace.id} className="trace-card">
            <div
              id={`trace-${trace.id}`}
              className="trace-header"
              onClick={() => setOpenId(isOpen ? null : trace.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{trace.agent}</span>
                    <span className="badge badge-muted">{trace.module.replace(/_/g, ' ')}</span>
                    <span className="badge badge-info text-mono" style={{ fontSize: '10px' }}>ref: {trace.event_ref}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{trace.timestamp}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`badge ${OUTCOME_BADGE_CLASS[trace.outcome_type]}`}>{trace.outcome}</span>
                  <ChevronDown
                    size={16}
                    color="var(--text-muted)"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
                  />
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="trace-body">
                    {trace.steps.map((step, i) => (
                      <div key={i} className="trace-step">
                        <div className="trace-step-number">{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div className="trace-step-label">
                            <CheckCircle size={10} style={{ display: 'inline', marginRight: '4px' }} />
                            {step.label}
                          </div>
                          <div className="trace-step-content">{step.content}</div>
                          {step.json && (
                            <pre className="trace-json">{step.json}</pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </>
  );
};
