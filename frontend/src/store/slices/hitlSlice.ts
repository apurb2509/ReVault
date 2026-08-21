import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface HITLItem {
  id: string;
  type: 'FRAUD' | 'BROKEN_PTP' | 'MAX_ATTEMPTS' | 'HIGH_VALUE' | 'DISPUTE';
  title: string;
  description: string;
  amount: number;          // in paise
  event_ref: string;
  created_at: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVIEWED';
}

interface HITLState {
  items: HITLItem[];
}

const initialState: HITLState = {
  items: [
    {
      id: 'HITL-001',
      type: 'FRAUD',
      title: 'FRAUD_SUSPECTED — payment.failed',
      description: 'Payment #pay_IAmXz3kpq6 flagged as FRAUD_SUSPECTED. Auto-action blocked by Compliance Engine. Requires immediate human review.',
      amount: 399900,
      event_ref: 'evt_fraud_01',
      created_at: '10 minutes ago',
      status: 'PENDING',
    },
    {
      id: 'HITL-002',
      type: 'BROKEN_PTP',
      title: 'BROKEN PROMISE — Invoice #INV-204',
      description: 'TechCorp Solutions promised ₹82,700 by Friday. Payment not received. Automated escalation paused — awaiting human decision.',
      amount: 8270000,
      event_ref: 'PTP-001',
      created_at: '1 hour ago',
      status: 'PENDING',
    },
    {
      id: 'HITL-003',
      type: 'FRAUD',
      title: 'FRAUD_SUSPECTED — subscription.halted',
      description: 'Subscription #sub_Kp7mRn for ₹3,999/month flagged. Retry blocked. Gemini confidence: 0.97.',
      amount: 399900,
      event_ref: 'evt_fraud_02',
      created_at: '2 hours ago',
      status: 'PENDING',
    },
  ],
};

export const hitlSlice = createSlice({
  name: 'hitl',
  initialState,
  reducers: {
    updateHITLStatus: (state, action: PayloadAction<{ id: string; status: HITLItem['status'] }>) => {
      const item = state.items.find(i => i.id === action.payload.id);
      if (item) item.status = action.payload.status;
    },
  },
});

export const { updateHITLStatus } = hitlSlice.actions;
export default hitlSlice.reducer;
