import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface FeedEvent {
  id: string;
  timestamp: string;
  module: string;
  content: string;
  type: 'success' | 'warning' | 'danger' | 'info' | 'purple';
  amount?: number;    // in paise, if applicable
  trace?: string;     // Gemini reasoning excerpt
}

interface FeedState {
  events: FeedEvent[];
}

const now = () => new Date().toLocaleTimeString('en-IN', { hour12: false });
const mins = (n: number) => new Date(Date.now() - n * 60000).toLocaleTimeString('en-IN', { hour12: false });

const initialState: FeedState = {
  events: [
    {
      id: '1',
      timestamp: now(),
      module: 'ABANDONMENT_HUNTER',
      type: 'success',
      amount: 249900,
      content: 'Order #ORD-8821 (₹2,499) abandoned 31 min ago → Classified: PAYMENT_FAILED (BANK_DOWN, conf: 0.91) → Payment link created → WhatsApp sent to +91-98XXXXXX',
      trace: 'Data: {bank: SBI, method: UPI, error: BAD_GATEWAY, order_age: 31min}\nDecision: Tier-1 WhatsApp recovery (within 30-min window)\nCompliance: ✓ 9AM-9PM window, ✓ no prior contact, ✓ not fraud-flagged',
    },
    {
      id: '2',
      timestamp: mins(5),
      module: 'DEGRADATION_WATCHDOG',
      type: 'warning',
      content: 'Detected 34% drop in SBI UPI success rate vs 24hr baseline → Gemini RCA: BANK_INFRA_DOWN (conf: 0.94) → Advisory generated → Retries on SBI UPI held for 2hrs',
      trace: 'Analyzed: 847 SBI UPI failures in last 15min\nBaseline success rate: 91.2% → Current: 57.1%\nConclusion: BANK_INFRA_DOWN. auto_action_permitted: false (infra fault)',
    },
    {
      id: '3',
      timestamp: mins(9),
      module: 'DEGRADATION_WATCHDOG',
      type: 'danger',
      content: 'FRAUD_SUSPECTED — payment #pay_IAmXz3 escalated to HITL queue. Auto-action BLOCKED by Compliance Engine. Zero recovery attempts.',
      trace: 'Gemini flagged: unusual velocity pattern, mismatched IP geolocation\nCompliance override: FRAUD_SUSPECTED → escalate, do NOT auto-contact',
    },
    {
      id: '4',
      timestamp: mins(14),
      module: 'SUBSCRIPTION_RESCUE',
      type: 'success',
      amount: 99900,
      content: 'Subscription #sub_Kp7m halted → Cause: INSUFFICIENT_FUNDS → Salary-day predictor: 1st of month → Retry scheduled → WhatsApp reminder sent',
      trace: 'Customer pay pattern: consistent debit around 3rd-5th of month\nSalary day predicted: ~1st. Retry window: Sept 1 08:30 IST',
    },
    {
      id: '5',
      timestamp: mins(22),
      module: 'VOICEIQ_AGENT',
      type: 'purple',
      amount: 999900,
      content: 'VoiceIQ call generated for Priya Mehta (₹9,999 subscription) → Hinglish script (60 words) → ElevenLabs audio → ANSWERED → Payment link sent via WhatsApp',
      trace: 'Tone selected: WARM_EMPATHETIC (high-value, first halted, no prior defaults)\nScript: "Namaste Priya ji! Aapka ₹9,999 plan..."',
    },
    {
      id: '6',
      timestamp: mins(31),
      module: 'PTP_TRACKER',
      type: 'danger',
      amount: 8270000,
      content: 'PTP BROKEN — TechCorp promised ₹82,700 by Friday. Payment not received. Risk tier elevated to RED. Escalated to HITL queue.',
    },
    {
      id: '7',
      timestamp: mins(45),
      module: 'RECEIVABLES_PURSUIT',
      type: 'info',
      amount: 1200000,
      content: 'Invoice #INV-102 (₹12,000, GlobalTech) — 32 days overdue → Risk: YELLOW → Hinglish WhatsApp sent with payment link → PTP response captured',
      trace: 'Gemini risk score: 61/100. Recommended tone: FIRM_BUT_POLITE.\nChannel: WhatsApp (customer last responded via WhatsApp, 14 days ago)',
    },
    {
      id: '8',
      timestamp: mins(60),
      module: 'MANDATE_SEQUENCER',
      type: 'success',
      amount: 79900,
      content: 'Retry #2 for sub_Mn4j: cause re-classified BANK_INFRA_DOWN → RECOVERED (bank came back online) → ₹799 debited successfully via UPI',
    },
  ],
};

export const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    addEvent: (state, action: PayloadAction<FeedEvent>) => {
      state.events.unshift(action.payload);
      // Cap at 100 events
      if (state.events.length > 100) state.events.pop();
    },
    clearFeed: (state) => { state.events = []; },
  },
});

export const { addEvent, clearFeed } = feedSlice.actions;
export default feedSlice.reducer;
