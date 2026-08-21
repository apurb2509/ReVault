import React, { useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { MetricsGrid } from '../components/dashboard/MetricsGrid';
import { AgentStatusPanel } from '../components/dashboard/AgentStatusPanel';
import { LiveEventFeed } from '../components/dashboard/LiveEventFeed';
import { HumanInTheLoopQueue } from '../components/dashboard/HumanInTheLoopQueue';
import { RecoveryTimelineChart, ModuleBreakdownChart } from '../components/Analytics/RecoveryChart';
import { BatchReport } from '../components/BatchReport/BatchReport';
import { VoicePlayer } from '../components/VoicePlayer/VoicePlayer';
import { B2BKanban } from '../components/dashboard/B2BKanban';
import { useAppSelector, useAppDispatch } from '../hooks/useStore';
import { fetchMetrics } from '../store/slices/metricsSlice';

export const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { recoveredAmount, atRiskRevenue, recoveryRate, activeCases, status } = useAppSelector(state => state.metrics);
  const fmt = (p: number) => `₹${(p / 100).toLocaleString('en-IN')}`;

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchMetrics());
    }
  }, [status, dispatch]);

  return (
    <>
      <Header
        title="Recovery Command Center"
        subtitle="Real-time revenue protection across all channels — 7 autonomous agents active"
      />

      {/* Live recovery banner */}
      <div className="recovery-banner">
        <div className="banner-recovered">
          <div className="banner-recovered-label">Total Recovered This Session</div>
          <div className="banner-recovered-amount">{fmt(recoveredAmount)}</div>
        </div>
        <div className="banner-stats">
          <div className="banner-stat">
            <div className="banner-stat-value">{fmt(atRiskRevenue)}</div>
            <div className="banner-stat-label">At Risk</div>
          </div>
          <div className="banner-stat">
            <div className="banner-stat-value">{recoveryRate.toFixed(1)}%</div>
            <div className="banner-stat-label">Recovery Rate</div>
          </div>
          <div className="banner-stat">
            <div className="banner-stat-value">{activeCases}</div>
            <div className="banner-stat-label">Active Cases</div>
          </div>
          <div className="banner-stat">
            <div className="banner-stat-value text-success">0</div>
            <div className="banner-stat-label">Violations</div>
          </div>
        </div>
      </div>

      <MetricsGrid />

      <AgentStatusPanel />

      {/* Main content grid */}
      <div className="content-grid" style={{ marginBottom: '24px' }}>
        <LiveEventFeed />
        <HumanInTheLoopQueue />
      </div>

      {/* Charts row */}
      <div className="grid-2">
        <RecoveryTimelineChart />
        <ModuleBreakdownChart />
      </div>

      {/* B2B Receivables Kanban */}
      <B2BKanban />
      
      {/* Batch Engine Report */}
      <BatchReport />

      {/* Voice Replay */}
      <VoicePlayer />
    </>
  );
};
