import React, { useState, useRef, useCallback } from 'react';
import { Play, Pause, Mic, PhoneCall, PhoneMissed, Voicemail } from 'lucide-react';
import { Header } from '../components/layout/Header';

type CallOutcome = 'ANSWERED' | 'VOICEMAIL' | 'NO_ANSWER' | 'OPTED_OUT';

interface VoiceCall {
  id: string;
  customer: string;
  amount: number;       // in paise
  module: string;
  language: string;
  outcome: CallOutcome;
  duration: string;
  generated_at: string;
  failure_cause: string;
  tone: string;
  tone_reason: string;
  transcript: string;
}

const CALLS: VoiceCall[] = [
  {
    id: 'VIQ-001',
    customer: 'Priya Mehta',
    amount: 999900,
    module: 'SUBSCRIPTION_RESCUE',
    language: 'Hinglish',
    outcome: 'ANSWERED',
    duration: '0:31',
    generated_at: '14:45 IST',
    failure_cause: 'CARD_ISSUER_BLOCK',
    tone: 'WARM_EMPATHETIC',
    tone_reason: 'High-value customer, first failure, no prior defaults. Gemini selected warm tone to avoid churn.',
    transcript: '"Namaste Priya ji! Main ReVault se bol raha hoon. Aapka ₹9,999 ka subscription is mahine process nahi ho paya. Koi baat nahi — card update karna bahut simple hai. Maine aapke WhatsApp pe ek naya link bhej diya hai. Aap jab bhi convenient ho, wahan se complete kar sakte hain. Agar koi bhi problem ho toh humse seedha baat kar sakte hain. Dhanyavaad!"',
  },
  {
    id: 'VIQ-002',
    customer: 'Rahul Verma',
    amount: 499900,
    module: 'VOICEIQ_AGENT',
    language: 'Hinglish',
    outcome: 'ANSWERED',
    duration: '0:28',
    generated_at: '13:22 IST',
    failure_cause: 'INSUFFICIENT_FUNDS',
    tone: 'GENTLE_HELPFUL',
    tone_reason: 'Mid-value, second failure within 30 days. Gemini chose gentle tone — avoid pressure on funds-constrained customer.',
    transcript: '"Namaste Rahul ji! Yeh ReVault ki taraf se call hai. Aapka ₹4,999 ka payment is baar complete nahi ho paya. Hum samajhte hain ki kabhi kabhi aisi situations aati hain. Aapke liye ek flexible payment link bheja hai WhatsApp pe — aap apni convenience ke hisaab se complete kar sakte hain. Koi bhi sawaal ho toh humein batayein."',
  },
  {
    id: 'VIQ-003',
    customer: 'Vikram Nair',
    amount: 9800000,
    module: 'RECEIVABLES_PURSUIT',
    language: 'Hinglish',
    outcome: 'VOICEMAIL',
    duration: '0:35',
    generated_at: '11:05 IST',
    failure_cause: 'NO_RESPONSE',
    tone: 'FIRM_BUT_POLITE',
    tone_reason: 'B2B invoice 82 days overdue. Third contact attempt. Gemini selected firm tone as earlier gentle attempts produced no response.',
    transcript: '"Namaste Vikram ji, yeh CloudEdge Ltd ke outstanding invoice ke baare mein hai — Invoice #INV-107, ₹98,000, jo 82 din se pending hai. Aapka invoice ab Orange tier mein classify ho gaya hai. Agar aaj ya kal tak response nahi milta, toh hum formal notice aur escalation proceed karenge. Kripya aaj hi humse contact karein ya WhatsApp payment link use karein."',
  },
  {
    id: 'VIQ-004',
    customer: 'Sunita Rao',
    amount: 249900,
    module: 'SUBSCRIPTION_RESCUE',
    language: 'Hinglish',
    outcome: 'NO_ANSWER',
    duration: '0:00',
    generated_at: '09:30 IST',
    failure_cause: 'MANDATE_CANCELLED',
    tone: 'WARM_EMPATHETIC',
    tone_reason: 'Low-value, first failure. Standard warm re-mandate script generated. No answer — fallback to WhatsApp.',
    transcript: '"Namaste Sunita ji! Main ReVault se bol raha hoon. Aapka UPI mandate expire ho gaya hai jiske wajah se ₹2,499 ka debit nahi hua. Main aapke liye ek simple re-mandate link WhatsApp pe bhej deta hoon. Sirf 2 minute lagenge aur aapka subscription phir se chal jayega. Dhanyavaad!"',
  },
  {
    id: 'VIQ-005',
    customer: 'Arjun Kapoor',
    amount: 4500000,
    module: 'RECEIVABLES_PURSUIT',
    language: 'Hinglish',
    outcome: 'ANSWERED',
    duration: '0:42',
    generated_at: '10:15 IST',
    failure_cause: 'DELAYED_PAYMENT',
    tone: 'FIRM_BUT_POLITE',
    tone_reason: 'B2B Orange tier, 51 days. Gemini detected high PTP confidence in previous WhatsApp — referenced promise in script.',
    transcript: '"Namaste Arjun ji, LogiMart ke outstanding payment ke baare mein call kar raha hoon. ₹45,000 ka invoice 51 din se pending hai. Aapne pehle mention kiya tha ki Tuesday tak payment ho jayegi — hum woh arrangement yaad rakhte hain. Kya aaj update mil sakti hai? Agar convenient ho toh WhatsApp link se bhi kar sakte hain. Hum aapke saath kaam karna chahte hain."',
  },
];

