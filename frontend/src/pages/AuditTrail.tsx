import React, { useState, useEffect } from 'react';
import { Lock, Search } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { supabase } from '../lib/supabaseClient';

const STATUS_CFG: Record<string, { badgeClass: string; label: string }> = {
  EXECUTED:          { badgeClass: 'badge-success', label: 'Executed' },
  BLOCKED:           { badgeClass: 'badge-danger',  label: 'Blocked' },
  ESCALATED:         { badgeClass: 'badge-warning', label: 'Escalated' },
  COMPLIANCE_BLOCKED:{ badgeClass: 'badge-danger',  label: 'Compliance Blocked' },
  PENDING:           { badgeClass: 'badge-muted',   label: 'Pending' },
};

export const AuditTrail: React.FC = () => {
  const [audit, setAudit] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/audit-trail');
        const data = await response.json();
        if (data) setAudit(data);
      } catch (err) {
        console.error('Failed to fetch audit trail:', err);
      }
    };
    fetchAudit();

    // Keep supabase channel for realtime updates
    const sub = supabase.channel('audit-trail-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_trail' }, fetchAudit)
      .subscribe();
      
    return () => { supabase.removeChannel(sub); };
  }, []);

  const filtered = audit.filter(a =>
    !search || a.module?.includes(search.toUpperCase()) || a.event_id?.includes(search) || a.actor?.includes(search.toUpperCase()),
  );

  const toggle = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  };

  return (
    <>
      <Header
        title="Immutable Audit Trail"
        subtitle="Every agent decision, compliance check, and action — permanently logged from Supabase"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-lg)', marginBottom: '20px' }}>
        <Lock size={18} color="var(--accent-bright)" />
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Tamper-evident log — append-only</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Every action, block, and human override is recorded securely.
          </div>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: '16px' }}>
        <Search size={14} color="var(--text-muted)" style={{ marginLeft: '4px' }} />
        <input
          id="audit-search"
          className="search-input"
          placeholder="Search by module, event ref, or actor…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filtered.length} entries shown</span>
      </div>

      <div className="panel" style={{ padding: '0' }}>
        {filtered.length === 0 && <div style={{ padding: 20, color: 'var(--text-muted)' }}>No audit logs found.</div>}
        {filtered.map((entry, i) => {
          const cfg = STATUS_CFG[entry.status || 'EXECUTED'] || STATUS_CFG.EXECUTED;
          const isExpanded = expanded.has(entry.id);
          return (
            <div key={entry.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div
                style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '14px 20px', cursor: 'pointer' }}
                onClick={() => toggle(entry.id)}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: '3px' }}>
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {entry.actor}
                    </span>
                    <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    {entry.module?.replace(/_/g, ' ')} · ref: {entry.event_id || entry.action_id}
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div style={{ padding: '0 20px 16px 20px' }}>
                  <pre style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#a3e635', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(entry.decision_log || entry.compliance_log || {}, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
