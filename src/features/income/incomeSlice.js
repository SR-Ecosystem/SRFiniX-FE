import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { incomeAPI } from '../../api/income.api';

export const fetchIncome = createAsyncThunk('income/fetch', async (params, { rejectWithValue }) => {
  try { const res = await incomeAPI.getAll(params); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const addIncome = createAsyncThunk('income/add', async (data, { rejectWithValue }) => {
  try { const res = await incomeAPI.add(data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const deleteIncome = createAsyncThunk('income/delete', async (id, { rejectWithValue }) => {
  try { await incomeAPI.delete(id); return id; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});

const incomeSlice = createSlice({
  name: 'income',
  initialState: { list: [], total: 0, periodKey: null, isLoading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchIncome.pending, (s) => { s.isLoading = true; });
    b.addCase(fetchIncome.fulfilled, (s, a) => {
      s.isLoading = false;
      s.list = a.payload.incomes;
      s.total = a.payload.total;
      s.periodKey = `${a.meta.arg?.year || ''}-${a.meta.arg?.month || ''}`;
    });
    b.addCase(addIncome.fulfilled, (s, a) => { s.list.unshift(a.payload.income); s.total += a.payload.income.amount; });
    b.addCase(deleteIncome.fulfilled, (s, a) => { s.list = s.list.filter((i) => i._id !== a.payload); });
  },
});
export default incomeSlice.reducer;
