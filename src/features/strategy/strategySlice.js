import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { strategyAPI } from '../../api/strategy.api';

export const fetchActiveStrategy = createAsyncThunk('strategy/fetchActive', async (params, { rejectWithValue }) => {
  try { const res = await strategyAPI.getActive(params); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const fetchPredefined = createAsyncThunk('strategy/fetchPredefined', async (_, { rejectWithValue }) => {
  try { const res = await strategyAPI.getPredefined(); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const createStrategy = createAsyncThunk('strategy/create', async (data, { rejectWithValue }) => {
  try { const res = await strategyAPI.create(data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const transferToEmergency = createAsyncThunk('strategy/transferToEmergency', async (data, { rejectWithValue }) => {
  try { const res = await strategyAPI.transferToEmergency(data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});

const strategySlice = createSlice({
  name: 'strategy',
  initialState: { active: null, predefined: [], isLoading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchActiveStrategy.pending, (s) => { s.isLoading = true; });
    b.addCase(fetchActiveStrategy.fulfilled, (s, a) => { s.isLoading = false; s.active = a.payload.strategy; });
    b.addCase(fetchPredefined.fulfilled, (s, a) => { s.predefined = a.payload.strategies; });
    b.addCase(createStrategy.fulfilled, (s, a) => { s.active = a.payload.strategy; });
    b.addCase(transferToEmergency.fulfilled, (s, a) => { s.active = a.payload.strategy; });
  },
});
export default strategySlice.reducer;
