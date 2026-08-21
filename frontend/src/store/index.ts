import { configureStore } from '@reduxjs/toolkit';
import feedReducer       from './slices/feedSlice';
import metricsReducer    from './slices/metricsSlice';
import agentsReducer     from './slices/agentsSlice';
import simulationReducer from './slices/simulationSlice';
import ptpReducer        from './slices/ptpSlice';
import hitlReducer       from './slices/hitlSlice';

export const store = configureStore({
  reducer: {
    feed:       feedReducer,
    metrics:    metricsReducer,
    agents:     agentsReducer,
    simulation: simulationReducer,
    ptp:        ptpReducer,
    hitl:       hitlReducer,
  },
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
