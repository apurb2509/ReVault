import React from 'react';
import { Header } from '../components/layout/Header';

export const AuditTrail: React.FC = () => {
  return (
    <>
      <Header 
        title="Immutable Audit Trail" 
        subtitle="Cryptographically verifiable log of all system actions" 
      />
      <div className="panel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="feed-item info" style={{ borderLeftColor: 'var(--accent-color)' }}>
            <div className="feed-time">2026-08-20 14:32:10 UTC</div>
            <div className="feed-module" style={{ color: 'var(--text-primary)' }}>
              COMPLIANCE ENGINE: ACTION BLOCKED
            </div>
            <div className="feed-content" style={{ fontFamily: 'monospace', marginTop: '8px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px' }}>
              {'{\n  "event_id": "evt_abc123",\n  "action": "SEND_WHATSAPP",\n  "reason": "Outside TRAI DLT 9AM-9PM window (current: 22:30 IST)"\n}'}
            </div>
          </div>
          
          <div className="feed-item success">
            <div className="feed-time">2026-08-20 14:15:00 UTC</div>
            <div className="feed-module" style={{ color: 'var(--text-primary)' }}>
              ABANDONMENT HUNTER: ACTION EXECUTED
            </div>
            <div className="feed-content" style={{ fontFamily: 'monospace', marginTop: '8px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px' }}>
              {'{\n  "event_id": "evt_xyz789",\n  "action": "WHATSAPP_SENT",\n  "tier": 1,\n  "compliance_checked": true\n}'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
