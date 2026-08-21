import React from 'react';
import { Header } from '../components/layout/Header';
import { MetricsGrid } from '../components/dashboard/MetricsGrid';
import { AgentStatusPanel } from '../components/dashboard/AgentStatusPanel';
import { LiveEventFeed } from '../components/dashboard/LiveEventFeed';
import { HumanInTheLoopQueue } from '../components/dashboard/HumanInTheLoopQueue';

export const Dashboard: React.FC = () => {
  return (
    <>
      <Header 
        title="Recovery Command Center" 
        subtitle="Real-time revenue protection across all channels" 
      />
      
      <MetricsGrid />
      <AgentStatusPanel />
      
      <div className="content-grid">
        <LiveEventFeed />
        <HumanInTheLoopQueue />
      </div>
    </>
  );
};
