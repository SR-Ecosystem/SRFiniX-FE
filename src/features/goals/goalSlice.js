import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { goalAPI } from '../../api/goal.api';

export const fetchGoals = createAsyncThunk('goals/fetch', async (params, { rejectWithValue }) => {
  try { const res = await goalAPI.getAll(params); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const createGoal = createAsyncThunk('goals/create', async (data, { rejectWithValue }) => {
  try { const res = await goalAPI.create(data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const contributeToGoal = createAsyncThunk('goals/contribute', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await goalAPI.contribute(id, data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const deleteGoal = createAsyncThunk('goals/delete', async (id, { rejectWithValue }) => {
  try { await goalAPI.delete(id); return id; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});

const goalSlice = createSlice({
  name: 'goals',
  initialState: { list: [], queryKey: null, isLoading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchGoals.pending, (s) => { s.isLoading = true; });
    b.addCase(fetchGoals.fulfilled, (s, a) => {
      s.isLoading = false;
      s.list = a.payload.goals;
      s.queryKey = JSON.stringify(a.meta.arg || {});
    });
    b.addCase(createGoal.fulfilled, (s, a) => { s.list.unshift(a.payload.goal); });
    b.addCase(contributeToGoal.fulfilled, (s, a) => { const i = s.list.findIndex((g) => g._id === a.payload.goal._id); if (i > -1) s.list[i] = a.payload.goal; });
    b.addCase(deleteGoal.fulfilled, (s, a) => { s.list = s.list.filter((g) => g._id !== a.payload); });
  },
});
export default goalSlice.reducer;
