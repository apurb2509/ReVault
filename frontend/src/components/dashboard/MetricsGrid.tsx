import React from 'react';
import { useAppSelector } from '../../hooks/useStore';

export const MetricsGrid: React.FC = () => {
  const { recoveredAmount, atRiskRevenue, recoveryRate, complianceViolations } = useAppSelector(state => state.metrics);

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-title">Recovered This Session</div>
        <div className="metric-value">₹{(recoveredAmount / 100).toLocaleString('en-IN')}</div>
        <div className="metric-trend trend-up">
          ↑ 12% vs last 24h
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-title">At-Risk Revenue Detected</div>
        <div className="metric-value">₹{(atRiskRevenue / 100).toLocaleString('en-IN')}</div>
        <div className="metric-trend trend-down">
          ↓ 5% vs last 24h
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-title">Recovery Rate</div>
        <div className="metric-value">{recoveryRate.toFixed(1)}%</div>
        <div className="metric-trend trend-up">
          ↑ 2.4% vs baseline
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-title">Compliance Violations</div>
        <div className="metric-value">{complianceViolations}</div>
        <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
          100% compliant execution
        </div>
      </div>
    </div>
  );
};
