import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../api/auth.api';
import { userAPI } from '../../api/user.api';

export const registerUser = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try { const res = await authAPI.register(data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Registration failed'); }
});
export const loginUser = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try { const res = await authAPI.login(data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data); }
});
export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try { await authAPI.logout(); } catch {}
});
export const fetchProfile = createAsyncThunk('auth/fetchProfile', async (_, { rejectWithValue }) => {
  try { const res = await userAPI.getProfile(); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const fetchFinancialScore = createAsyncThunk('auth/fetchFinancialScore', async (params, { rejectWithValue }) => {
  try { const res = await userAPI.getFinancialScore(params); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const completeOnboarding = createAsyncThunk('auth/onboarding', async (data, { rejectWithValue }) => {
  try { const res = await userAPI.completeOnboarding(data); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: localStorage.getItem('accessToken') || null,
    financialScoreKey: null,
    isLoading: false, error: null, isInitialized: false,
  },
  reducers: {
    clearError: (s) => { s.error = null; },
  },
  extraReducers: (b) => {
    b.addCase(registerUser.pending, (s) => { s.isLoading = true; s.error = null; });
    b.addCase(registerUser.fulfilled, (s, a) => {
      s.isLoading = false; s.user = a.payload.user; s.accessToken = a.payload.accessToken;
      localStorage.setItem('accessToken', a.payload.accessToken);
      if (a.payload.refreshToken) localStorage.setItem('refreshToken', a.payload.refreshToken);
    });
    b.addCase(registerUser.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; });

    b.addCase(loginUser.pending, (s) => { s.isLoading = true; s.error = null; });
    b.addCase(loginUser.fulfilled, (s, a) => {
      s.isLoading = false; s.user = a.payload.user; s.accessToken = a.payload.accessToken;
      localStorage.setItem('accessToken', a.payload.accessToken);
      if (a.payload.refreshToken) localStorage.setItem('refreshToken', a.payload.refreshToken);
    });
    b.addCase(loginUser.rejected, (s, a) => {
      s.isLoading = false;
      s.error = a.payload?.message || a.payload;
    });

    b.addCase(logoutUser.fulfilled, (s) => {
      s.user = null; s.accessToken = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    });

    b.addCase(fetchProfile.fulfilled, (s, a) => { s.user = a.payload.user; s.isInitialized = true; });
    b.addCase(fetchProfile.rejected, (s) => {
      s.isInitialized = true;
    });

    b.addCase(completeOnboarding.fulfilled, (s, a) => { s.user = a.payload.user; });
    b.addCase(fetchFinancialScore.fulfilled, (s, a) => {
      if (s.user) s.user.financialHealthScore = a.payload.score;
      s.financialScoreKey = `${a.meta.arg?.year || ''}-${a.meta.arg?.month || ''}`;
    });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
