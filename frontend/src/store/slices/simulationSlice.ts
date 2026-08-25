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

const initialState: SimulationState = {
  records: [],
  isRunning: false,
  progress: 100,
  totalAtRisk: 0,
  totalRecovered: 0,
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
