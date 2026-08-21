import React from 'react';

export const HumanInTheLoopQueue: React.FC = () => {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Human-in-the-Loop Queue</h2>
      </div>
      
      <div className="feed-list">
        <div className="feed-item danger">
          <div className="feed-time">10 mins ago</div>
          <div className="feed-module">FRAUD SUSPECTED</div>
          <div className="feed-content">
            Payment #pay_123 flagged as FRAUD_SUSPECTED. Auto-action blocked by Compliance Engine.
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }}>Review</button>
              <button className="btn" style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}>Dismiss</button>
            </div>
          </div>
        </div>
        <div className="feed-item warning">
          <div className="feed-time">1 hour ago</div>
          <div className="feed-module">BROKEN PROMISE</div>
          <div className="feed-content">
            Invoice #INV-204 from TechCorp (₹82,700). Promised Friday, payment not received.
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }}>Escalate</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
