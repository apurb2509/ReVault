import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, MessageSquare, Mail, Phone, X, ExternalLink, ChevronRight } from 'lucide-react';
import { Header } from '../components/layout/Header';

interface Campaign {
  id: string;
  module: string;
  action_type: string;
  outcome: string;
  amount_recovered: number;
  agent_reasoning: string;
  executed_at: string;
}

const OUTCOME_BADGE: Record<string, string> = {
  PAYMENT_MADE:       'badge-success',
  PENDING:            'badge-info',
  RETRY_SCHEDULED:    'badge-warning',
  BLOCKED:            'badge-danger',
  ESCALATED:          'badge-warning',
  COMPLIANCE_BLOCKED: 'badge-danger',
};

const MODULE_CHANNEL: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  ABANDONMENT_HUNTER:   { icon: <MessageSquare size={14} />, label: 'WhatsApp', color: '#25D366' },
  SUBSCRIPTION_RESCUE:  { icon: <Mail size={14} />,          label: 'Email',    color: '#4A9EFF' },
  VOICE_IQ:             { icon: <Phone size={14} />,         label: 'Voice',    color: 'var(--purple)' },
  B2B_CHASER:           { icon: <MessageSquare size={14} />, label: 'WhatsApp', color: '#25D366' },
  RECEIVABLES_PURSUIT:  { icon: <Mail size={14} />,          label: 'Email',    color: '#4A9EFF' },
};

const buildWhatsAppMessage = (campaign: Campaign): string => {
  const reasoning = campaign.agent_reasoning ? (() => { try { return JSON.parse(campaign.agent_reasoning); } catch { return {}; } })() : {};
  const customer = reasoning.customer_name || 'Valued Customer';
  const amount = reasoning.amount ? `₹${(reasoning.amount / 100).toLocaleString('en-IN')}` : 'your payment';
  return `Namaste ${customer}! 🙏\n\n${amount} ka payment fail ho gaya hai. Kripya ek baar retry karein — hum aapki help karne ke liye yahaan hain.\n\nPayment link: https://rzp.io/l/recovery-demo\n\nKoi samasya ho toh reply karein.\n\n— ReVault Recovery Team`;
};

const buildEmailBody = (campaign: Campaign): { subject: string; body: string } => {
  const reasoning = campaign.agent_reasoning ? (() => { try { return JSON.parse(campaign.agent_reasoning); } catch { return {}; } })() : {};
  const customer = reasoning.customer_name || 'Customer';
  const amount = reasoning.amount ? `₹${(reasoning.amount / 100).toLocaleString('en-IN')}` : 'your payment';
  return {
    subject: `Action Required: ${amount} payment failed — recover now`,
    body: `Dear ${customer},\n\nWe noticed your recent payment of ${amount} was unsuccessful. Don't worry — it happens!\n\nPlease click the secure link below to retry your payment:\n\nhttps://rzp.io/l/recovery-demo\n\nThis link is valid for 48 hours. If you have any questions, simply reply to this email.\n\nWarm regards,\nReVault Recovery Engine`,
  };
};

const TIMELINE_STAGES = [
  { label: 'Failure Detected',      status: 'done' },
  { label: 'AI Classified',         status: 'done' },
  { label: 'Compliance Checked',    status: 'done' },
  { label: 'Outreach Sent',         status: 'done' },
  { label: 'Awaiting Response',     status: 'active' },
  { label: 'Payment / Escalation',  status: 'pending' },
];

