import React, { useState } from 'react';
import { Shield, Lock, Search } from 'lucide-react';
import { Header } from '../components/layout/Header';

interface AuditEntry {
  id: string;
  timestamp: string;
  module: string;
  actor: 'SYSTEM' | 'HUMAN_OVERRIDE';
  action: string;
  event_ref: string;
  status: 'EXECUTED' | 'BLOCKED' | 'ESCALATED' | 'COMPLIANCE_BLOCKED';
  decision_log: string;
}

const AUDIT: AuditEntry[] = [
  { id: 'AUD-001', timestamp: '2026-08-21 14:32:07 UTC', module: 'ABANDONMENT_HUNTER',   actor: 'SYSTEM',         action: 'WHATSAPP_TIER1_SENT',     event_ref: 'ORD-8821',  status: 'EXECUTED',          decision_log: '{"event_id":"ORD-8821","action":"SEND_WHATSAPP","compliance_passed":true,"checks":{"opted_out":false,"time_window":true,"max_attempts":true,"cooling_period":true,"fraud_flag":false,"dispute_flag":false,"daily_limit":true},"amount":249900,"link_id":"plink_Mk8pQv"}' },
  { id: 'AUD-002', timestamp: '2026-08-21 14:28:00 UTC', module: 'DEGRADATION_WATCHDOG', actor: 'SYSTEM',         action: 'FRAUD_ESCALATION_HITL',   event_ref: 'pay_IAmXz3', status: 'COMPLIANCE_BLOCKED', decision_log: '{"event_id":"pay_IAmXz3","action":"FRAUD_SUSPECTED","auto_action_blocked":true,"reason":"FRAUD_SUSPECTED_ZERO_AUTO_ACTION","escalated_to":"HITL","compliance_rule":"check_fraud_flag"}' },
  { id: 'AUD-003', timestamp: '2026-08-21 13:45:22 UTC', module: 'VOICEIQ_AGENT',         actor: 'SYSTEM',         action: 'VOICE_CALL_GENERATED',    event_ref: 'VIQ-001',   status: 'EXECUTED',          decision_log: '{"event_id":"sub_Kp7mRn","action":"VOICE_CALL","tone":"WARM_EMPATHETIC","language":"Hinglish","chars":287,"provider":"ElevenLabs","compliance_passed":true}' },
  { id: 'AUD-004', timestamp: '2026-08-21 22:31:00 UTC', module: 'MANDATE_SEQUENCER',     actor: 'SYSTEM',         action: 'SEND_WHATSAPP_BLOCKED',   event_ref: 'sub_Nx2p',  status: 'COMPLIANCE_BLOCKED', decision_log: '{"event_id":"sub_Nx2p","action":"SEND_WHATSAPP","compliance_passed":false,"blocked_by":"check_time_window","current_time":"22:31 IST","allowed_window":"09:00-21:00","trai_dlt_compliant":false}' },
  { id: 'AUD-005', timestamp: '2026-08-21 12:00:00 UTC', module: 'MANDATE_SEQUENCER',     actor: 'SYSTEM',         action: 'RETRY_AUTO_DEBIT',        event_ref: 'sub_Mn4j',  status: 'EXECUTED',          decision_log: '{"event_id":"sub_Mn4j","retry_attempt":2,"cause_reclassified":"BANK_INFRA_DOWN→TECHNICAL_TRANSIENT","result":"PAYMENT_CAPTURED","amount":79900}' },
  { id: 'AUD-006', timestamp: '2026-08-21 09:14:00 UTC', module: 'PTP_TRACKER',           actor: 'SYSTEM',         action: 'PTP_PROMISE_EXTRACTED',   event_ref: 'PTP-001',   status: 'EXECUTED',          decision_log: '{"customer_message":"Will transfer by Friday","extracted":{"commitment":true,"promised_date":"2026-08-15","confidence":"HIGH","dispute":false},"invoice_status":"PROMISED","auto_chasing":"PAUSED"}' },
  { id: 'AUD-007', timestamp: '2026-08-20 18:00:00 UTC', module: 'PTP_TRACKER',           actor: 'SYSTEM',         action: 'PTP_BROKEN_ESCALATED',    event_ref: 'PTP-001',   status: 'ESCALATED',         decision_log: '{"promised_date":"2026-08-15","payment_received":false,"action":"ESCALATE","risk_tier_change":"YELLOW→ORANGE","hitl_item":"HITL-002"}' },
  { id: 'AUD-008', timestamp: '2026-08-21 10:05:00 UTC', module: 'RECEIVABLES_PURSUIT',   actor: 'SYSTEM',         action: 'WHATSAPP_ORANGE_TIER',    event_ref: 'INV-107',   status: 'EXECUTED',          decision_log: '{"invoice":"INV-107","days_outstanding":82,"risk_tier":"ORANGE","action":"HINGLISH_WHATSAPP","gemini_risk_score":74,"tone":"FIRM_BUT_POLITE"}' },
  { id: 'AUD-009', timestamp: '2026-08-21 11:30:00 UTC', module: 'COMPLIANCE_ENGINE',     actor: 'SYSTEM',         action: 'MAX_ATTEMPTS_BLOCKED',    event_ref: 'sub_Zz9m',  status: 'COMPLIANCE_BLOCKED', decision_log: '{"event_id":"sub_Zz9m","action":"SEND_SMS","compliance_passed":false,"blocked_by":"check_max_attempts","current_attempts":3,"max_attempts":3}' },
  { id: 'AUD-010', timestamp: '2026-08-21 14:52:00 UTC', module: 'ABANDONMENT_HUNTER',   actor: 'HUMAN_OVERRIDE', action: 'MANUAL_ESCALATION',       event_ref: 'HITL-001',  status: 'ESCALATED',         decision_log: '{"actor":"human_operator_id_007","decision":"REVIEWED_AND_ESCALATED","notes":"Confirmed fraud pattern. Blocking customer from recovery flows.","hitl_item":"HITL-001"}' },
];

