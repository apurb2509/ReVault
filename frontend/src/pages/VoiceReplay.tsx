import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { Header } from '../components/layout/Header';

export const VoiceReplay: React.FC = () => {
  const [calls, setCalls] = useState<any[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/voice-calls`);
        const data = await response.json();
        if (data) setCalls(data);
      } catch (err) {
        console.error('Failed to fetch voice calls:', err);
      }
    };
    fetchCalls();

    // Since voice_calls table doesn't exist, realtime updates are disabled for this view
    // Or we could listen to recovery_actions
  }, []);

  const togglePlay = (id: string, url: string) => {
    if (playing === id) {
      if (audioRef.current) audioRef.current.pause();
      setPlaying(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    
    if (url) {
      const audioUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${url}`;
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlaying(null);
      audioRef.current = audio;
      audio.play().catch(e => {
        console.error("Audio playback failed:", e);
        setPlaying(null);
      });
      setPlaying(id);
    }
  };

  const answered = calls.filter(c => c.outcome === 'ANSWERED' || c.outcome === 'GENERATED').length;
  const totalCalls = calls.length;

  return (
    <>
      <Header title="Voice Replay Center" subtitle="VoiceIQ Recovery Agent — Live from Supabase" />

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
        {[
          { label: 'Total Calls', value: String(totalCalls), color: 'var(--purple)' },
          { label: 'Generated', value: String(answered), color: 'var(--success)' },
          { label: 'Language', value: 'Hinglish', color: 'var(--accent-bright)' },
        ].map(s => (
          <div key={s.label} className="metric-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Mic size={16} color={s.color} />
              <div className="metric-label">{s.label}</div>
            </div>
            <div className="metric-value" style={{ fontSize: '22px', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {calls.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No voice calls generated yet.</div>}
      
      {calls.map(call => {
        const isPlaying = playing === call.id;

        return (
          <div key={call.id} className="voice-card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{call.customer_name || 'N/A'}</span>
                  <span className={`badge badge-success`}>{call.outcome}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Event: {call.event_id} · {new Date(call.created_at).toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className={`btn btn-sm ${isPlaying ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => togglePlay(call.id, call.audio_url)}
                  disabled={!call.audio_url}
                >
                  {isPlaying ? <><Pause size={12} /> Stop</> : <><Play size={12} /> Play</>}
                </button>
              </div>
            </div>

            <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(139,92,246,0.08)', borderRadius: '6px', border: '1px solid rgba(139,92,246,0.15)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {call.reasoning || call.script_text || call.transcript}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
