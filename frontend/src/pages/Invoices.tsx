import React, { useState } from 'react';
import { ExternalLink, Clock } from 'lucide-react';
import { Header } from '../components/layout/Header';

interface Invoice {
  id: string;
  company: string;
  contact: string;
  amount: number;       // in paise
  due_date: string;
  days_outstanding: number;
  risk_tier: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  status: 'OUTSTANDING' | 'PTP' | 'PAID' | 'ESCALATED';
  payment_link?: string;
  timeline: string[];
}

const INVOICES: Invoice[] = [
  { id: 'INV-101', company: 'Acme Corp',        contact: 'Suresh Kumar',   amount: 4500000,  due_date: '2026-08-06', days_outstanding: 15, risk_tier: 'GREEN',  status: 'OUTSTANDING', timeline: ['Aug 06: Invoice sent', 'Aug 12: Email reminder sent', 'Aug 15: WhatsApp nudge queued'] },
  { id: 'INV-102', company: 'GlobalTech',        contact: 'Rajesh Nair',    amount: 1200000,  due_date: '2026-07-20', days_outstanding: 32, risk_tier: 'YELLOW', status: 'PTP',         timeline: ['Jul 20: Invoice sent', 'Aug 01: Reminder', 'Aug 10: WhatsApp + link', 'Aug 12: PTP captured "Will pay next week"'] },
  { id: 'INV-103', company: 'Initech',           contact: 'Pooja Sharma',   amount: 8270000,  due_date: '2026-05-18', days_outstanding: 94, risk_tier: 'RED',    status: 'ESCALATED',   timeline: ['May 18: Invoice sent', 'Jun 01: Email', 'Jun 15: WhatsApp', 'Jul 01: VoiceIQ call', 'Jul 15: PTP captured', 'Jul 20: PTP BROKEN', 'Aug 01: Escalated to human review'] },
  { id: 'INV-104', company: 'Nexgen Systems',    contact: 'Ankit Joshi',    amount: 6500000,  due_date: '2026-07-01', days_outstanding: 51, risk_tier: 'ORANGE', status: 'OUTSTANDING', timeline: ['Jul 01: Invoice sent', 'Jul 15: Email', 'Aug 01: Hinglish WhatsApp', 'Aug 10: VoiceIQ call scheduled'] },
  { id: 'INV-105', company: 'BuildFast Inc',     contact: 'Siddharth Rao',  amount: 2500000,  due_date: '2026-08-10', days_outstanding: 11, risk_tier: 'GREEN',  status: 'OUTSTANDING', timeline: ['Aug 10: Invoice sent', 'Aug 14: Polite email reminder'] },
  { id: 'INV-106', company: 'MediConnect',       contact: 'Deepa Pillai',   amount: 1750000,  due_date: '2026-07-25', days_outstanding: 27, risk_tier: 'YELLOW', status: 'PTP',         timeline: ['Jul 25: Invoice', 'Aug 05: WhatsApp', 'Aug 10: PTP: "Will pay today"', 'Aug 10: PAID — case closed'] },
  { id: 'INV-107', company: 'CloudEdge Ltd',     contact: 'Vikram Nair',    amount: 9800000,  due_date: '2026-05-30', days_outstanding: 82, risk_tier: 'ORANGE', status: 'OUTSTANDING', timeline: ['May 30: Invoice', 'Jun 15: Email', 'Jul 01: WhatsApp (Hinglish)', 'Jul 20: VoiceIQ call - voicemail'] },
  { id: 'INV-108', company: 'TechSpark',         contact: 'Meena Gupta',    amount: 3200000,  due_date: '2026-08-01', days_outstanding: 20, risk_tier: 'GREEN',  status: 'PAID',        timeline: ['Aug 01: Invoice', 'Aug 08: Reminder', 'Aug 15: Payment received ✓'] },
];

const RISK_CONFIG: Record<Invoice['risk_tier'], { label: string; cssClass: string }> = {
  GREEN:  { label: '0-30 days',  cssClass: 'risk-green'  },
  YELLOW: { label: '31-60 days', cssClass: 'risk-yellow' },
  ORANGE: { label: '61-90 days', cssClass: 'risk-orange' },
  RED:    { label: '90+ days',   cssClass: 'risk-red'    },
};

const STATUS_COLS: Invoice['status'][] = ['OUTSTANDING', 'PTP', 'PAID', 'ESCALATED'];
const COL_LABELS: Record<Invoice['status'], string> = {
  OUTSTANDING: 'Outstanding',
  PTP:         'PTP Active',
  PAID:        'Paid',
  ESCALATED:   'Escalated',
};
const COL_COLORS: Record<Invoice['status'], string> = {
  OUTSTANDING: 'var(--accent)',
  PTP:         'var(--warning)',
  PAID:        'var(--success)',
  ESCALATED:   'var(--danger)',
};

export const Invoices: React.FC = () => {
  const [selected, setSelected] = useState<Invoice | null>(null);

  return (
    <>
      <Header
        title="B2B Invoice Tracker"
        subtitle="Receivables Pursuit Agent — risk-tiered kanban view"
      />

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {Object.entries(RISK_CONFIG).map(([tier, cfg]) => (
          <span key={tier} className={`badge ${cfg.cssClass}`}>
            {tier}: {cfg.label}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Kanban board */}
        <div className="kanban-board" style={{ flex: 1 }}>
          {STATUS_COLS.map(status => {
            const col = INVOICES.filter(inv => inv.status === status);
            return (
              <div key={status} className="kanban-column">
                <div className="kanban-col-header">
                  <div className="kanban-col-title" style={{ color: COL_COLORS[status] }}>
                    {COL_LABELS[status]}
                  </div>
                  <div className="kanban-col-count">{col.length}</div>
                </div>
                {col.map(inv => {
                  const risk = RISK_CONFIG[inv.risk_tier];
                  return (
                    <div
                      key={inv.id}
                      id={`invoice-${inv.id}`}
                      className="kanban-card"
                      onClick={() => setSelected(selected?.id === inv.id ? null : inv)}
                      style={{ borderLeftColor: COL_COLORS[status], borderLeftWidth: '3px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span className="text-mono" style={{ fontSize: '11px', color: 'var(--accent-bright)' }}>{inv.id}</span>
                        <span className={`badge ${risk.cssClass}`} style={{ fontSize: '9px' }}>{inv.risk_tier}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>{inv.company}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{inv.contact}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: status === 'PAID' ? 'var(--success)' : 'var(--text-primary)' }}>
                          ₹{(inv.amount / 100).toLocaleString('en-IN')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                          <Clock size={10} />
                          {inv.days_outstanding}d
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Timeline panel */}
        {selected && (
          <div className="panel" style={{ width: '300px', flexShrink: 0 }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{selected.company}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selected.id} · {selected.contact}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              ₹{(selected.amount / 100).toLocaleString('en-IN')}
            </div>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className={`badge ${RISK_CONFIG[selected.risk_tier].cssClass}`}>{selected.risk_tier}</span>
              <span className="badge badge-muted">{selected.days_outstanding} days overdue</span>
            </div>

            <div className="divider" />
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Recovery Timeline</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selected.timeline.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', marginTop: '6px', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</div>
                </div>
              ))}
            </div>

            <div className="divider" />
            <button
              id={`create-link-${selected.id}`}
              className="btn btn-primary btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <ExternalLink size={12} /> Create Razorpay Payment Link
            </button>
          </div>
        )}
      </div>
    </>
  );
};