const STATUS_CFG: Record<AuditEntry['status'], { badgeClass: string; label: string }> = {
  EXECUTED:          { badgeClass: 'badge-success', label: 'Executed' },
  BLOCKED:           { badgeClass: 'badge-danger',  label: 'Blocked' },
  ESCALATED:         { badgeClass: 'badge-warning', label: 'Escalated' },
  COMPLIANCE_BLOCKED:{ badgeClass: 'badge-danger',  label: 'Compliance Blocked' },
};

export const AuditTrail: React.FC = () => {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = AUDIT.filter(a =>
    !search || a.module.includes(search.toUpperCase()) || a.event_ref.includes(search) || a.action.includes(search.toUpperCase()),
  );

  const toggle = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <>
      <Header
        title="Immutable Audit Trail"
        subtitle="Every agent decision, compliance check, and action — permanently logged"
      />

      {/* Info banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-lg)', marginBottom: '20px' }}>
        <Lock size={18} color="var(--accent-bright)" />
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Tamper-evident log — append-only</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Every action, block, and human override is recorded. Compliance violations: <strong style={{ color: 'var(--success)' }}>0</strong>. Fraud escalations correct: <strong>23/23</strong>.
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        {[
          { label: 'Total Events Logged', value: '10,248', color: 'var(--accent-bright)' },
          { label: 'Actions Executed',    value: '7,891',  color: 'var(--success)' },
          { label: 'Compliance Blocks',   value: '1,203',  color: 'var(--warning)' },
          { label: 'Human Overrides',     value: '154',    color: 'var(--purple)' },
        ].map(s => (
          <div key={s.label} className="metric-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Shield size={14} color={s.color} />
              <div className="metric-label">{s.label}</div>
            </div>
            <div className="metric-value" style={{ fontSize: '20px', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="filter-bar" style={{ marginBottom: '16px' }}>
        <Search size={14} color="var(--text-muted)" style={{ marginLeft: '4px' }} />
        <input
          id="audit-search"
          className="search-input"
          placeholder="Search by module, event ref, or action…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filtered.length} entries shown</span>
      </div>

      {/* Log */}
      <div className="panel" style={{ padding: '0' }}>
        {filtered.map((entry, i) => {
          const cfg = STATUS_CFG[entry.status];
          const isExpanded = expanded.has(entry.id);
          return (
            <div key={entry.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div
                style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '14px 20px', cursor: 'pointer' }}
                onClick={() => toggle(entry.id)}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: '3px' }}>
                  {entry.timestamp}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {entry.action.replace(/_/g, ' ')}
                    </span>
                    <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
                    {entry.actor === 'HUMAN_OVERRIDE' && <span className="badge badge-purple">Human Override</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    {entry.module.replace(/_/g, ' ')} · ref: {entry.event_ref}
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div style={{ padding: '0 20px 16px 20px' }}>
                  <pre style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#a3e635', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(JSON.parse(entry.decision_log), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
