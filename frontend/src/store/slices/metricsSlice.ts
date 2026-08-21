import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface MetricsState {
  recoveredAmount: number;
  atRiskRevenue: number;
  recoveryRate: number;
  complianceViolations: number;
  revenueHistory: { time: string; amount: number }[];
}

const initialState: MetricsState = {
  recoveredAmount: 493200,
  atRiskRevenue: 842750,
  recoveryRate: 58.5,
  complianceViolations: 0,
  revenueHistory: Array.from({ length: 12 }).map((_, i) => ({
    time: `${i * 2}:00`,
    amount: Math.floor(Math.random() * 50000) + 10000,
  })),
};

export const metricsSlice = createSlice({
  name: 'metrics',
  initialState,
  reducers: {
    updateMetrics: (state, action: PayloadAction<Partial<MetricsState>>) => {
      return { ...state, ...action.payload };
    },
    addRevenuePoint: (state, action: PayloadAction<{ time: string; amount: number }>) => {
      state.revenueHistory.push(action.payload);
      if (state.revenueHistory.length > 24) {
        state.revenueHistory.shift();
      }
    }
  },
});

export const { updateMetrics, addRevenuePoint } = metricsSlice.actions;
export default metricsSlice.reducer;