const OUTCOME_CONFIG: Record<CallOutcome, { icon: React.ReactNode; badgeClass: string; label: string }> = {
  ANSWERED:  { icon: <PhoneCall  size={14} color="var(--success)" />, badgeClass: 'badge-success', label: 'Answered' },
  VOICEMAIL: { icon: <Voicemail  size={14} color="var(--warning)" />, badgeClass: 'badge-warning', label: 'Voicemail' },
  NO_ANSWER: { icon: <PhoneMissed size={14} color="var(--danger)"  />, badgeClass: 'badge-danger',  label: 'No Answer' },
  OPTED_OUT: { icon: <PhoneMissed size={14} color="var(--text-muted)" />, badgeClass: 'badge-muted', label: 'Opted Out' },
};

const WAVEFORM_BARS = 40;

// Deterministic bar heights so waveform looks natural
const BAR_HEIGHTS = Array.from({ length: WAVEFORM_BARS }, (_, i) =>
  10 + Math.abs(Math.sin(i * 0.6) * 70) + Math.abs(Math.cos(i * 1.2) * 20),
);

const VoiceWaveform: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => (
  <div className="voice-waveform">
    {BAR_HEIGHTS.map((h, i) => (
      <div
        key={i}
        className={`voice-bar${isPlaying ? ' playing' : ''}`}
        style={{
          height: `${h}%`,
          animationDelay: `${(i * 0.05) % 0.8}s`,
          animationDuration: isPlaying ? `${0.3 + (i % 4) * 0.1}s` : '2s',
        }}
      />
    ))}
  </div>
);

export const VoiceReplay: React.FC = () => {
  const [playing, setPlaying] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['VIQ-001']));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);

  const togglePlay = useCallback(async (id: string, transcript: string, customerName: string) => {
    if (playing === id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlaying(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    setLoadingAudio(id);
    try {
      const response = await fetch('http://localhost:8000/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: transcript, customer_name: customerName })
      });

      if (!response.ok) throw new Error("Synthesis failed");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.onended = () => {
        setPlaying(null);
      };
      
      audioRef.current = audio;
      await audio.play();
      setPlaying(id);
    } catch (e) {
      console.error(e);
      alert("Failed to synthesize audio. Check backend logs.");
    } finally {
      setLoadingAudio(null);
    }
  }, [playing]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Stats
  const answered  = CALLS.filter(c => c.outcome === 'ANSWERED').length;
  const totalCalls = CALLS.length;

  return (
    <>
      <Header
        title="Voice Replay Center"
        subtitle="VoiceIQ Recovery Agent — Hinglish call library with AI tone selection"
      />

      {/* Stats */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        {[
          { label: 'Total Calls', value: String(totalCalls), color: 'var(--purple)' },
          { label: 'Answered', value: String(answered), color: 'var(--success)' },
          { label: 'Answer Rate', value: `${((answered / totalCalls) * 100).toFixed(0)}%`, color: 'var(--cyan)' },
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

      {/* Call cards */}
      {CALLS.map(call => {
        const isPlaying = playing === call.id;
        const isExpanded = expanded.has(call.id);
        const outCfg = OUTCOME_CONFIG[call.outcome];

        return (
          <div key={call.id} className="voice-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{call.customer}</span>
                  <span className={`badge ${outCfg.badgeClass}`}>{outCfg.icon}{outCfg.label}</span>
                  <span className="badge badge-purple">{call.language}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {call.module.replace(/_/g, ' ')} · ₹{(call.amount / 100).toLocaleString('en-IN')} · {call.generated_at}
                  {call.duration !== '0:00' && ` · ${call.duration}`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  id={`play-${call.id}`}
                  className={`btn btn-sm ${isPlaying ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => togglePlay(call.id, call.transcript, call.customer)}
                  disabled={call.outcome === 'NO_ANSWER' || loadingAudio === call.id}
                >
                  {loadingAudio === call.id ? 'Loading...' : isPlaying ? <><Pause size={12} /> Stop</> : <><Play size={12} /> Play</>}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => toggleExpand(call.id)}
                >
                  {isExpanded ? 'Hide' : 'Transcript'}
                </button>
              </div>
            </div>

            {/* Waveform */}
            {call.outcome !== 'NO_ANSWER' && (
              <VoiceWaveform isPlaying={isPlaying} />
            )}

            {/* Gemini tone reasoning */}
            <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(139,92,246,0.08)', borderRadius: '6px', border: '1px solid rgba(139,92,246,0.15)' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Gemini Tone: {call.tone.replace(/_/g, ' ')}
              </span>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {call.tone_reason}
              </div>
            </div>

            {/* Transcript */}
            {isExpanded && (
              <div className="voice-transcript">
                {call.transcript}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
