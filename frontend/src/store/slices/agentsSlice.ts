import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type AgentStatus = 'active' | 'idle' | 'processing';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
}

interface AgentsState {
  agents: Record<string, Agent>;
}

const initialState: AgentsState = {
  agents: {
    '1': { id: '1', name: 'Degradation Watchdog', status: 'active' },
    '2': { id: '2', name: 'Abandonment Hunter', status: 'active' },
    '3': { id: '3', name: 'Subscription Rescue', status: 'idle' },
    '4': { id: '4', name: 'Receivables Pursuit', status: 'processing' },
    '5': { id: '5', name: 'Mandate Sequencer', status: 'idle' },
    '6': { id: '6', name: 'VoiceIQ Agent', status: 'active' },
    '7': { id: '7', name: 'PTP Tracker', status: 'idle' },
  }
};

export const agentsSlice = createSlice({
  name: 'agents',
  initialState,
  reducers: {
    updateAgentStatus: (state, action: PayloadAction<{ id: string; status: AgentStatus }>) => {
      if (state.agents[action.payload.id]) {
        state.agents[action.payload.id].status = action.payload.status;
      }
    }
  },
});

export const { updateAgentStatus } = agentsSlice.actions;
export default agentsSlice.reducer;
