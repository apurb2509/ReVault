import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Brain } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { supabase } from '../lib/supabaseClient';

export const ThoughtTraces: React.FC = () => {
  const [traces, setTraces] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTraces = async () => {
      const { data } = await supabase.from('audit_trail').select('*').order('timestamp', { ascending: false }).limit(50);
      if (data) setTraces(data);
    };
    fetchTraces();

    const sub = supabase.channel('thought-traces')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_trail' }, fetchTraces)
      .subscribe();
      
    return () => { supabase.removeChannel(sub); };
  }, []);

  return (
    <>
      <Header title="Agent Thought Traces" subtitle='Live Audit Trail from Supabase' />

      <div style={{ marginBottom: '24px', padding: '16px 20px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Brain size={20} color="var(--purple)" />
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Every AI decision is inspectable</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Click any trace below to expand the decision log.
          </div>
        </div>
      </div>

      {traces.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No thought traces recorded yet.</div>}

      {traces.map(trace => {
        const isOpen = openId === trace.id;
        return (
          <div key={trace.id} className="trace-card">
            <div className="trace-header" onClick={() => setOpenId(isOpen ? null : trace.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{trace.actor}</span>
                    <span className="badge badge-muted">{trace.module.replace(/_/g, ' ')}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(trace.timestamp).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ChevronDown size={16} color="var(--text-muted)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="trace-body">
                    <pre className="trace-json">{JSON.stringify(trace.decision_log, null, 2)}</pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </>
  );
};
