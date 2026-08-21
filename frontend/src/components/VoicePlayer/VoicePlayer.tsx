import React from 'react';
import { Headphones, PlayCircle, FileText } from 'lucide-react';

export const VoicePlayer: React.FC = () => {
  return (
    <div className="panel" style={{ marginTop: '24px' }}>
      <div className="panel-header">
        <div>
          <div className="panel-title"><Headphones size={18} style={{ display: 'inline', marginRight: '8px' }}/> Voice Replay Center (Hinglish AI)</div>
          <div className="panel-title-sub">Review generated transcripts and audio fallsbacks from the VIP and B2B flows</div>
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', gap: '24px' }}>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontWeight: 600 }}>Call ID: VC-8891</div>
            <div className="badge badge-warning">VOICEMAIL</div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <strong>Trigger:</strong> VIP Cart Abandonment (₹85,000)
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            <strong>Agent Reasoning:</strong> "High value cart drop-off detected. Tone selected: Warm, urgent, helpful. Opt-out included."
          </div>
          
          <div style={{ padding: '12px', borderLeft: '3px solid var(--accent)', background: 'rgba(0,0,0,0.3)', fontSize: '13px', fontStyle: 'italic', marginBottom: '16px' }}>
            "Namaste Rahul, aapka Rs. 85,000 ka payment pending hai due to cart abandonment. Ek payment link aapke WhatsApp par bhej diya gaya hai. Agar aap callback nahi chahte, toh press 1."
          </div>

          <button className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <PlayCircle size={16} /> Play Audio (gTTS Fallback)
          </button>
        </div>

        <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontWeight: 600 }}>Call ID: VC-8892</div>
            <div className="badge badge-danger">OPTED_OUT</div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <strong>Trigger:</strong> B2B Invoice Aging (ORANGE Tier)
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            <strong>Agent Reasoning:</strong> "Invoice > 60 days outstanding. Tone selected: Firm but polite. Escalate if unanswered."
          </div>
          
          <div style={{ padding: '12px', borderLeft: '3px solid var(--accent)', background: 'rgba(0,0,0,0.3)', fontSize: '13px', fontStyle: 'italic', marginBottom: '16px' }}>
            "Namaste Acme Corp, aapka Rs. 4,50,000 ka invoice pending hai. Ek payment link aapke WhatsApp par bhej diya gaya hai. Agar aap callback nahi chahte, toh press 1."
          </div>

          <button className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: 0.5 }} disabled>
            <PlayCircle size={16} /> Audio Not Available
          </button>
        </div>
      </div>
    </div>
  );
};
