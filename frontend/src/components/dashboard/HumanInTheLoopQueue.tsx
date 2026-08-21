import React from 'react';
import { AlertTriangle, HandMetal, CheckCircle, XCircle } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../hooks/useStore';
import { updateHITLStatus, type HITLItem } from '../../store/slices/hitlSlice';

const TYPE_CONFIG: Record<HITLItem['type'], { label: string; cssClass: string; icon: React.ReactNode }> = {
  FRAUD:        { label: 'FRAUD SUSPECTED',   cssClass: 'fraud',  icon: <AlertTriangle size={14} color="var(--danger)" /> },
  BROKEN_PTP:   { label: 'BROKEN PROMISE',    cssClass: 'ptp',    icon: <HandMetal size={14} color="var(--warning)" /> },
  MAX_ATTEMPTS: { label: 'MAX ATTEMPTS HIT',  cssClass: 'ptp',    icon: <AlertTriangle size={14} color="var(--warning)" /> },
  HIGH_VALUE:   { label: 'HIGH VALUE REVIEW', cssClass: 'fraud',  icon: <AlertTriangle size={14} color="var(--danger)" /> },
  DISPUTE:      { label: 'DISPUTE RAISED',    cssClass: 'fraud',  icon: <AlertTriangle size={14} color="var(--danger)" /> },
};

export const HumanInTheLoopQueue: React.FC = () => {
  const items    = useAppSelector(state => state.hitl.items);
  const dispatch = useAppDispatch();

  const pending  = items.filter(i => i.status === 'PENDING');
  const resolved = items.filter(i => i.status !== 'PENDING');

  return (
    <div className="panel" style={{ maxHeight: '620px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <div>
          <div className="panel-title">HITL Queue</div>
          <div className="panel-title-sub">Human-in-the-Loop Approvals</div>
        </div>
        {pending.length > 0 && (
          <span className="badge badge-danger">{pending.length} Pending</span>
        )}
      </div>

      <div style={{ overflow: 'auto', flex: 1 }}>
        {pending.map(item => {
          const cfg = TYPE_CONFIG[item.type];
          return (
            <div key={item.id} className={`hitl-item ${cfg.cssClass}`}>
              <div className="hitl-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {cfg.icon}
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: item.type === 'FRAUD' ? 'var(--danger)' : 'var(--warning)' }}>
                    {cfg.label}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.created_at}</span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {item.description}
              </div>

              {item.amount > 0 && (
                <div style={{ marginTop: '6px', fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  ₹{(item.amount / 100).toLocaleString('en-IN')}
                </div>
              )}

              <div className="hitl-actions">
                <button
                  id={`hitl-approve-${item.id}`}
                  className="btn btn-success btn-sm"
                  onClick={() => dispatch(updateHITLStatus({ id: item.id, status: 'APPROVED' }))}
                >
                  <CheckCircle size={11} /> Approve
                </button>
                <button
                  id={`hitl-reject-${item.id}`}
                  className="btn btn-danger btn-sm"
                  onClick={() => dispatch(updateHITLStatus({ id: item.id, status: 'REJECTED' }))}
                >
                  <XCircle size={11} /> Reject
                </button>
                <button
                  id={`hitl-review-${item.id}`}
                  className="btn btn-ghost btn-sm"
                  onClick={() => dispatch(updateHITLStatus({ id: item.id, status: 'REVIEWED' }))}
                >
                  Mark Reviewed
                </button>
              </div>
            </div>
          );
        })}

        {resolved.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div className="nav-section-label">Resolved</div>
            {resolved.map(item => (
              <div key={item.id} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.title}</span>
                <span className={`badge ${item.status === 'APPROVED' ? 'badge-success' : item.status === 'REJECTED' ? 'badge-danger' : 'badge-muted'}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {pending.length === 0 && resolved.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">✓</div>
            <div className="empty-state-text">No items requiring review</div>
          </div>
        )}
      </div>
    </div>
  );
};
