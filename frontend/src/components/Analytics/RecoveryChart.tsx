import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
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

// Map backend module names to display colors
const MODULE_COLORS: Record<string, string> = {
  'DEGRADATION_WATCHDOG': '#ef4444',
  'ABANDONMENT_HUNTER': '#10b981',
  'SUBSCRIPTION_RESCUE': '#3b82f6',
  'B2B_RECEIVABLES_CHASER': '#f59e0b',
  'MANDATE_SEQUENCER': '#06b6d4',
  'VOICE_IQ': '#8b5cf6',
  'PTP_TRACKER': '#10b981',
};

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

export const ModuleBreakdownChart: React.FC = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/recovery-summary`)
      .then(r => r.json())
      .then(d => {
        const formatted = (d.modules || []).map((m: any) => ({
          module: m.module.replace(/_/g, ' '),
          recovered: m.total_recovered,
          color: MODULE_COLORS[m.module] || '#3b82f6'
        }));
        setData(formatted);
      }).catch(() => {});
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Module Breakdown</div>
          <div className="panel-title-sub">Recovery per agent (₹)</div>
        </div>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="module" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={40}
              tickFormatter={(v: number) => `₹${Math.round(v / 10000)}k`} />
            <Tooltip content={<ModuleTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="recovered" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const FailureBreakdownChart: React.FC = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/failure-breakdown`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {});
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Failure Root Cause (RCA)</div>
          <div className="panel-title-sub">AI classified breakdown</div>
        </div>
      </div>
      <div className="chart-container" style={{ display: 'flex', alignItems: 'center' }}>
        <ResponsiveContainer width="50%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="cause"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontSize: '13px' }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '100%' }}>
          {data.map(d => (
            <div key={d.cause} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                <span style={{ color: 'var(--text-secondary)' }}>{d.cause.replace(/_/g, ' ')}</span>
              </div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
