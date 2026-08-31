import React, { useEffect, useState } from 'react';
import { Briefcase, Clock, AlertTriangle, UserCheck } from 'lucide-react';

interface ColumnProps {
  title: string;
  color: string;
  items: any[];
  icon: React.ElementType;
}

// Extracted outside B2BKanban to prevent recreation on every render
const KanbanColumn: React.FC<ColumnProps> = ({ title, color, items, icon: Icon }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 180 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: `2px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color }}>
        <Icon size={15} /> {title}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
        {items.length}
      </div>
    </div>

    {items.map(item => (
      <div key={item.id} className="kanban-card" style={{ borderLeft: `3px solid ${color}` }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{item.customer_company}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Inv: {item.invoice_number}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>₹{(item.amount / 100).toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
            Due: {item.due_date}
          </div>
        </div>
      </div>
    ))}

    {items.length === 0 && (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px' }}>
        No invoices in tier
      </div>
    )}
  </div>
);

export const B2BKanban: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/b2b-invoices')
      .then(res => res.json())
      .then(data => {
        setInvoices(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="panel" style={{ marginTop: '24px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div className="spin" style={{ width: 24, height: 24, border: '2px solid var(--rzp-blue)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px' }} />
      Loading B2B receivables pipeline...
    </div>
  );

  if (error) return (
    <div className="panel" style={{ marginTop: '24px', padding: '24px', color: 'var(--text-muted)' }}>
      Could not load B2B invoices — backend may not be running.
    </div>
  );

  const getTierItems = (tier: string) => invoices.filter(i => i.risk_tier === tier);

  return (
    <div className="panel" style={{ marginTop: '24px' }}>
      <div className="panel-header">
        <div>
          <div className="panel-title"><Briefcase size={18} style={{ display: 'inline', marginRight: '8px' }}/>B2B Receivables Chaser</div>
          <div className="panel-title-sub">Automated dunning and escalation based on days outstanding</div>
        </div>
        <span className="badge badge-info">{invoices.length} invoices</span>
      </div>

      <div style={{ padding: '0 20px 20px', display: 'flex', gap: '24px', overflowX: 'auto' }}>
        <KanbanColumn title="GREEN (≤30 Days)"  color="var(--success)" items={getTierItems('GREEN')}  icon={Clock} />
        <KanbanColumn title="YELLOW (≤60 Days)" color="var(--warning)" items={getTierItems('YELLOW')} icon={AlertTriangle} />
        <KanbanColumn title="ORANGE (≤90 Days)" color="var(--accent)"  items={getTierItems('ORANGE')} icon={UserCheck} />
        <KanbanColumn title="RED (>90 Days)"    color="var(--danger)"  items={getTierItems('RED')}    icon={AlertTriangle} />
      </div>
    </div>
  );
};
