import React from 'react';

export const Header: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  return (
    <div className="dashboard-header">
      <div>
        <h1 className="header-title">{title}</h1>
        <div className="header-subtitle">{subtitle}</div>
      </div>
      <div>
        <span className="badge badge-success" style={{ padding: '8px 12px', fontSize: '14px' }}>
          <span className="status-dot active" style={{ display: 'inline-block', marginRight: '8px' }}></span>
          System Active
        </span>
      </div>
    </div>
  );
};
