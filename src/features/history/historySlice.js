import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { expenseAPI } from '../../api/expense.api';
import { incomeAPI } from '../../api/income.api';
import { goalAPI } from '../../api/goal.api';
import { fetchOverview } from '../analytics/analyticsSlice';
import { fetchActiveStrategy } from '../strategy/strategySlice';
import { fetchExpenses } from '../expenses/expenseSlice';
import { fetchIncome } from '../income/incomeSlice';
import { fetchGoals } from '../goals/goalSlice';
import { fetchFinancialScore } from '../auth/authSlice';
import { fetchNotifications } from '../notifications/notificationSlice';

const apiByEntity = {
  expense: expenseAPI,
  income: incomeAPI,
  goal: goalAPI,
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const loadInitialHistory = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('srfinix.history') || '{}');
    return {
      undoStack: Array.isArray(saved.undoStack) ? saved.undoStack : [],
      redoStack: Array.isArray(saved.redoStack) ? saved.redoStack : [],
      isApplying: false,
    };
  } catch {
    return { undoStack: [], redoStack: [], isApplying: false };
  }
};

const sanitizeForCreate = (entity, item) => {
  const data = clone(item);
  delete data._id;
  delete data.id;
  delete data.createdAt;
  delete data.updatedAt;
  delete data.__v;
  delete data.attachments;
  if (entity === 'goal') {
    delete data.isCompleted;
    delete data.completedAt;
  }
  return data;
};

const sanitizeForUpdate = (item) => {
  const data = clone(item);
  delete data._id;
  delete data.id;
  delete data.createdAt;
  delete data.updatedAt;
  delete data.__v;
  delete data.attachments;
  return data;
};

const responseKeyForEntity = (entity) => (entity === 'expense' ? 'expense' : entity);

const refreshAfterHistory = async (dispatch) => {
  await Promise.all([
    dispatch(fetchOverview({})),
    dispatch(fetchActiveStrategy({})),
    dispatch(fetchExpenses({ limit: 20 })),
    dispatch(fetchIncome({})),
    dispatch(fetchGoals({})),
    dispatch(fetchFinancialScore()),
    dispatch(fetchNotifications()),
  ]);
};

export const undoLastAction = createAsyncThunk('history/undoLast', async (_, { dispatch, getState, rejectWithValue }) => {
  const action = getState().history.undoStack.at(-1);
  if (!action) return null;

  try {
    dispatch(setApplying(true));
    let redoAction = action;

    if (action.op === 'create') {
      await apiByEntity[action.entity].delete(action.item._id);
    } else if (action.op === 'delete') {
      const response = await apiByEntity[action.entity].create?.(sanitizeForCreate(action.entity, action.item))
        || await apiByEntity[action.entity].add(sanitizeForCreate(action.entity, action.item));
      const key = responseKeyForEntity(action.entity);
      redoAction = { ...action, item: response.data[key] };
    } else if (action.op === 'update') {
      const response = await apiByEntity[action.entity].update(action.before._id, sanitizeForUpdate(action.before));
      const key = responseKeyForEntity(action.entity);
      redoAction = { ...action, before: response.data[key] || action.before };
    }

    await refreshAfterHistory(dispatch);
    return redoAction;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Undo failed');
  } finally {
    dispatch(setApplying(false));
  }
});

export const redoLastAction = createAsyncThunk('history/redoLast', async (_, { dispatch, getState, rejectWithValue }) => {
  const action = getState().history.redoStack.at(-1);
  if (!action) return null;

  try {
    dispatch(setApplying(true));
    let undoAction = action;

    if (action.op === 'create') {
      const response = await apiByEntity[action.entity].create?.(sanitizeForCreate(action.entity, action.item))
        || await apiByEntity[action.entity].add(sanitizeForCreate(action.entity, action.item));
      const key = responseKeyForEntity(action.entity);
      undoAction = { ...action, item: response.data[key] };
    } else if (action.op === 'delete') {
      await apiByEntity[action.entity].delete(action.item._id);
    } else if (action.op === 'update') {
      const response = await apiByEntity[action.entity].update(action.after._id, sanitizeForUpdate(action.after));
      const key = responseKeyForEntity(action.entity);
      undoAction = { ...action, after: response.data[key] || action.after };
    }

    await refreshAfterHistory(dispatch);
    return undoAction;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Redo failed');
  } finally {
    dispatch(setApplying(false));
  }
});

const historySlice = createSlice({
  name: 'history',
  initialState: loadInitialHistory(),
  reducers: {
    recordHistoryAction: (state, action) => {
      if (!action.payload || state.isApplying) return;
      state.undoStack.push(action.payload);
      state.redoStack = [];
      if (state.undoStack.length > 30) state.undoStack.shift();
    },
    setApplying: (state, action) => {
      state.isApplying = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(undoLastAction.fulfilled, (state, action) => {
      if (!action.payload) return;
      state.undoStack.pop();
      state.redoStack.push(action.payload);
    });
    builder.addCase(redoLastAction.fulfilled, (state, action) => {
      if (!action.payload) return;
      state.redoStack.pop();
      state.undoStack.push(action.payload);
    });
  },
});

export const { recordHistoryAction, setApplying } = historySlice.actions;
export default historySlice.reducer;
