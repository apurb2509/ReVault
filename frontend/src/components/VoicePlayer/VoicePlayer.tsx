import React, { useState, useEffect } from 'react';
import { Headphones, PlayCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export const VoicePlayer: React.FC = () => {
  const [calls, setCalls] = useState<any[]>([]);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/voice-calls`);
        const data = await response.json();
        if (data && Array.isArray(data)) {
          setCalls(data.slice(0, 2)); // limit to 2 for the dashboard
        }
      } catch (err) {
        console.error('Failed to fetch voice calls:', err);
      }
    };
    fetchCalls();

    // Since voice_calls table doesn't exist natively, we omit realtime subscribe here for demo
  }, []);

  return (
    <div className="panel" style={{ marginTop: '24px' }}>
      <div className="panel-header">
        <div>
          <div className="panel-title"><Headphones size={18} style={{ display: 'inline', marginRight: '8px' }}/> Voice Replay Center (Hinglish AI)</div>
          <div className="panel-title-sub">Review generated transcripts and audio fallsbacks from the VIP and B2B flows</div>
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {calls.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No voice calls generated yet.</div>}
        {calls.map(call => (
          <div key={call.id} style={{ flex: 1, minWidth: '300px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontWeight: 600 }}>Call ID: {call.id.slice(0, 8)}</div>
              <div className={`badge badge-${call.outcome === 'GENERATED' ? 'success' : 'warning'}`}>{call.outcome}</div>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <strong>Event ID:</strong> {call.event_id}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              <strong>Customer Name:</strong> {call.customer_name || 'N/A'}
            </div>
            
            <div style={{ padding: '12px', borderLeft: '3px solid var(--accent)', background: 'rgba(0,0,0,0.3)', fontSize: '13px', fontStyle: 'italic', marginBottom: '16px' }}>
              "{call.transcript || call.script_text}"
            </div>

            {call.audio_url ? (
              <button className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => {
                const audioUrl = call.audio_url.startsWith('http') ? call.audio_url : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${call.audio_url}`;
                new Audio(audioUrl).play().catch(e => console.error("Audio playback failed:", e));
              }}>
                <PlayCircle size={16} /> Play Audio
              </button>
            ) : (
              <button className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: 0.5 }} disabled>
                <PlayCircle size={16} /> Audio Not Available
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
