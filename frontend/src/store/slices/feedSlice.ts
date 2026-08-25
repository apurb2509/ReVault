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

const initialState: FeedState = {
  events: [],
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
