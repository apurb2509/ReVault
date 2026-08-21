import React, { useEffect, useState } from 'react';
import { Briefcase, Clock, AlertTriangle, UserCheck } from 'lucide-react';

export const B2BKanban: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/b2b-invoices')
      .then(res => res.json())
      .then(data => {
        setInvoices(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Loading B2B pipeline...</div>;

  const getTierItems = (tier: string) => invoices.filter(i => i.risk_tier === tier);

  const Column = ({ title, color, items, icon: Icon }: { title: string, color: string, items: any[], icon: any }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: `2px solid ${color}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color }}>
          <Icon size={16} /> {title}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
          {items.length}
        </div>
      </div>
      
      {items.map(item => (
        <div key={item.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px', borderLeft: `3px solid ${color}` }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{item.customer_company}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Inv: {item.invoice_number}</div>
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

  return (
    <div className="panel" style={{ marginTop: '24px' }}>
      <div className="panel-header">
        <div>
          <div className="panel-title"><Briefcase size={18} style={{ display: 'inline', marginRight: '8px' }}/> B2B Receivables Chaser</div>
          <div className="panel-title-sub">Automated dunning and escalation based on days outstanding</div>
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', gap: '24px', overflowX: 'auto' }}>
        <Column title="GREEN (≤30 Days)" color="var(--success)" items={getTierItems('GREEN')} icon={Clock} />
        <Column title="YELLOW (≤60 Days)" color="var(--warning)" items={getTierItems('YELLOW')} icon={AlertTriangle} />
        <Column title="ORANGE (≤90 Days)" color="var(--accent)" items={getTierItems('ORANGE')} icon={UserCheck} />
        <Column title="RED (>90 Days)" color="var(--danger)" items={getTierItems('RED')} icon={AlertTriangle} />
      </div>
    </div>
  );
};
