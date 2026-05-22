import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { expenseAPI } from '../../api/expense.api';

export const fetchExpenses = createAsyncThunk('expenses/fetch', async (params, { rejectWithValue }) => {
  try { const res = await expenseAPI.getAll(params); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const addExpense = createAsyncThunk('expenses/add', async (data, { rejectWithValue }) => {
  try { const res = await expenseAPI.add(data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const updateExpense = createAsyncThunk('expenses/update', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await expenseAPI.update(id, data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const deleteExpense = createAsyncThunk('expenses/delete', async (id, { rejectWithValue }) => {
  try { await expenseAPI.delete(id); return id; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const fetchCategoryBreakdown = createAsyncThunk('expenses/categories', async (params, { rejectWithValue }) => {
  try { const res = await expenseAPI.getByCategory(params); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});

const expenseSlice = createSlice({
  name: 'expenses',
  initialState: { list: [], total: 0, pages: 1, page: 1, categoryData: [], isLoading: false, error: null, filters: {} },
  reducers: { setFilters: (s, a) => { s.filters = a.payload; } },
  extraReducers: (b) => {
    b.addCase(fetchExpenses.pending, (s) => { s.isLoading = true; });
    b.addCase(fetchExpenses.fulfilled, (s, a) => { s.isLoading = false; s.list = a.payload.expenses; s.total = a.payload.total; s.pages = a.payload.pages; });
    b.addCase(fetchExpenses.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; });
    b.addCase(addExpense.fulfilled, (s, a) => { s.list.unshift(a.payload.expense); });
    b.addCase(updateExpense.fulfilled, (s, a) => { const i = s.list.findIndex((e) => e._id === a.payload.expense._id); if (i > -1) s.list[i] = a.payload.expense; });
    b.addCase(deleteExpense.fulfilled, (s, a) => { s.list = s.list.filter((e) => e._id !== a.payload); });
    b.addCase(fetchCategoryBreakdown.fulfilled, (s, a) => { s.categoryData = a.payload.data; });
  },
});
export const { setFilters } = expenseSlice.actions;
export default expenseSlice.reducer;