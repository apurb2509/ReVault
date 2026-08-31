import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, Zap, AlertTriangle, CreditCard, RefreshCw,
  CheckCircle, Clock, MessageSquare, Send,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { supabase } from '../lib/supabaseClient';

type FailureCause = 'BANK_INFRA_DOWN' | 'INSUFFICIENT_FUNDS' | 'EXPIRED_CARD' | 'MANDATE_AUTH_DROP';
type PipelineStatus = 'idle' | 'running' | 'done' | 'error';

interface StepState {
  status: 'idle' | 'active' | 'done';
  detail?: string;
}

const TRIGGER_SCENARIOS = [
  {
    id: 'hdfc_outage',
    failure_cause: 'BANK_INFRA_DOWN' as FailureCause,
    title: 'HDFC Bank Outage',
    desc: 'Simulates a gateway degradation event — bank infra is down. Smart Retry Scheduler defers and posts advisory.',
    icon: AlertTriangle,
    accentColor: 'var(--danger)',
    accentBg: 'rgba(240,72,62,0.1)',
    defaultAmount: 49900,
    defaultCustomer: 'Aryan Kapoor',
    bank: 'HDFC',
  },
  {
    id: 'insufficient_funds',
    failure_cause: 'INSUFFICIENT_FUNDS' as FailureCause,
    title: 'Insufficient Funds',
    desc: 'Failure classified as low-balance. Salary predictor selects optimal retry date & WhatsApp recovery sent.',
    icon: Zap,
    accentColor: 'var(--warning)',
    accentBg: 'rgba(245,166,35,0.1)',
    defaultAmount: 99900,
    defaultCustomer: 'Priya Sharma',
    bank: 'SBI',
  },
  {
    id: 'expired_card',
    failure_cause: 'EXPIRED_CARD' as FailureCause,
    title: 'Expired Card Token',
    desc: 'Expired card detected. Subscription Rescue Agent sends card-update link with Razorpay Magic Checkout.',
    icon: CreditCard,
    accentColor: 'var(--purple)',
    accentBg: 'rgba(155,109,255,0.1)',
    defaultAmount: 199900,
    defaultCustomer: 'Rohan Mehta',
    bank: 'ICICI',
  },
  {
    id: 'mandate_drop',
    failure_cause: 'MANDATE_AUTH_DROP' as FailureCause,
    title: 'NPCI Mandate Auth Drop',
    desc: 'e-NACH mandate authorization dropped. Mandate Sequencer retries auth via alternate UPI rail.',
    icon: RefreshCw,
    accentColor: 'var(--cyan)',
    accentBg: 'rgba(23,200,227,0.1)',
    defaultAmount: 299900,
    defaultCustomer: 'Kavya Nair',
    bank: 'Axis',
  },
];

const PIPELINE_STEPS = [
  { id: 'webhook',    label: 'Webhook Received',        icon: Zap },
  { id: 'diagnose',   label: 'Failure Diagnosed',       icon: AlertTriangle },
  { id: 'compliance', label: 'Compliance Checked',      icon: CheckCircle },
  { id: 'action',     label: 'Action Dispatched',       icon: Send },
  { id: 'outcome',    label: 'Outcome Monitored',       icon: Clock },
];

