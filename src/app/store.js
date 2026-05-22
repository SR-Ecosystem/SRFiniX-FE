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
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});
