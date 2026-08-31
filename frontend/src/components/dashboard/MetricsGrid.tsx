import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Target, Calendar, Shield, Cpu } from 'lucide-react';
import { useAppSelector } from '../../hooks/useStore';

interface MetricCardProps {
  label: string;
  value: string;
  trend: { label: string; up: boolean | null };
  icon: React.ReactNode;
  accentColor: string;
  iconBg: string;
  sparkData?: { amount: number }[];
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, trend, icon, accentColor, iconBg, sparkData }) => (
  <div className="metric-card">
    <div className="metric-card-accent" style={{ background: accentColor }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
        <div className={`metric-trend ${trend.up === true ? 'trend-up' : trend.up === false ? 'trend-down' : 'trend-flat'}`}>
          {trend.up === true  && <TrendingUp  size={12} />}
          {trend.up === false && <TrendingDown size={12} />}
          {trend.label}
        </div>
      </div>
      <div className="metric-icon" style={{ background: iconBg }}>{icon}</div>
    </div>
    {sparkData && (
      <div style={{ marginTop: '12px', height: '40px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData}>
            <defs>
              <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor.split(',')[0].replace('linear-gradient(135deg, ', '')} stopOpacity={0.4} />
                <stop offset="100%" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="amount"
              stroke={accentColor.split(',')[0].replace('linear-gradient(135deg, ', '')}
              strokeWidth={1.5}
              fill="none"
              dot={false}
            />
            <Tooltip contentStyle={{ display: 'none' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

export const MetricsGrid: React.FC = () => {
  const {
    recoveredAmount, atRiskRevenue, recoveryRate,
    activeCases, ptpActive, classifierAccuracy, revenueHistory,
  } = useAppSelector(state => state.metrics);

  const fmt = (p: number) => `₹${(p / 100).toLocaleString('en-IN')}`;

  return (
    <div className="metrics-grid">
      <MetricCard
        label="Recovered This Session"
        value={fmt(recoveredAmount)}
        trend={{ label: 'Session total', up: null }}
        icon={<DollarSign size={18} color="#10b981" />}
        accentColor="linear-gradient(135deg, #10b981, #06b6d4)"
        iconBg="rgba(16,185,129,0.12)"
        sparkData={revenueHistory}
      />
      <MetricCard
        label="At-Risk Revenue"
        value={fmt(atRiskRevenue)}
        trend={{ label: 'Total failed attempts', up: null }}
        icon={<AlertTriangle size={18} color="#ef4444" />}
        accentColor="linear-gradient(135deg, #ef4444, #f59e0b)"
        iconBg="rgba(239,68,68,0.12)"
      />
      <MetricCard
        label="Recovery Rate"
        value={`${recoveryRate.toFixed(1)}%`}
        trend={{ label: 'Successful / At-Risk', up: null }}
        icon={<Target size={18} color="#3b82f6" />}
        accentColor="linear-gradient(135deg, #3b82f6, #8b5cf6)"
        iconBg="rgba(59,130,246,0.12)"
      />
      <MetricCard
        label="Active Cases"
        value={String(activeCases)}
        trend={{ label: 'Across all modules', up: null }}
        icon={<Cpu size={18} color="#06b6d4" />}
        accentColor="linear-gradient(135deg, #06b6d4, #3b82f6)"
        iconBg="rgba(6,182,212,0.12)"
      />
      <MetricCard
        label="PTP Active"
        value={String(ptpActive)}
        trend={{ label: 'Promises tracked', up: null }}
        icon={<Calendar size={18} color="#f59e0b" />}
        accentColor="linear-gradient(135deg, #f59e0b, #ef4444)"
        iconBg="rgba(245,158,11,0.12)"
      />
      <MetricCard
        label="Classifier Accuracy"
        value={`${classifierAccuracy}%`}
        trend={{ label: '0 compliance violations', up: null }}
        icon={<Shield size={18} color="#8b5cf6" />}
        accentColor="linear-gradient(135deg, #8b5cf6, #06b6d4)"
        iconBg="rgba(139,92,246,0.12)"
      />
    </div>
  );
};
