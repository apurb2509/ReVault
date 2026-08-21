import React from 'react';
import { Activity, Search, CheckCircle, FileText, Settings, Phone, MessageSquare } from 'lucide-react';
import { useAppSelector } from '../../hooks/useStore';
import type { AgentStatus } from '../../store/slices/agentsSlice';

const AGENT_ICONS: Record<string, React.ReactNode> = {
  '1': <Activity size={16} />,
  '2': <Search size={16} />,
  '3': <CheckCircle size={16} />,
  '4': <FileText size={16} />,
  '5': <Settings size={16} />,
  '6': <Phone size={16} />,
  '7': <MessageSquare size={16} />,
};

const AGENT_COLORS: Record<string, string> = {
  '1': '#ef4444',
  '2': '#10b981',
  '3': '#3b82f6',
  '4': '#f59e0b',
  '5': '#06b6d4',
  '6': '#8b5cf6',
  '7': '#10b981',
};

const AGENT_RECOVERED: Record<string, number> = {
  '1': 11200000,
  '2': 12450000,
  '3': 18920000,
  '4': 8270000,
  '5': 6540000,
  '6': 10990000,
  '7': 1940000,
};

const STATUS_LABEL: Record<AgentStatus, string> = {
  active: 'Active',
  idle: 'Idle',
  processing: 'Processing',
};

export const AgentStatusPanel: React.FC = () => {
  const agents = useAppSelector(state => state.agents.agents);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          7 Autonomous Agents
        </h2>
        <span className="badge badge-success">All Systems Go</span>
      </div>
      <div className="agent-cards">
        {Object.values(agents).map(agent => {
          const color = AGENT_COLORS[agent.id];
          const recovered = AGENT_RECOVERED[agent.id] ?? 0;
          return (
            <div className="agent-card" key={agent.id}>
              <div className="agent-card-top">
                <div className="agent-icon" style={{ background: `${color}18`, color }}>
                  {AGENT_ICONS[agent.id]}
                </div>
                <div className={`status-dot ${agent.status}`} />
              </div>
              <div className="agent-name">{agent.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {STATUS_LABEL[agent.status]}
                </span>
                <span className="agent-recovered" style={{ color }}>
                  ₹{(recovered / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