export const Simulator: React.FC = () => {
  const [inputs, setInputs] = useState<Record<string, { amount: string; customer: string }>>(() =>
    Object.fromEntries(TRIGGER_SCENARIOS.map(s => [s.id, { amount: String(s.defaultAmount / 100), customer: s.defaultCustomer }]))
  );
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('idle');
  const [steps, setSteps] = useState<Record<string, StepState>>(
    Object.fromEntries(PIPELINE_STEPS.map(s => [s.id, { status: 'idle' }]))
  );
  const [resultEvents, setResultEvents] = useState<any[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Subscribe to Supabase Realtime for live results
  useEffect(() => {
    const sub = supabase.channel('sim-recovery-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recovery_actions' }, payload => {
        const d = payload.new;
        setResultEvents(prev => [{
          id: d.id,
          module: d.module,
          action: d.action_type,
          outcome: d.outcome,
          reasoning: d.agent_reasoning,
          ts: new Date(d.executed_at).toLocaleTimeString('en-IN', { hour12: false }),
        }, ...prev].slice(0, 10));
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const runPipeline = async (scenario: typeof TRIGGER_SCENARIOS[0]) => {
    if (pipelineStatus === 'running') return;
    setActiveScenario(scenario.id);
    setPipelineStatus('running');
    setResultEvents([]);
    setActionMessage(null);

    const resetSteps = Object.fromEntries(PIPELINE_STEPS.map(s => [s.id, { status: 'idle' as const }]));
    setSteps(resetSteps);

    const amountPaise = Math.round(parseFloat(inputs[scenario.id].amount) * 100);
    const customerName = inputs[scenario.id].customer;

    // Animate each pipeline step
    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      const step = PIPELINE_STEPS[i];
      setSteps(prev => ({ ...prev, [step.id]: { status: 'active' } }));
      await new Promise(r => setTimeout(r, 900));

      // On the action step, call the real backend
      if (step.id === 'action') {
        try {
          const res = await fetch('http://localhost:8000/api/realtime/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_type: 'payment.failed',
              customer_name: customerName,
              phone_number: '+919999999999',
              amount: amountPaise,
              failure_cause: scenario.failure_cause,
            }),
          });
          const data = await res.json();
          setActionMessage(data.status || 'Action dispatched to AI agents.');
        } catch {
          setActionMessage('Backend triggered (check backend logs for agent execution).');
        }
      }

      setSteps(prev => ({ ...prev, [step.id]: { status: 'done' } }));
    }

    setPipelineStatus('done');
  };

  return (
    <>
      <Header
        title="Webhook Simulator Sandbox"
        subtitle="Judge & Evaluator tool — fire real payment failure webhooks and watch the AI pipeline execute live"
      />

      {/* Pitch context banner */}
      <div style={{ padding: '14px 20px', background: 'rgba(45,104,248,0.07)', border: '1px solid rgba(45,104,248,0.2)', borderRadius: 'var(--radius-lg)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FlaskConical size={20} color="var(--rzp-blue-bright)" />
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Razorpay Buildathon 2026 — Live Demo Tool</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Select a scenario, optionally edit amount & customer name, then fire the webhook. Watch the 5-step multi-agent pipeline execute in real-time.
          </div>
        </div>
      </div>

      {/* Trigger Cards */}
      <div className="simulator-grid">
        {TRIGGER_SCENARIOS.map(scenario => {
          const Icon = scenario.icon;
          const inp = inputs[scenario.id];
          const isActive = activeScenario === scenario.id && pipelineStatus === 'running';
          return (
            <div
              key={scenario.id}
              className="simulator-trigger-card"
              style={{ borderColor: isActive ? scenario.accentColor : undefined }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: scenario.accentColor }} />
              <div className="trigger-icon" style={{ background: scenario.accentBg, color: scenario.accentColor }}>
                <Icon size={22} />
              </div>
              <div className="trigger-title">{scenario.title}</div>
              <div className="trigger-desc">{scenario.desc}</div>
              <div className="trigger-inputs">
                <input
                  className="trigger-input"
                  type="number"
                  placeholder="Amount (₹)"
                  value={inp.amount}
                  onChange={e => setInputs(prev => ({ ...prev, [scenario.id]: { ...prev[scenario.id], amount: e.target.value } }))}
                />
                <input
                  className="trigger-input"
                  type="text"
                  placeholder="Customer name"
                  value={inp.customer}
                  onChange={e => setInputs(prev => ({ ...prev, [scenario.id]: { ...prev[scenario.id], customer: e.target.value } }))}
                />
              </div>
              <button
                id={`trigger-${scenario.id}`}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', background: `linear-gradient(135deg, ${scenario.accentColor}, var(--rzp-blue))` }}
                onClick={() => runPipeline(scenario)}
                disabled={pipelineStatus === 'running'}
              >
                <Zap size={14} />
                {isActive ? 'Executing...' : `Fire ${scenario.bank} Webhook`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Pipeline Visualization */}
      <div className="pipeline-viz">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div className="panel-title">Multi-Agent Pipeline Execution</div>
            <div className="panel-title-sub">Real-time step-by-step agent trace</div>
          </div>
          {pipelineStatus === 'done' && (
            <span className="badge badge-success" style={{ animation: 'glow-badge 2s ease-in-out infinite' }}>
              ✓ Pipeline Complete
            </span>
          )}
          {pipelineStatus === 'running' && <span className="badge badge-info">⚙ Running...</span>}
        </div>

        <div className="pipeline-steps">
          {PIPELINE_STEPS.map((step, i) => {
            const StepIcon = step.icon;
            const s = steps[step.id];
            return (
              <React.Fragment key={step.id}>
                <div className={`pipeline-step ${s.status}`}>
                  <div className={`pipeline-step-dot ${s.status}`}>
                    {s.status === 'done'
                      ? <CheckCircle size={16} color="var(--success)" />
                      : <StepIcon size={16} color={s.status === 'active' ? 'var(--rzp-blue-bright)' : 'var(--text-muted)'} />
                    }
                  </div>
                  <div className="pipeline-step-label">{step.label}</div>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className={`pipeline-connector ${steps[PIPELINE_STEPS[i + 1].id].status === 'done' ? 'done' : steps[PIPELINE_STEPS[i + 1].id].status === 'active' ? 'active' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(0,207,112,0.08)', border: '1px solid rgba(0,207,112,0.25)', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: 'var(--success)' }}
          >
            <CheckCircle size={14} style={{ display: 'inline', marginRight: 6 }} />
            {actionMessage}
          </motion.div>
        )}
      </div>

      {/* Live result feed from Supabase */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Live Agent Action Feed</div>
            <div className="panel-title-sub">Real-time recovery actions from Supabase — updates as agents execute</div>
          </div>
        </div>
        <div className="feed-list">
          <AnimatePresence initial={false}>
            {resultEvents.length === 0 && (
              <div style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>
                <MessageSquare size={24} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                Fire a webhook above to see live agent actions appear here.
              </div>
            )}
            {resultEvents.map(ev => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`feed-item ${ev.outcome === 'PAYMENT_MADE' ? 'success' : ev.outcome === 'BLOCKED' ? 'danger' : 'info'}`}
              >
                <div className="feed-item-header">
                  <span className="feed-module">{ev.module?.replace(/_/g, ' ')}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge ${ev.outcome === 'PAYMENT_MADE' ? 'badge-success' : ev.outcome === 'BLOCKED' ? 'badge-danger' : 'badge-info'}`}>{ev.outcome}</span>
                    <span className="feed-time">{ev.ts}</span>
                  </div>
                </div>
                <div className="feed-content">{ev.action?.replace(/_/g, ' ')} — {ev.reasoning}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};
