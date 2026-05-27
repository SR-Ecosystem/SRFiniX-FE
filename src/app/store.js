import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import expenseReducer from '../features/expenses/expenseSlice';
import incomeReducer from '../features/income/incomeSlice';
import goalReducer from '../features/goals/goalSlice';
import budgetReducer from '../features/budget/budgetSlice';
import strategyReducer from '../features/strategy/strategySlice';
import notificationReducer from '../features/notifications/notificationSlice';
import analyticsReducer from '../features/analytics/analyticsSlice';
import uiReducer from '../features/ui/uiSlice';
import historyReducer, { recordHistoryAction } from '../features/history/historySlice';
import { fetchNotifications } from '../features/notifications/notificationSlice';
import { notifyUnreadOnMobile } from '../utils/mobileNotifications';

const pendingDeletes = new Map();
const pendingUpdates = new Map();

const historyMiddleware = (storeApi) => (next) => (action) => {
  const stateBefore = storeApi.getState();

  if (!stateBefore.history?.isApplying) {
    if (action.type === 'expenses/delete/pending') {
      pendingDeletes.set(action.meta.requestId, {
        entity: 'expense',
        item: stateBefore.expenses.list.find((item) => item._id === action.meta.arg),
      });
    }
    if (action.type === 'income/delete/pending') {
      pendingDeletes.set(action.meta.requestId, {
        entity: 'income',
        item: stateBefore.income.list.find((item) => item._id === action.meta.arg),
      });
    }
    if (action.type === 'goals/delete/pending') {
      pendingDeletes.set(action.meta.requestId, {
        entity: 'goal',
        item: stateBefore.goals.list.find((item) => item._id === action.meta.arg),
      });
    }
    if (action.type === 'expenses/update/pending') {
      pendingUpdates.set(action.meta.requestId, {
        entity: 'expense',
        before: stateBefore.expenses.list.find((item) => item._id === action.meta.arg?.id),
      });
    }
    if (action.type === 'goals/contribute/pending') {
      pendingUpdates.set(action.meta.requestId, {
        entity: 'goal',
        before: stateBefore.goals.list.find((item) => item._id === action.meta.arg?.id),
      });
    }
  }

  const result = next(action);
  const stateAfter = storeApi.getState();

  if (!stateAfter.history?.isApplying) {
    if (action.type === 'expenses/add/fulfilled') {
      storeApi.dispatch(recordHistoryAction({ entity: 'expense', op: 'create', item: action.payload.expense }));
    }
    if (action.type === 'income/add/fulfilled') {
      storeApi.dispatch(recordHistoryAction({ entity: 'income', op: 'create', item: action.payload.income }));
    }
    if (action.type === 'goals/create/fulfilled') {
      storeApi.dispatch(recordHistoryAction({ entity: 'goal', op: 'create', item: action.payload.goal }));
    }
    if (action.type.endsWith('/delete/fulfilled')) {
      const deleted = pendingDeletes.get(action.meta.requestId);
      if (deleted?.item) {
        storeApi.dispatch(recordHistoryAction({ entity: deleted.entity, op: 'delete', item: deleted.item }));
      }
      pendingDeletes.delete(action.meta.requestId);
    }
    if (action.type === 'expenses/update/fulfilled') {
      const updated = pendingUpdates.get(action.meta.requestId);
      if (updated?.before && action.payload?.expense) {
        storeApi.dispatch(recordHistoryAction({ entity: 'expense', op: 'update', before: updated.before, after: action.payload.expense }));
      }
      pendingUpdates.delete(action.meta.requestId);
    }
    if (action.type === 'goals/contribute/fulfilled') {
      const updated = pendingUpdates.get(action.meta.requestId);
      if (updated?.before && action.payload?.goal) {
        storeApi.dispatch(recordHistoryAction({ entity: 'goal', op: 'update', before: updated.before, after: action.payload.goal }));
      }
      pendingUpdates.delete(action.meta.requestId);
    }
  }

  const notificationWorthy = [
    'expenses/add/fulfilled',
    'expenses/update/fulfilled',
    'expenses/delete/fulfilled',
    'income/add/fulfilled',
    'income/delete/fulfilled',
    'goals/create/fulfilled',
    'goals/contribute/fulfilled',
    'goals/delete/fulfilled',
    'strategy/transferToEmergency/fulfilled',
    'strategy/transferCurrentRemaining/fulfilled',
    'strategy/approveEmergencyRollover/fulfilled',
  ];
  if (notificationWorthy.includes(action.type)) {
    storeApi.dispatch(fetchNotifications());
  }

  if (action.type === 'notifications/fetch/fulfilled') {
    const notificationsEnabled = storeApi.getState().auth.user?.preferences?.notifications !== false;
    notifyUnreadOnMobile(action.payload?.notifications || [], notificationsEnabled);
  }

  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    expenses: expenseReducer,
    income: incomeReducer,
    goals: goalReducer,
    budget: budgetReducer,
    strategy: strategyReducer,
    notifications: notificationReducer,
    analytics: analyticsReducer,
    ui: uiReducer,
    history: historyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(historyMiddleware),
});

store.subscribe(() => {
  const { undoStack, redoStack } = store.getState().history;
  localStorage.setItem('srfinix.history', JSON.stringify({ undoStack, redoStack }));
});
