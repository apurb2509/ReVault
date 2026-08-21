import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface SimulationRecord {
  id: string;
  event_type: string;
  amount: number;          // in paise
  bank: string;
  method: string;
  failure_cause: string;
  action_taken: string;
  outcome: 'RECOVERED' | 'FAILED' | 'ESCALATED' | 'PENDING';
  amount_recovered: number; // in paise
  module: string;
  confidence: number;
}

interface SimulationState {
  records: SimulationRecord[];
  isRunning: boolean;
  progress: number;         // 0–100
  totalAtRisk: number;
  totalRecovered: number;
}

// Synthetic batch — 30 records representing the 355-record batch
const SYNTHETIC_RECORDS: SimulationRecord[] = [
  { id: 'S001', event_type: 'payment.failed',       amount: 249900,  bank: 'SBI',   method: 'UPI',         failure_cause: 'BANK_INFRA_DOWN',     action_taken: 'HOLD_RETRY + MERCHANT_ADVISORY', outcome: 'PENDING',   amount_recovered: 0,      module: 'DEGRADATION_WATCHDOG',  confidence: 0.94 },
  { id: 'S002', event_type: 'order.abandoned',       amount: 249900,  bank: 'HDFC',  method: 'Card',        failure_cause: 'PAYMENT_FAILED',      action_taken: 'WHATSAPP_LINK_TIER1',           outcome: 'RECOVERED', amount_recovered: 249900, module: 'ABANDONMENT_HUNTER',    confidence: 0.91 },
  { id: 'S003', event_type: 'subscription.halted',   amount: 99900,   bank: 'ICICI', method: 'UPI',         failure_cause: 'INSUFFICIENT_FUNDS',  action_taken: 'SALARY_DAY_RETRY',              outcome: 'RECOVERED', amount_recovered: 99900,  module: 'SUBSCRIPTION_RESCUE',   confidence: 0.87 },
  { id: 'S004', event_type: 'invoice.overdue',       amount: 8270000, bank: 'N/A',   method: 'NEFT',        failure_cause: 'NO_RESPONSE',         action_taken: 'WHATSAPP_HINGLISH_ORANGE_TIER', outcome: 'PENDING',   amount_recovered: 0,      module: 'RECEIVABLES_PURSUIT',   confidence: 0.78 },
  { id: 'S005', event_type: 'payment.failed',       amount: 499900,  bank: 'Axis',  method: 'Card',        failure_cause: 'CARD_EXPIRED',        action_taken: 'CARD_UPDATE_LINK_SENT',         outcome: 'RECOVERED', amount_recovered: 499900, module: 'SUBSCRIPTION_RESCUE',   confidence: 0.96 },
  { id: 'S006', event_type: 'payment.failed',       amount: 150000,  bank: 'SBI',   method: 'UPI',         failure_cause: 'FRAUD_SUSPECTED',     action_taken: 'HUMAN_ESCALATION_HITL',         outcome: 'ESCALATED', amount_recovered: 0,      module: 'DEGRADATION_WATCHDOG',  confidence: 0.99 },
  { id: 'S007', event_type: 'order.abandoned',       amount: 179900,  bank: 'Kotak', method: 'UPI',         failure_cause: 'USER_ABANDONED',      action_taken: 'WHATSAPP_LINK_TIER2_DISCOUNT',  outcome: 'RECOVERED', amount_recovered: 179900, module: 'ABANDONMENT_HUNTER',    confidence: 0.83 },
  { id: 'S008', event_type: 'subscription.pending', amount: 59900,   bank: 'HDFC',  method: 'UPI',         failure_cause: 'UPI_LIMIT_EXCEEDED',  action_taken: 'SWITCH_TO_CARD_MANDATE',        outcome: 'FAILED',    amount_recovered: 0,      module: 'MANDATE_SEQUENCER',     confidence: 0.88 },
  { id: 'S009', event_type: 'ptp.broken',           amount: 320000,  bank: 'N/A',   method: 'Bank Transfer', failure_cause: 'BROKEN_PROMISE',   action_taken: 'IMMEDIATE_ESCALATION_HITL',     outcome: 'ESCALATED', amount_recovered: 0,      module: 'PTP_TRACKER',           confidence: 0.95 },
  { id: 'S010', event_type: 'payment.failed',       amount: 999900,  bank: 'ICICI', method: 'Card',        failure_cause: 'CARD_ISSUER_BLOCK',   action_taken: 'VOICEIQ_HINGLISH_CALL',         outcome: 'RECOVERED', amount_recovered: 999900, module: 'VOICEIQ_AGENT',         confidence: 0.82 },
  { id: 'S011', event_type: 'order.abandoned',       amount: 349900,  bank: 'Yes',   method: 'Netbanking',  failure_cause: 'GATEWAY_ROUTING',     action_taken: 'WHATSAPP_LINK_TIER1',           outcome: 'RECOVERED', amount_recovered: 349900, module: 'ABANDONMENT_HUNTER',    confidence: 0.79 },
  { id: 'S012', event_type: 'subscription.halted',   amount: 199900,  bank: 'SBI',   method: 'UPI',         failure_cause: 'INSUFFICIENT_FUNDS',  action_taken: 'SALARY_DAY_RETRY',              outcome: 'FAILED',    amount_recovered: 0,      module: 'SUBSCRIPTION_RESCUE',   confidence: 0.84 },
  { id: 'S013', event_type: 'invoice.overdue',       amount: 4500000, bank: 'N/A',   method: 'Cheque',      failure_cause: 'DELAYED_PAYMENT',     action_taken: 'PTP_CAPTURE_WHATSAPP',          outcome: 'PENDING',   amount_recovered: 0,      module: 'RECEIVABLES_PURSUIT',   confidence: 0.71 },
  { id: 'S014', event_type: 'payment.failed',       amount: 129900,  bank: 'HDFC',  method: 'UPI',         failure_cause: 'BANK_INFRA_DOWN',     action_taken: 'RETRY_AFTER_2H',                outcome: 'RECOVERED', amount_recovered: 129900, module: 'MANDATE_SEQUENCER',     confidence: 0.91 },
  { id: 'S015', event_type: 'ptp.kept',             amount: 150000,  bank: 'N/A',   method: 'NEFT',        failure_cause: 'HISTORICAL',          action_taken: 'PTP_MONITORING_AUTO_CLOSE',     outcome: 'RECOVERED', amount_recovered: 150000, module: 'PTP_TRACKER',           confidence: 1.00 },
  { id: 'S016', event_type: 'payment.failed',       amount: 89900,   bank: 'Axis',  method: 'UPI',         failure_cause: 'AUTH_FAILURE',        action_taken: 'OTP_AUTH_LINK',                 outcome: 'RECOVERED', amount_recovered: 89900,  module: 'MANDATE_SEQUENCER',     confidence: 0.86 },
  { id: 'S017', event_type: 'subscription.halted',   amount: 299900,  bank: 'Kotak', method: 'Card',        failure_cause: 'MANDATE_CANCELLED',   action_taken: 'RE_MANDATE_LINK_SENT',          outcome: 'PENDING',   amount_recovered: 0,      module: 'SUBSCRIPTION_RESCUE',   confidence: 0.73 },
  { id: 'S018', event_type: 'order.abandoned',       amount: 49900,   bank: 'SBI',   method: 'Wallet',      failure_cause: 'USER_ABANDONED',      action_taken: 'WHATSAPP_LINK_TIER3_FINAL',     outcome: 'FAILED',    amount_recovered: 0,      module: 'ABANDONMENT_HUNTER',    confidence: 0.65 },
  { id: 'S019', event_type: 'payment.failed',       amount: 159900,  bank: 'HDFC',  method: 'Card',        failure_cause: 'TECHNICAL_ERROR',     action_taken: 'RETRY_15MIN',                   outcome: 'RECOVERED', amount_recovered: 159900, module: 'MANDATE_SEQUENCER',     confidence: 0.92 },
  { id: 'S020', event_type: 'invoice.overdue',       amount: 1200000, bank: 'N/A',   method: 'Bank Transfer', failure_cause: 'NO_RESPONSE',       action_taken: 'VOICEIQ_HINGLISH_ORANGE',       outcome: 'RECOVERED', amount_recovered: 1200000,module: 'VOICEIQ_AGENT',         confidence: 0.78 },
  { id: 'S021', event_type: 'subscription.pending', amount: 79900,   bank: 'ICICI', method: 'UPI',         failure_cause: 'BANK_INFRA_DOWN',     action_taken: 'HOLD_6H_THEN_RETRY',            outcome: 'RECOVERED', amount_recovered: 79900,  module: 'MANDATE_SEQUENCER',     confidence: 0.89 },
  { id: 'S022', event_type: 'payment.failed',       amount: 399900,  bank: 'Yes',   method: 'Card',        failure_cause: 'FRAUD_SUSPECTED',     action_taken: 'HUMAN_ESCALATION_HITL',         outcome: 'ESCALATED', amount_recovered: 0,      module: 'DEGRADATION_WATCHDOG',  confidence: 0.97 },
  { id: 'S023', event_type: 'ptp.broken',           amount: 82700,   bank: 'N/A',   method: 'UPI',         failure_cause: 'BROKEN_PROMISE',      action_taken: 'RISK_FLAG_ESCALATION',          outcome: 'ESCALATED', amount_recovered: 0,      module: 'PTP_TRACKER',           confidence: 0.93 },
  { id: 'S024', event_type: 'order.abandoned',       amount: 899900,  bank: 'HDFC',  method: 'Card',        failure_cause: 'PAYMENT_FAILED',      action_taken: 'WHATSAPP_LINK_TIER1',           outcome: 'RECOVERED', amount_recovered: 899900, module: 'ABANDONMENT_HUNTER',    confidence: 0.88 },
  { id: 'S025', event_type: 'subscription.halted',   amount: 499900,  bank: 'Axis',  method: 'UPI',         failure_cause: 'INSUFFICIENT_FUNDS',  action_taken: 'VOICEIQ_HINGLISH_WINBACK',      outcome: 'RECOVERED', amount_recovered: 499900, module: 'VOICEIQ_AGENT',         confidence: 0.81 },
  { id: 'S026', event_type: 'invoice.overdue',       amount: 8500000, bank: 'N/A',   method: 'NEFT',        failure_cause: 'NO_RESPONSE',         action_taken: 'FORMAL_NOTICE_HUMAN_ESCL',      outcome: 'ESCALATED', amount_recovered: 0,      module: 'RECEIVABLES_PURSUIT',   confidence: 0.85 },
  { id: 'S027', event_type: 'payment.failed',       amount: 229900,  bank: 'SBI',   method: 'UPI',         failure_cause: 'UPI_RAIL_DEGRADED',   action_taken: 'SWITCH_TO_NETBANKING_NUDGE',    outcome: 'RECOVERED', amount_recovered: 229900, module: 'DEGRADATION_WATCHDOG',  confidence: 0.90 },
  { id: 'S028', event_type: 'subscription.pending', amount: 99900,   bank: 'Kotak', method: 'Card',        failure_cause: 'CARD_EXPIRED',        action_taken: 'CARD_UPDATE_LINK_IMMEDIATE',    outcome: 'RECOVERED', amount_recovered: 99900,  module: 'SUBSCRIPTION_RESCUE',   confidence: 0.94 },
  { id: 'S029', event_type: 'order.abandoned',       amount: 149900,  bank: 'ICICI', method: 'Netbanking',  failure_cause: 'USER_ABANDONED',      action_taken: 'WHATSAPP_LINK_TIER2',           outcome: 'FAILED',    amount_recovered: 0,      module: 'ABANDONMENT_HUNTER',    confidence: 0.70 },
  { id: 'S030', event_type: 'ptp.kept',             amount: 250000,  bank: 'N/A',   method: 'Bank Transfer', failure_cause: 'HISTORICAL',        action_taken: 'PTP_MONITORING_CLOSED',         outcome: 'RECOVERED', amount_recovered: 250000, module: 'PTP_TRACKER',           confidence: 1.00 },
];

const initialState: SimulationState = {
  records: SYNTHETIC_RECORDS,
  isRunning: false,
  progress: 100,
  totalAtRisk: SYNTHETIC_RECORDS.reduce((sum, r) => sum + r.amount, 0),
  totalRecovered: SYNTHETIC_RECORDS.filter(r => r.outcome === 'RECOVERED').reduce((sum, r) => sum + r.amount_recovered, 0),
};

export const simulationSlice = createSlice({
  name: 'simulation',
  initialState,
  reducers: {
    startSimulation: (state) => {
      state.isRunning = true;
      state.progress = 0;
    },
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },
    endSimulation: (state) => {
      state.isRunning = false;
      state.progress = 100;
    },
  },
});

export const { startSimulation, setProgress, endSimulation } = simulationSlice.actions;
export default simulationSlice.reducer;
