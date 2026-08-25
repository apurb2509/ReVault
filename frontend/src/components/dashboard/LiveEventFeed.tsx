import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export const LiveEventFeed: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchInitial = async () => {
      const { data } = await supabase.from('recovery_actions').select('*').order('executed_at', { ascending: false }).limit(20);
      if (data) {
        setEvents(data.map(d => ({
          id: d.id,
          timestamp: new Date(d.executed_at).toLocaleTimeString('en-IN', { hour12: false }),
          module: d.module,
          content: `Action: ${d.action_type} | Outcome: ${d.outcome}`,
          type: d.action_type === 'COMPLIANCE_BLOCKED' ? 'danger' : (d.outcome === 'PAYMENT_MADE' ? 'success' : 'info'),
          amount: d.amount_recovered,
          trace: d.agent_reasoning
        })));
      }
    };
    fetchInitial();

    const sub = supabase.channel('recovery-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recovery_actions' }, payload => {
        const d = payload.new;
        setEvents(prev => [{
          id: d.id,
          timestamp: new Date(d.executed_at).toLocaleTimeString('en-IN', { hour12: false }),
          module: d.module,
          content: `Action: ${d.action_type} | Outcome: ${d.outcome}`,
          type: d.action_type === 'COMPLIANCE_BLOCKED' ? 'danger' : (d.outcome === 'PAYMENT_MADE' ? 'success' : 'info'),
          amount: d.amount_recovered,
          trace: d.agent_reasoning
        }, ...prev].slice(0, 100));
      })
      .subscribe();
      
    return () => { supabase.removeChannel(sub); };
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Real-time Event Feed</div>
          <div className="panel-title-sub">Live agent actions via Supabase Realtime</div>
        </div>
      </div>

      <div className="feed-list">
        <AnimatePresence initial={false}>
          {events.length === 0 && <div style={{ padding: '20px', color: 'var(--text-muted)' }}>No live events yet.</div>}
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
