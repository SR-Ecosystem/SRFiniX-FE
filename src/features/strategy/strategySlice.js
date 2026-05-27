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
export const fetchTemplates = createAsyncThunk('strategy/fetchTemplates', async (_, { rejectWithValue }) => {
  try { const res = await strategyAPI.getTemplates(); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const createStrategy = createAsyncThunk('strategy/create', async (data, { rejectWithValue }) => {
  try { const res = await strategyAPI.create(data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const createStrategyTemplate = createAsyncThunk('strategy/createTemplate', async (data, { rejectWithValue }) => {
  try { const res = await strategyAPI.createTemplate(data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const deleteStrategyTemplate = createAsyncThunk('strategy/deleteTemplate', async (id, { rejectWithValue }) => {
  try { const res = await strategyAPI.deleteTemplate(id); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const transferToEmergency = createAsyncThunk('strategy/transferToEmergency', async (data, { rejectWithValue }) => {
  try { const res = await strategyAPI.transferToEmergency(data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const approveEmergencyRollover = createAsyncThunk('strategy/approveEmergencyRollover', async (data, { rejectWithValue }) => {
  try { const res = await strategyAPI.approveEmergencyRollover(data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const transferCurrentRemaining = createAsyncThunk('strategy/transferCurrentRemaining', async (data, { rejectWithValue }) => {
  try { const res = await strategyAPI.transferCurrentRemaining(data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});

const strategySlice = createSlice({
  name: 'strategy',
  initialState: {
    active: null,
    activeKey: null,
    predefined: [],
    predefinedLoaded: false,
    templates: [],
    templatesLoaded: false,
    emergencyFundBalance: 0,
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchActiveStrategy.pending, (s) => { s.isLoading = true; });
    b.addCase(fetchActiveStrategy.fulfilled, (s, a) => {
      s.isLoading = false;
      s.active = a.payload.strategy;
      s.activeKey = `${a.meta.arg?.year || ''}-${a.meta.arg?.month || ''}`;
      s.emergencyFundBalance = a.payload.emergencyFundBalance || 0;
    });
    b.addCase(fetchActiveStrategy.rejected, (s, a) => {
      s.isLoading = false;
      s.active = null;
      s.activeKey = `${a.meta.arg?.year || ''}-${a.meta.arg?.month || ''}`;
      s.error = a.payload;
    });
    b.addCase(fetchPredefined.fulfilled, (s, a) => { s.predefined = a.payload.strategies; s.predefinedLoaded = true; });
    b.addCase(fetchTemplates.fulfilled, (s, a) => { s.templates = a.payload.templates || []; s.templatesLoaded = true; });
    b.addCase(createStrategy.fulfilled, (s, a) => { s.active = a.payload.strategy; });
    b.addCase(createStrategyTemplate.fulfilled, (s, a) => {
      s.templates = [a.payload.template, ...s.templates.filter((template) => template._id !== a.payload.template._id)];
    });
    b.addCase(deleteStrategyTemplate.fulfilled, (s, a) => {
      s.templates = s.templates.filter((template) => template._id !== a.payload.templateId);
    });
    b.addCase(transferToEmergency.fulfilled, (s, a) => {
      s.active = a.payload.strategy;
      s.emergencyFundBalance = a.payload.emergencyFundBalance || s.emergencyFundBalance;
    });
    b.addCase(approveEmergencyRollover.fulfilled, (s, a) => {
      if (a.payload.strategy) s.active = a.payload.strategy;
      s.emergencyFundBalance = a.payload.emergencyFundBalance || s.emergencyFundBalance;
    });
    b.addCase(transferCurrentRemaining.fulfilled, (s, a) => {
      s.active = a.payload.strategy;
      s.emergencyFundBalance = a.payload.emergencyFundBalance || s.emergencyFundBalance;
    });
  },
});
export default strategySlice.reducer;
