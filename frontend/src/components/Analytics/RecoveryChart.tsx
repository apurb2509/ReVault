import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { useAppSelector } from '../../hooks/useStore';

// Custom tooltip
const RecoveryTooltip: React.FC<{ active?: boolean; payload?: any[]; label?: string }> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '10px 14px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#10b981' }}>
        ₹{(payload[0].value / 100).toLocaleString('en-IN')}
      </div>
    </div>
  );
};

export const RecoveryTimelineChart: React.FC = () => {
  const history = useAppSelector(state => state.metrics.revenueHistory);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Recovery Timeline</div>
          <div className="panel-title-sub">Recovered revenue over session (paise)</div>
        </div>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="recoveryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={40}
              tickFormatter={(v: number) => `₹${Math.round(v / 10000)}k`} />
            <Tooltip content={<RecoveryTooltip />} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#recoveryGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#10b981' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Module-level breakdown bar chart
const MODULE_DATA = [
  { module: 'Degradation', recovered: 11200000, color: '#ef4444' },
  { module: 'Abandonment', recovered: 12450000, color: '#10b981' },
  { module: 'Subscription', recovered: 18920000, color: '#3b82f6' },
  { module: 'Receivables',  recovered: 8270000,  color: '#f59e0b' },
  { module: 'Mandate',      recovered: 6540000,  color: '#06b6d4' },
  { module: 'VoiceIQ',      recovered: 10990000, color: '#8b5cf6' },
  { module: 'PTP',          recovered: 1940000,  color: '#10b981' },
];

const ModuleTooltip: React.FC<{ active?: boolean; payload?: any[]; label?: string }> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '10px 14px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: '#f0f6ff' }}>
        ₹{(payload[0].value / 100).toLocaleString('en-IN')}
      </div>
    </div>
  );
};

export const ModuleBreakdownChart: React.FC = () => (
  <div className="panel">
    <div className="panel-header">
      <div>
        <div className="panel-title">Module Breakdown</div>
        <div className="panel-title-sub">Recovery per agent (₹)</div>
      </div>
    </div>
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={MODULE_DATA} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="module" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={40}
            tickFormatter={(v: number) => `₹${Math.round(v / 10000)}k`} />
          <Tooltip content={<ModuleTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="recovered" radius={[4, 4, 0, 0]}>
            {MODULE_DATA.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);