export const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [previewTab, setPreviewTab] = useState<'whatsapp' | 'email' | 'timeline'>('whatsapp');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetch('http://localhost:8000/api/campaigns')
      .then(res => res.json())
      .then((data: Campaign[]) => {
        setCampaigns(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? campaigns : campaigns.filter(c => c.outcome === filter);
  const whatsappMsg = selected ? buildWhatsAppMessage(selected) : '';
  const emailContent = selected ? buildEmailBody(selected) : { subject: '', body: '' };

  return (
    <>
      <Header
        title="Campaigns Management"
        subtitle="Active and completed dunning recovery campaigns — WhatsApp, Email & Voice outreach"
      />

      {/* Summary stats */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        {[
          { label: 'Total Campaigns',  value: String(campaigns.length),                                    color: 'var(--rzp-blue-bright)' },
          { label: 'Recovered',        value: String(campaigns.filter(c => c.outcome === 'PAYMENT_MADE').length), color: 'var(--success)' },
          { label: 'Pending',          value: String(campaigns.filter(c => c.outcome === 'PENDING').length),      color: 'var(--warning)' },
          { label: 'Blocked',          value: String(campaigns.filter(c => c.outcome === 'COMPLIANCE_BLOCKED' || c.outcome === 'BLOCKED').length), color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} className="metric-card">
            <div className="metric-label">{s.label}</div>
            <div className="metric-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: '16px' }}>
        {['ALL', 'PAYMENT_MADE', 'PENDING', 'RETRY_SCHEDULED', 'COMPLIANCE_BLOCKED'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
          >
            {f.replace(/_/g, ' ')}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>{filtered.length} campaigns</span>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Campaigns table */}
        <div className="panel" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
          {loading && <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading campaigns...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Megaphone size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
              No campaigns found. Run the backend to process payments.
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="campaign-table">
                <thead>
                  <tr>
                    <th>Campaign ID</th>
                    <th>Channel</th>
                    <th>Module</th>
                    <th>Action</th>
                    <th>Outcome</th>
                    <th>Recovered</th>
                    <th>Time</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const ch = MODULE_CHANNEL[c.module] || { icon: <MessageSquare size={14} />, label: 'Outreach', color: 'var(--text-muted)' };
                    const badgeClass = OUTCOME_BADGE[c.outcome] || 'badge-muted';
                    return (
                      <tr key={c.id} onClick={() => { setSelected(c); setPreviewTab('whatsapp'); }}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-bright)' }}>{c.id.slice(0, 8)}</td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: ch.color }}>
                            {ch.icon} {ch.label}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.module.replace(/_/g, ' ')}</td>
                        <td>{c.action_type.replace(/_/g, ' ')}</td>
                        <td><span className={`badge ${badgeClass}`}>{c.outcome.replace(/_/g, ' ')}</span></td>
                        <td style={{ color: 'var(--success)', fontWeight: 700 }}>
                          {c.amount_recovered > 0 ? `₹${(c.amount_recovered / 100).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                          {new Date(c.executed_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                        </td>
                        <td>
                          <ChevronRight size={14} color="var(--text-muted)" style={{ transform: selected?.id === c.id ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="panel"
              style={{ width: '360px', flexShrink: 0, padding: 0, overflow: 'hidden' }}
            >
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Campaign Preview</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{selected.id.slice(0, 12)}…</div>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSelected(null)}>
                  <X size={16} />
                </button>
              </div>

              {/* Tab selector */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)' }}>
                {(['whatsapp', 'email', 'timeline'] as const).map(tab => (
                  <button
                    key={tab}
                    style={{
                      flex: 1, padding: '10px 4px', border: 'none', background: 'none', cursor: 'pointer',
                      color: previewTab === tab ? 'var(--rzp-blue-bright)' : 'var(--text-muted)',
                      fontWeight: previewTab === tab ? 700 : 400, fontSize: '12px',
                      borderBottom: previewTab === tab ? '2px solid var(--rzp-blue)' : '2px solid transparent',
                      fontFamily: 'var(--font-sans)',
                    }}
                    onClick={() => setPreviewTab(tab)}
                  >
                    {tab === 'whatsapp' ? '💬 WhatsApp' : tab === 'email' ? '✉️ Email' : '📋 Timeline'}
                  </button>
                ))}
              </div>

              <div style={{ padding: '16px' }}>
                {previewTab === 'whatsapp' && (
                  <div className="whatsapp-preview">
                    <div className="whatsapp-header">
                      <div className="whatsapp-avatar">R</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#E9EDF0' }}>ReVault Recovery</div>
                        <div style={{ fontSize: '10px', color: '#8696A0' }}>Official WhatsApp Business</div>
                      </div>
                    </div>
                    <div className="whatsapp-bubble">{whatsappMsg}</div>
                    <div className="whatsapp-time">Delivered ✓✓</div>
                  </div>
                )}

                {previewTab === 'email' && (
                  <div className="email-preview">
                    <div className="email-header-bar">
                      <div className="email-field">To: <span>customer@example.com</span></div>
                      <div className="email-field">From: <span>recovery@revault.ai</span></div>
                      <div className="email-field">Subject: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emailContent.subject}</span></div>
                    </div>
                    <div className="email-body" style={{ whiteSpace: 'pre-line' }}>{emailContent.body}</div>
                    <div className="email-cta-btn">Retry Payment →</div>
                  </div>
                )}

                {previewTab === 'timeline' && (
                  <div>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{selected.module.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(selected.executed_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="campaign-timeline">
                      {TIMELINE_STAGES.map((stage, i) => (
                        <div key={i} className={`campaign-timeline-item ${stage.status}`}>
                          <div className="campaign-tl-label">{stage.label}</div>
                          <div className="campaign-tl-time">
                            {stage.status === 'done' ? '✓ Completed' : stage.status === 'active' ? 'In Progress...' : 'Waiting'}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
                    >
                      <ExternalLink size={12} /> Create New Payment Link
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
