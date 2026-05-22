import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { analyticsAPI } from '../../api/analytics.api';

export const fetchOverview = createAsyncThunk('analytics/overview', async (params, { rejectWithValue }) => {
  try { const res = await analyticsAPI.getOverview(params); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const fetchMonthly = createAsyncThunk('analytics/monthly', async (params, { rejectWithValue }) => {
  try { const res = await analyticsAPI.getMonthly(params); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const fetchDaily = createAsyncThunk('analytics/daily', async (params, { rejectWithValue }) => {
  try { const res = await analyticsAPI.getDaily(params); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const fetchInsights = createAsyncThunk('analytics/insights', async (_, { rejectWithValue }) => {
  try { const res = await analyticsAPI.getInsights(); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const fetchWeekly = createAsyncThunk('analytics/weekly', async (_, { rejectWithValue }) => {
  try { const res = await analyticsAPI.getWeekly(); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: { overview: null, daily: null, monthly: null, weekly: null, insights: [], isLoading: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchOverview.pending, (s) => { s.isLoading = true; });
    b.addCase(fetchOverview.fulfilled, (s, a) => { s.isLoading = false; s.overview = a.payload.overview; });
    b.addCase(fetchDaily.fulfilled, (s, a) => { s.daily = a.payload; });
    b.addCase(fetchMonthly.fulfilled, (s, a) => { s.monthly = a.payload; });
    b.addCase(fetchInsights.fulfilled, (s, a) => { s.insights = a.payload.insights; });
    b.addCase(fetchWeekly.fulfilled, (s, a) => { s.weekly = a.payload; });
  },
});
export default analyticsSlice.reducer;
