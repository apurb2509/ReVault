import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface FeedEvent {
  id: string;
  timestamp: string;
  module: string;
  content: string; // Serialized content or simple string for feed
  type: 'success' | 'warning' | 'danger' | 'info';
}

interface FeedState {
  events: FeedEvent[];
}

const initialState: FeedState = {
  events: [
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      module: 'ABANDONMENT_HUNTER',
      type: 'success',
      content: 'Detected: Order #ORD123 (₹2,499) abandoned 31 min ago. Created Payment Link and sent WhatsApp to customer.',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 300000).toLocaleTimeString(),
      module: 'DEGRADATION_WATCHDOG',
      type: 'warning',
      content: 'Detected 34% drop in SBI UPI success rate. Classified as BANK_INFRA_DOWN.',
    }
  ],
};

export const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    addEvent: (state, action: PayloadAction<FeedEvent>) => {
      state.events.unshift(action.payload);
      // Keep only last 50 events in feed
      if (state.events.length > 50) {
        state.events.pop();
      }
    },
    clearFeed: (state) => {
      state.events = [];
    }
  },
});

export const { addEvent, clearFeed } = feedSlice.actions;
export default feedSlice.reducer;
