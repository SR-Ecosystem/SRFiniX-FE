import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { budgetAPI } from '../../api/budget.api';

export const fetchBudget = createAsyncThunk('budget/fetch', async (params, { rejectWithValue }) => {
  try { const res = await budgetAPI.getCurrent(params); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});

const budgetSlice = createSlice({
  name: 'budget',
  initialState: { data: null, periodKey: null, isLoading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchBudget.pending, (s) => { s.isLoading = true; });
    b.addCase(fetchBudget.fulfilled, (s, a) => {
      s.isLoading = false;
      s.data = a.payload.budget;
      s.periodKey = `${a.meta.arg?.year || ''}-${a.meta.arg?.month || ''}`;
    });
    b.addCase(fetchBudget.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; });
  },
});
export default budgetSlice.reducer;
