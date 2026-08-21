import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, BookOpen, Shield, TrendingUp, Cpu } from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <div className="landing-logo-icon">
            <Zap size={18} color="white" />
          </div>
          <div className="landing-logo-text">Re<span>Vault</span></div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            id="landing-about-btn"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/about')}
          >
            <BookOpen size={13} /> How it Works
          </button>
          <button
            id="landing-enter-btn"
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/')}
          >
            Open Dashboard <ArrowRight size={13} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="landing-hero">
        <div className="landing-eyebrow">
          <Cpu size={11} />
          Multi-Agent AI · Powered by Gemini &amp; Razorpay APIs
        </div>

        <h1 className="landing-headline">
          Stop Losing Revenue to{' '}
          <span className="hl-blue">Failed Payments</span>
          <br />
          Recover Automatically with{' '}
          <span className="hl-green">AI Agents</span>
        </h1>

        <p className="landing-sub">
          ReVault is an autonomous revenue recovery OS for Razorpay merchants.
          It classifies failures with Gemini, sequences smart retries, sends
          Hinglish recovery messages, and brings missed revenue back — with{' '}
          <strong style={{ color: 'var(--text-primary)' }}>zero manual effort</strong>.
        </p>

        <div className="landing-cta-row">
          <button
            id="landing-dashboard-btn"
            className="landing-cta-primary"
            onClick={() => navigate('/')}
          >
            Open Command Center <ArrowRight size={16} />
          </button>
          <button
            id="landing-how-btn"
            className="landing-cta-secondary"
            onClick={() => navigate('/about')}
          >
            <BookOpen size={16} /> How It Works
          </button>
        </div>

        <div className="landing-stats">
          {[
            { value: '7',      label: 'Autonomous Agents' },
            { value: '87%',    label: 'Classifier Accuracy' },
            { value: '₹4.9L+', label: 'Demo Recovered' },
            { value: '0',      label: 'Compliance Violations' },
          ].map(s => (
            <div key={s.label} className="landing-stat">
              <div className="landing-stat-value">{s.value}</div>
              <div className="landing-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature strip */}
      <div style={{
        background: 'rgba(45,104,248,0.04)',
        borderTop: '1px solid rgba(45,104,248,0.12)',
        padding: '28px 40px',
        display: 'flex',
        gap: '32px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 2,
      }}>
        {[
          { icon: <TrendingUp size={18} color="var(--success)" />,         label: 'Smart Root-Cause Classification' },
          { icon: <Shield size={18} color="var(--rzp-blue-bright)" />,     label: 'Built-in Compliance Engine (TRAI DLT)' },
          { icon: <Zap size={18} color="var(--warning)" />,                label: 'Hinglish VoiceIQ Recovery Calls' },
          { icon: <Cpu size={18} color="var(--purple)" />,                 label: 'Human-in-the-Loop for Fraud & Disputes' },
        ].map(f => (
          <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {f.icon}
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
