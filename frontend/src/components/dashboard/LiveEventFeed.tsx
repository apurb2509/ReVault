import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Play, RefreshCw } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../hooks/useStore';
import { addEvent, type FeedEvent } from '../../store/slices/feedSlice';
import { incrementRecovered } from '../../store/slices/metricsSlice';
import { updateAgentStatus } from '../../store/slices/agentsSlice';

// Synthetic events injected during "Run Simulation"
const SIM_EVENTS: Omit<FeedEvent, 'id' | 'timestamp'>[] = [
  { module: 'ABANDONMENT_HUNTER',  type: 'success', amount: 349900, content: 'Order #ORD-9104 (₹3,499) recovered → Tier-1 WhatsApp sent → Link opened → Payment ₹3,499 captured via UPI.' },
  { module: 'DEGRADATION_WATCHDOG',type: 'warning',            content: 'HDFC Card issuer block detected (conf: 0.88). Switching affected merchants to UPI nudge.' },
  { module: 'SUBSCRIPTION_RESCUE', type: 'success', amount: 49900, content: 'sub_Nx2p card updated → Subscription reactivated → ₹499 recovered.' },
  { module: 'PTP_TRACKER',         type: 'danger',             content: 'PTP BROKEN — LogiMart (₹9,800) missed deadline. Risk tier: RED. Escalated to HITL.' },
  { module: 'VOICEIQ_AGENT',       type: 'purple',  amount: 499900, content: 'Hinglish VoiceIQ call ANSWERED → Customer confirmed payment → ₹4,999 recovered.' },
  { module: 'MANDATE_SEQUENCER',   type: 'success', amount: 79900, content: 'Retry #1 for sub_Pk7: BANK_INFRA_DOWN resolved → Re-classified → ₹799 debit SUCCESS.' },
  { module: 'RECEIVABLES_PURSUIT', type: 'info',               content: 'Invoice #INV-207 — PTP captured: "Will transfer by Thursday." Case PAUSED. Auto-chasing stopped.' },
];

export const LiveEventFeed: React.FC = () => {
  const events   = useAppSelector(state => state.feed.events);
  const dispatch = useAppDispatch();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [simRunning, setSimRunning] = useState(false);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const runSimulation = useCallback(async () => {
    setSimRunning(true);
    dispatch(updateAgentStatus({ id: '2', status: 'processing' }));

    for (const [i, evt] of SIM_EVENTS.entries()) {
      await new Promise(res => setTimeout(res, 900 + i * 400));
      dispatch(addEvent({
        ...evt,
        id: `sim-${Date.now()}-${i}`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
      }));
      if (evt.amount) dispatch(incrementRecovered(evt.amount));
    }

    dispatch(updateAgentStatus({ id: '2', status: 'active' }));
    setSimRunning(false);
  }, [dispatch]);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Real-time Event Feed</div>
          <div className="panel-title-sub">Live agent actions via WebSocket</div>
        </div>
        <button
          id="run-simulation-btn"
          className="btn btn-primary btn-sm"
          onClick={runSimulation}
          disabled={simRunning}
        >
          {simRunning ? <><RefreshCw size={12} className="spin" /> Running...</> : <><Play size={12} /> Run Simulation</>}
        </button>
      </div>

      <div className="feed-list">
        <AnimatePresence initial={false}>
          {events.map(event => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className={`feed-item ${event.type}${expanded.has(event.id) ? ' expanded' : ''}`}
              onClick={() => event.trace && toggleExpand(event.id)}
            >
              <div className="feed-item-header">
                <span className="feed-module">{event.module.replace(/_/g, ' ')}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {event.amount && (
                    <span className="feed-amount">₹{(event.amount / 100).toLocaleString('en-IN')}</span>
                  )}
                  <span className="feed-time">{event.timestamp}</span>
                  {event.trace && (
                    <ChevronDown
                      size={12}
                      style={{ color: 'var(--text-muted)', transform: expanded.has(event.id) ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
                    />
                  )}
                </div>
              </div>
              <div className="feed-content">{event.content}</div>
              {event.trace && expanded.has(event.id) && (
                <div className="feed-trace">{event.trace}</div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
