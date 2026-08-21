import { configureStore } from '@reduxjs/toolkit';
import feedReducer from './slices/feedSlice';
import metricsReducer from './slices/metricsSlice';
import agentsReducer from './slices/agentsSlice';

export const store = configureStore({
  reducer: {
    feed: feedReducer,
    metrics: metricsReducer,
    agents: agentsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
