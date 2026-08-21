import React from 'react';
import { useAppSelector } from '../../hooks/useStore';
import { Activity, Search, CheckCircle, FileText, Settings, Phone, MessageSquare } from 'lucide-react';

const icons = {
  '1': <Activity size={20} />,
  '2': <Search size={20} />,
  '3': <CheckCircle size={20} />,
  '4': <FileText size={20} />,
  '5': <Settings size={20} />,
  '6': <Phone size={20} />,
  '7': <MessageSquare size={20} />
};

export const AgentStatusPanel: React.FC = () => {
  const agents = useAppSelector(state => state.agents.agents);

  return (
    <>
      <h2 className="panel-title" style={{ marginBottom: '16px' }}>Active Agents</h2>
      <div className="agent-cards">
        {Object.values(agents).map(agent => (
          <div className="agent-card" key={agent.id}>
            <div className="agent-icon">{icons[agent.id as keyof typeof icons]}</div>
            <div className="agent-info">
              <div className="agent-name">{agent.name}</div>
              <div className="agent-status">
                <div className={`status-dot ${agent.status}`}></div>
                <span style={{ textTransform: 'capitalize' }}>{agent.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
