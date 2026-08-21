import React, { useState } from 'react';
import { Save, Settings2 } from 'lucide-react';
import { Header } from '../components/layout/Header';

interface Config {
  max_recovery_attempts: number;
  cooling_period_hours: number;
  contact_start_hour: number;
  contact_end_hour: number;
  allow_discount_offers: boolean;
  discount_percent: number;
  whatsapp_enabled: boolean;
  voice_enabled: boolean;
  email_enabled: boolean;
  b2b_mode: boolean;
}

const DEFAULT_CONFIG: Config = {
  max_recovery_attempts: 3,
  cooling_period_hours: 24,
  contact_start_hour: 9,
  contact_end_hour: 21,
  allow_discount_offers: false,
  discount_percent: 5.0,
  whatsapp_enabled: true,
  voice_enabled: false,
  email_enabled: true,
  b2b_mode: false,
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; id: string }> = ({ checked, onChange, id }) => (
  <label htmlFor={id} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
    <div
      id={id}
      onClick={() => onChange(!checked)}
      style={{
        width: '40px', height: '22px', borderRadius: '11px',
        background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
        position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
      }}
    >
      <div style={{
        position: 'absolute', top: '3px',
        left: checked ? '21px' : '3px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: 'white', transition: 'left 0.2s',
      }} />
    </div>
  </label>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="panel" style={{ marginBottom: '20px' }}>
    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-default)' }}>
      {title}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {children}
    </div>
  </div>
);

const Row: React.FC<{ label: string; description: string; children: React.ReactNode }> = ({ label, description, children }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{description}</div>
    </div>
    {children}
  </div>
);

export const ConfigPanel: React.FC = () => {
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof Config>(k: K, v: Config[K]) => {
    setCfg(prev => ({ ...prev, [k]: v }));
    setSaved(false);
  };

  const handleSave = () => {
    // In production: POST /api/config with cfg
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <Header
        title="Configuration"
        subtitle="Merchant compliance settings — all guardrails enforced at code level"
      />

      {/* Compliance rules banner */}
      <div style={{ padding: '14px 20px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-lg)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Settings2 size={18} color="var(--success)" />
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Compliance guardrails (opt-out, fraud flag, TRAI DLT 9AM-9PM window) are <strong style={{ color: 'var(--success)' }}>always enforced</strong> regardless of merchant config. These settings add additional merchant-specific constraints.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <Section title="Recovery Limits">
            <Row label="Max Recovery Attempts" description="Per failed payment event (absolute ceiling: 3)">
              <input
                id="cfg-max-attempts"
                type="number" min={1} max={3}
                value={cfg.max_recovery_attempts}
                onChange={e => set('max_recovery_attempts', Number(e.target.value))}
                style={{ width: '64px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', padding: '6px 10px', fontFamily: 'var(--font-sans)' }}
              />
            </Row>
            <Row label="Cooling Period (hours)" description="Minimum gap between contacts per customer">
              <input
                id="cfg-cooling"
                type="number" min={1} max={72}
                value={cfg.cooling_period_hours}
                onChange={e => set('cooling_period_hours', Number(e.target.value))}
                style={{ width: '64px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', padding: '6px 10px', fontFamily: 'var(--font-sans)' }}
              />
            </Row>
            <Row label="Contact Window Start (hour IST)" description="Earliest hour to contact customers">
              <input
                id="cfg-start-hour"
                type="number" min={8} max={12}
                value={cfg.contact_start_hour}
                onChange={e => set('contact_start_hour', Number(e.target.value))}
                style={{ width: '64px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', padding: '6px 10px', fontFamily: 'var(--font-sans)' }}
              />
            </Row>
            <Row label="Contact Window End (hour IST)" description="Latest hour to contact customers (max 21 per TRAI)">
              <input
                id="cfg-end-hour"
                type="number" min={18} max={21}
                value={cfg.contact_end_hour}
                onChange={e => set('contact_end_hour', Number(e.target.value))}
                style={{ width: '64px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', padding: '6px 10px', fontFamily: 'var(--font-sans)' }}
              />
            </Row>
          </Section>

          <Section title="Discount Offers">
            <Row label="Allow Discount Offers" description="Enable Tier-2 WhatsApp recovery with limited discount">
              <Toggle id="cfg-discount-toggle" checked={cfg.allow_discount_offers} onChange={v => set('allow_discount_offers', v)} />
            </Row>
            {cfg.allow_discount_offers && (
              <Row label="Discount %" description="Percentage offered in Tier-2 recovery (max 15%)">
                <input
                  id="cfg-discount-pct"
                  type="number" min={1} max={15} step={0.5}
                  value={cfg.discount_percent}
                  onChange={e => set('discount_percent', Number(e.target.value))}
                  style={{ width: '64px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', padding: '6px 10px', fontFamily: 'var(--font-sans)' }}
                />
              </Row>
            )}
          </Section>
        </div>

        <div>
          <Section title="Recovery Channels">
            <Row label="WhatsApp (Meta Business API)" description="WhatsApp Business Cloud API integration">
              <Toggle id="cfg-whatsapp" checked={cfg.whatsapp_enabled} onChange={v => set('whatsapp_enabled', v)} />
            </Row>
            <Row label="Email (SendGrid)" description="SendGrid email recovery — 100 emails/day free">
              <Toggle id="cfg-email" checked={cfg.email_enabled} onChange={v => set('email_enabled', v)} />
            </Row>
            <Row label="VoiceIQ Calls (ElevenLabs/gTTS)" description="Hinglish voice recovery — requires voice_enabled: true">
              <Toggle id="cfg-voice" checked={cfg.voice_enabled} onChange={v => set('voice_enabled', v)} />
            </Row>
          </Section>

          <Section title="Mode">
            <Row label="B2B Mode" description="Activates Receivables Pursuit Agent and PTP Tracker for B2B invoice recovery">
              <Toggle id="cfg-b2b" checked={cfg.b2b_mode} onChange={v => set('b2b_mode', v)} />
            </Row>
          </Section>

          {/* Config preview */}
          <div className="panel" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Config Preview (will POST to /api/config)</div>
            <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#a3e635', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(cfg, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <button
        id="save-config-btn"
        className="btn btn-primary"
        style={{ marginTop: '8px' }}
        onClick={handleSave}
      >
        <Save size={14} />
        {saved ? 'Saved ✓' : 'Save Configuration'}
      </button>
    </>
  );
};
