import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

export interface PTPRecord {
  id: string;
  customer_id: string;
  promised_amount: number;
  promised_date: string;
  extraction_source: 'WHATSAPP_CHAT' | 'VOICE_CALL_TRANSCRIPT' | 'EMAIL' | 'SMS';
  commitment_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'BROKEN' | 'FULFILLED';
}

export const fetchPtpRecords = createAsyncThunk('ptp/fetchPtpRecords', async () => {
  const response = await fetch('http://localhost:8000/api/ptp-records');
  if (!response.ok) throw new Error('Failed to fetch PTP records');
  return response.json() as Promise<PTPRecord[]>;
});

interface PTPState {
  records: PTPRecord[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  filter: 'ALL' | 'ACTIVE' | 'BROKEN' | 'FULFILLED';
  sort: 'DATE_ASC' | 'DATE_DESC' | 'AMOUNT_DESC' | 'CONFIDENCE_DESC';
}

const initialState: PTPState = {
  records: [],
  status: 'idle',
  filter: 'ALL',
  sort: 'DATE_ASC',
};

export const ptpSlice = createSlice({
  name: 'ptp',
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<PTPState['filter']>) => {
      state.filter = action.payload;
    },
    setSort: (state, action: PayloadAction<PTPState['sort']>) => {
      state.sort = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPtpRecords.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPtpRecords.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.records = action.payload;
      })
      .addCase(fetchPtpRecords.rejected, (state) => {
        state.status = 'failed';
      });
  },
});

export const { setFilter, setSort } = ptpSlice.actions;
export default ptpSlice.reducer;
