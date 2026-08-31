import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

export const fetchMetrics = createAsyncThunk('metrics/fetchMetrics', async () => {
  const response = await fetch('http://localhost:8000/api/metrics');
  if (!response.ok) throw new Error('Failed to fetch metrics');
  return response.json();
});

interface MetricsState {
  recoveredAmount: number;
  atRiskRevenue: number;
  recoveryRate: number;
  complianceViolations: number;
  activeCases: number;
  ptpActive: number;
  b2bActive: number;
  classifierAccuracy: number;
  revenueHistory: { time: string; amount: number }[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: MetricsState = {
  recoveredAmount: 0,
  atRiskRevenue: 0,
  recoveryRate: 0,
  complianceViolations: 0,
  activeCases: 0,
  ptpActive: 0,
  b2bActive: 0,
  classifierAccuracy: 0,
  revenueHistory: [],
  status: 'idle',
};

export const metricsSlice = createSlice({
  name: 'metrics',
  initialState,
  reducers: {
    updateMetrics: (state, action: PayloadAction<Partial<MetricsState>>) => ({
      ...state, ...action.payload,
    }),
    addRevenuePoint: (state, action: PayloadAction<{ time: string; amount: number }>) => {
      state.revenueHistory.push(action.payload);
      if (state.revenueHistory.length > 24) state.revenueHistory.shift();
    },
    incrementRecovered: (state, action: PayloadAction<number>) => {
      state.recoveredAmount += action.payload;
      state.recoveryRate = state.atRiskRevenue > 0 
        ? parseFloat(((state.recoveredAmount / state.atRiskRevenue) * 100).toFixed(1)) 
        : 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMetrics.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.recoveredAmount = action.payload.recoveredAmount;
        state.atRiskRevenue = action.payload.atRiskRevenue;
        state.recoveryRate = action.payload.recoveryRate;
        state.complianceViolations = action.payload.complianceViolations;
        state.activeCases = action.payload.activeCases;
        state.ptpActive = action.payload.ptpActive;
        state.b2bActive = action.payload.b2bActive;
        state.classifierAccuracy = action.payload.classifierAccuracy;
        
        // Use live history if provided, else keep existing dummy or empty
        if (action.payload.revenueHistory && action.payload.revenueHistory.length > 0) {
            state.revenueHistory = action.payload.revenueHistory;
        }
      })
      .addCase(fetchMetrics.rejected, (state) => {
        state.status = 'failed';
      });
  },
});

export const { updateMetrics, addRevenuePoint, incrementRecovered } = metricsSlice.actions;
export default metricsSlice.reducer;
