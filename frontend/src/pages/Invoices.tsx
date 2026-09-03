import React, { useState, useEffect } from 'react';
import { ExternalLink, Clock, Plus, X } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { supabase } from '../lib/supabaseClient';

interface Invoice {
  id: string;
  company: string;
  contact: string;
  amount: number;       // in paise
  due_date: string;
  days_outstanding: number;
  risk_tier: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  status: 'OUTSTANDING' | 'PTP' | 'PAID' | 'ESCALATED';
  timeline: string[];
}

const RISK_CONFIG: Record<string, { label: string; cssClass: string }> = {
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ company_name: '', contact_email: '', contact_phone: '', amount: '', due_date: '' });

  useEffect(() => {
    const fetchInvoices = async () => {
      const { data } = await supabase.from('b2b_invoices').select('*').order('created_at', { ascending: false });
      if (data) {
        const formatted = data.map(d => ({
          id: d.id,
          company: d.company_name,
          contact: d.contact_email,
          amount: d.amount,
          due_date: d.due_date,
          days_outstanding: Math.max(0, Math.floor((Date.now() - new Date(d.due_date).getTime()) / (1000 * 60 * 60 * 24))),
          risk_tier: d.risk_tier || 'GREEN',
          status: d.status || 'OUTSTANDING',
          timeline: []
        }));
        setInvoices(formatted);
      }
    };
    
    fetchInvoices();
    
    const sub = supabase
      .channel('invoices-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'b2b_invoices' }, fetchInvoices)
      .subscribe();
      
    return () => { supabase.removeChannel(sub); };
  }, []);

  useEffect(() => {
    if (selected) {
      document.body.classList.add('notification-open');
    } else {
      document.body.classList.remove('notification-open');
    }
    return () => document.body.classList.remove('notification-open');
  }, [selected]);

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('b2b_invoices').insert([{
      company_name: newInvoice.company_name,
      contact_email: newInvoice.contact_email,
      contact_phone: newInvoice.contact_phone,
      amount: parseInt(newInvoice.amount, 10),
      due_date: newInvoice.due_date,
      risk_tier: 'GREEN',
      status: 'OUTSTANDING'
    }]);
    setShowAddForm(false);
    setNewInvoice({ company_name: '', contact_email: '', contact_phone: '', amount: '', due_date: '' });
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Header title="B2B Invoice Tracker" subtitle="Receivables Pursuit Agent — live from Supabase" />
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>
          <Plus size={14} style={{ marginRight: '6px' }} /> Add Invoice
        </button>
      </div>

      {showAddForm && (
        <div className="panel" style={{ marginBottom: '20px', position: 'relative' }}>
          <button style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setShowAddForm(false)}>
            <X size={16} />
          </button>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Create New B2B Invoice</div>
          <form onSubmit={handleAddInvoice} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input required type="text" placeholder="Company Name" className="input-field" value={newInvoice.company_name} onChange={e => setNewInvoice({...newInvoice, company_name: e.target.value})} />
            <input required type="email" placeholder="Contact Email" className="input-field" value={newInvoice.contact_email} onChange={e => setNewInvoice({...newInvoice, contact_email: e.target.value})} />
            <input required type="text" placeholder="Contact Phone" className="input-field" value={newInvoice.contact_phone} onChange={e => setNewInvoice({...newInvoice, contact_phone: e.target.value})} />
            <input required type="number" placeholder="Amount (paise)" className="input-field" value={newInvoice.amount} onChange={e => setNewInvoice({...newInvoice, amount: e.target.value})} />
            <input required type="date" className="input-field" value={newInvoice.due_date} onChange={e => setNewInvoice({...newInvoice, due_date: e.target.value})} />
            <button type="submit" className="btn btn-primary btn-sm">Submit</button>
          </form>
        </div>
      )}

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
            const col = invoices.filter(inv => inv.status === status);
            return (
              <div key={status} className="kanban-column">
                <div className="kanban-col-header">
                  <div className="kanban-col-title" style={{ color: COL_COLORS[status] }}>
                    {COL_LABELS[status]}
                  </div>
                  <div className="kanban-col-count">{col.length}</div>
                </div>
                {col.map(inv => {
                  const risk = RISK_CONFIG[inv.risk_tier] || RISK_CONFIG.GREEN;
                  return (
                    <div
                      key={inv.id}
                      id={`invoice-${inv.id}`}
                      className="kanban-card"
                      onClick={() => setSelected(selected?.id === inv.id ? null : inv)}
                      style={{ borderLeftColor: COL_COLORS[status], borderLeftWidth: '3px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span className="text-mono" style={{ fontSize: '11px', color: 'var(--accent-bright)' }}>{inv.id.slice(0,8)}</span>
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

        {/* Timeline Modal */}
        {selected && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}>
            <div className="panel" style={{ width: '100%', maxWidth: '360px', position: 'relative' }}>
              <button 
                onClick={() => setSelected(null)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
              
              <div style={{ marginBottom: '16px', paddingRight: '24px' }}>
                <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '4px' }}>{selected.company}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selected.id.slice(0,8)} · {selected.contact}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                ₹{(selected.amount / 100).toLocaleString('en-IN')}
              </div>
              <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className={`badge ${RISK_CONFIG[selected.risk_tier]?.cssClass || 'badge-muted'}`}>{selected.risk_tier}</span>
                <span className="badge badge-muted">{selected.days_outstanding} days overdue</span>
              </div>

              <div className="divider" />
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Recovery Timeline</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '30vh', overflowY: 'auto' }}>
                {selected.timeline.length === 0 && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No timeline events yet.</div>}
                {selected.timeline.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', marginTop: '4px', flexShrink: 0 }} />
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</div>
                  </div>
                ))}
              </div>

              <div className="divider" style={{ marginTop: '20px' }} />
              <button
                id={`create-link-${selected.id}`}
                className="btn btn-primary btn-sm"
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                onClick={() => window.open(`/recovery?token=${selected.id}`, '_blank')}
              >
                <ExternalLink size={14} /> Create Razorpay Payment Link
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
