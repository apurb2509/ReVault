import React from 'react';
import {
  Zap, AlertTriangle, Brain, MessageSquare, Phone,
  FileText, Calendar, Shield, CheckCircle, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';

const MODULES = [
  {
    num: 'Module 01',
    name: 'Degradation Watchdog',
    icon: <AlertTriangle size={18} color="#F0483E" />,
    color: '#F0483E',
    desc: 'Continuously polls your Razorpay payment stream. When it detects that a bank or UPI rail is degrading (e.g., SBI UPI success rate drops by 15%+), it automatically holds retries for affected payments and generates a merchant advisory — instead of bombarding customers whose bank is simply down.',
  },
  {
    num: 'Module 02',
    name: 'Abandonment Hunter',
    icon: <Zap size={18} color="#F5A623" />,
    color: '#F5A623',
    desc: 'When an order is abandoned or a payment fails, this agent kicks in within minutes. Gemini classifies the root cause (bank issue, user abandoned, card expired, etc.) and selects the right recovery action: Tier-1 WhatsApp link, Tier-2 with discount, or escalation — in that order.',
  },
  {
    num: 'Module 03',
    name: 'Subscription Rescue',
    icon: <CheckCircle size={18} color="#528EFF" />,
    color: '#528EFF',
    desc: 'Handles recurring billing failures for subscriptions and mandates. If a customer has insufficient funds, it predicts their salary date and retries then. If their card expired, it sends an update link. If a mandate was cancelled, it triggers a re-mandate flow.',
  },
  {
    num: 'Module 04',
    name: 'Receivables Pursuit (B2B)',
    icon: <FileText size={18} color="#17C8E3" />,
    color: '#17C8E3',
    desc: 'For B2B merchants with outstanding invoices. Classifies each invoice by risk tier (GREEN 0–30 days → RED 90+ days) and sequences communications: polite email → Hinglish WhatsApp → VoiceIQ call → formal notice. Never contacts if the customer has already made a Promise-to-Pay.',
  },
  {
    num: 'Module 05',
    name: 'Mandate Sequencer',
    icon: <Zap size={18} color="#9B6DFF" />,
    color: '#9B6DFF',
    desc: 'Manages retry state machines for all failed payments. Re-classifies the failure cause before each retry (bank infra may have recovered), switches payment rails if needed (UPI → Netbanking), and enforces maximum attempt limits per TRAI regulations.',
  },
  {
    num: 'Module 06',
    name: 'VoiceIQ Agent',
    icon: <Phone size={18} color="#00CF70" />,
    color: '#00CF70',
    desc: 'Generates personalised Hinglish voice recovery calls using Gemini (script generation) + ElevenLabs/gTTS (voice synthesis). The tone is dynamically selected per customer context: warm & empathetic for first-time failures, firm but polite for long-overdue B2B customers.',
  },
  {
    num: 'Module 07',
    name: 'PTP Tracker',
    icon: <Calendar size={18} color="#F5A623" />,
    color: '#F5A623',
    desc: 'Extracts Promise-to-Pay commitments from customer WhatsApp/email replies using Gemini NLP ("Will transfer by Friday"). Automatically pauses recovery actions when a promise is active, monitors the promised date, and escalates to human review if the promise is broken.',
  },
];

const FLOW_STEPS = [
  {
    icon: <AlertTriangle size={18} color="var(--rzp-blue-bright)" />,
    title: 'Step 1: Payment Event Received',
    desc: 'Razorpay sends a webhook event to ReVault — payment.failed, order.abandoned, subscription.halted, invoice.overdue, etc. This triggers the multi-agent pipeline.',
  },
  {
    icon: <Brain size={18} color="var(--rzp-blue-bright)" />,
    title: 'Step 2: Gemini Classifies Root Cause',
    desc: 'The relevant agent sends the payment data, bank codes, customer history, and failure error to Gemini 1.5 Flash. Gemini returns: root cause (e.g., INSUFFICIENT_FUNDS, BANK_INFRA_DOWN, FRAUD_SUSPECTED), confidence score, and recommended action.',
  },
  {
    icon: <Shield size={18} color="var(--rzp-blue-bright)" />,
    title: 'Step 3: Compliance Engine Validates',
    desc: 'Before ANY action is taken, a 7-check compliance engine runs: Is the customer opted out? Is it within 9AM–9PM IST (TRAI DLT)? Have we already hit the maximum contact attempts? Is there an active cooling period? Is the payment fraud-flagged or disputed? Only if all checks pass does the agent proceed.',
  },
  {
    icon: <MessageSquare size={18} color="var(--rzp-blue-bright)" />,
    title: 'Step 4: Recovery Action Executed',
    desc: 'The agent takes the compliance-cleared action: creates a Razorpay Payment Link, sends a WhatsApp message via Meta Business API, generates a VoiceIQ call, schedules a retry, or captures a PTP. All actions are logged immutably.',
  },
  {
    icon: <CheckCircle size={18} color="var(--rzp-blue-bright)" />,
    title: 'Step 5: Outcome Monitored',
    desc: 'ReVault listens for payment.captured or invoice.paid webhooks. If payment is recovered, the case is closed and the amount is credited to the recovery total. If not, the next action in the sequence is triggered (up to the maximum attempts).',
  },
  {
    icon: <Shield size={18} color="var(--rzp-blue-bright)" />,
    title: 'Step 6: Human-in-the-Loop for Edge Cases',
    desc: 'Fraud-suspected payments, broken promises, and disputed invoices are never auto-acted on. They are escalated to the HITL (Human-in-the-Loop) queue for human review — ensuring the system never does something irreversible without human oversight.',
  },
];

export const AboutReVault: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header
        title="About ReVault"
        subtitle="How the system works — a guide for new users"
      />

      {/* Hero card */}
      <div className="about-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <img src="/ReVault_logo.png" alt="ReVault Logo" style={{ width: 40, height: 40 }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800 }}>ReVault</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AI-Powered Revenue Recovery Operating System</div>
          </div>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '16px' }}>
          Razorpay merchants lose significant revenue daily to failed payments, abandoned orders, and unpaid invoices.
          ReVault is a <strong style={{ color: 'var(--text-primary)' }}>multi-agent AI system</strong> that automatically recovers
          that revenue by understanding why a payment failed, choosing the right recovery action, verifying compliance,
          and contacting customers at the right time in the right tone — without any manual work.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { label: '7 Autonomous Agents',    color: 'badge-blue' },
            { label: 'Gemini AI Classification', color: 'badge-purple' },
            { label: 'TRAI DLT Compliant',     color: 'badge-success' },
            { label: 'Hinglish VoiceIQ',       color: 'badge-info' },
            { label: 'Zero Compliance Violations', color: 'badge-success' },
          ].map(b => (
            <span key={b.label} className={`badge ${b.color}`}>{b.label}</span>
          ))}
        </div>
      </div>

      {/* Recovery Flow */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header">
          <div>
            <div className="panel-title">Recovery Flow — What Happens After a Payment Fails</div>
            <div className="panel-title-sub">Every recovery follows this 6-step sequence</div>
          </div>
        </div>
        <div className="about-flow">
          {FLOW_STEPS.map((step, i) => (
            <div key={i} className="about-step">
              <div className="about-step-icon">
                {step.icon}
              </div>
              <div className="about-step-body">
                <div className="about-step-title">{step.title}</div>
                <div className="about-step-desc">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7 Agents */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            7 Autonomous Agents — Each Does One Job
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Each agent specialises in a different recovery scenario. They run in parallel and share state via a central event store.
          </div>
        </div>
        <div className="about-modules">
          {MODULES.map(m => (
            <div key={m.num} className="about-module-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: 30, height: 30, borderRadius: '8px', background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {m.icon}
                </div>
                <div>
                  <div className="about-module-num">{m.num}</div>
                  <div className="about-module-name">{m.name}</div>
                </div>
              </div>
              <div className="about-module-desc">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance note */}
      <div style={{ padding: '16px 20px', background: 'rgba(0,207,112,0.05)', border: '1px solid rgba(0,207,112,0.18)', borderRadius: 'var(--radius-lg)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Shield size={16} color="var(--success)" />
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--success)' }}>Compliance is Non-Negotiable</div>
        </div>
        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Every action ReVault takes is gated by a 7-check compliance engine. The system will{' '}
          <strong style={{ color: 'var(--text-primary)' }}>never</strong> contact a customer who has opted out, outside 9AM–9PM IST,
          after reaching maximum contact attempts, during cooling periods, if the payment is fraud-suspected, or if the invoice is disputed.
          These rules are enforced in code, not just documented.
          <br /><br />
          Fraud-suspected payments are <strong style={{ color: 'var(--text-primary)' }}>always escalated to human review</strong> with zero automated action.
        </p>
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" id="about-goto-dashboard" onClick={() => navigate('/')}>
          Open Command Center <ArrowRight size={14} />
        </button>
        <button className="btn btn-ghost" id="about-goto-traces" onClick={() => navigate('/traces')}>
          See Agent Thought Traces
        </button>
      </div>
    </>
  );
};
