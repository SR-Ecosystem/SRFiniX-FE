import { useEffect, useState } from 'react';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { store } from './app/store';
import { AppRouter } from './router/AppRouter';
import { fetchDaily, fetchInsights, fetchMonthly, fetchOverview, fetchWeekly } from './features/analytics/analyticsSlice';
import { fetchProfile, fetchFinancialScore } from './features/auth/authSlice';
import { fetchBudget } from './features/budget/budgetSlice';
import { fetchExpenses } from './features/expenses/expenseSlice';
import { fetchGoals } from './features/goals/goalSlice';
import { fetchIncome } from './features/income/incomeSlice';
import { fetchNotifications } from './features/notifications/notificationSlice';
import { fetchActiveStrategy, fetchPredefined, fetchTemplates } from './features/strategy/strategySlice';
import { setTheme } from './features/ui/uiSlice';
import { WelcomeSplash } from './components/ui/index';
import { getCurrentPeriod } from './utils/formatters';
import { installInteractionEffects } from './utils/interactionEffects';
import { setupMobileNotifications } from './utils/mobileNotifications';
import { getOfflineQueueCount, syncOfflineQueue } from './api/axiosInstance';

const BOOT_SPLASH_MAX_MS = 2000;
const getAutoTheme = () => {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6 ? 'dark' : 'light';
};

// Inner component with access to Redux
function AppInit() {
  const dispatch = useDispatch();
  const { accessToken, isInitialized } = useSelector((s) => s.auth);
  const { theme } = useSelector((s) => s.ui);
  const [booting, setBooting] = useState(Boolean(accessToken));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const applyScheduledTheme = () => dispatch(setTheme(getAutoTheme()));
    applyScheduledTheme();
    const timer = window.setInterval(applyScheduledTheme, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [dispatch]);

  useEffect(() => installInteractionEffects(), []);

  useEffect(() => {
    const refreshSessionData = async () => {
      const period = getCurrentPeriod();
      await Promise.allSettled([
        dispatch(fetchProfile()),
        dispatch(fetchFinancialScore(period)),
        dispatch(fetchNotifications()),
        dispatch(fetchOverview(period)),
        dispatch(fetchDaily(period)),
        dispatch(fetchMonthly({ year: period.year })),
        dispatch(fetchWeekly()),
        dispatch(fetchInsights()),
        dispatch(fetchActiveStrategy(period)),
        dispatch(fetchPredefined()),
        dispatch(fetchTemplates()),
        dispatch(fetchExpenses({ ...period, limit: 200 })),
        dispatch(fetchIncome(period)),
        dispatch(fetchGoals({})),
        dispatch(fetchBudget(period)),
      ]);
    };

    const handleOfflineEvent = (event) => {
      const detail = event.detail || {};
      if (detail.type === 'synced') {
        toast.dismiss('offline-sync');
      }
    };

    const handleOffline = () => {};

    const handleOnline = async () => {
      const queued = getOfflineQueueCount();
      if (queued === 0) return;
      const result = await syncOfflineQueue();
      if (result.synced > 0) await refreshSessionData();
    };

    window.addEventListener('srfinix:offline-sync', handleOfflineEvent);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    if (!navigator.onLine) handleOffline();
    else if (getOfflineQueueCount() > 0) handleOnline();

    return () => {
      window.removeEventListener('srfinix:offline-sync', handleOfflineEvent);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [dispatch]);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      const period = getCurrentPeriod();

      if (!accessToken) {
        dispatch({ type: 'auth/fetchProfile/rejected' });
        if (mounted) setBooting(false);
        return;
      }

      setBooting(true);
      const start = Date.now();
      const profileResult = await dispatch(fetchProfile());
      if (profileResult.payload?.user?.preferences?.notifications !== false) {
        setupMobileNotifications().catch(() => {});
      }
      const preload = Promise.allSettled([
        dispatch(fetchFinancialScore(period)),
        dispatch(fetchNotifications()),
        dispatch(fetchOverview(period)),
        dispatch(fetchDaily(period)),
        dispatch(fetchMonthly({ year: period.year })),
        dispatch(fetchWeekly()),
        dispatch(fetchInsights()),
        dispatch(fetchActiveStrategy(period)),
        dispatch(fetchPredefined()),
        dispatch(fetchTemplates()),
        dispatch(fetchExpenses({ ...period, limit: 200 })),
        dispatch(fetchIncome(period)),
        dispatch(fetchGoals({})),
        dispatch(fetchBudget(period)),
      ]);

      await Promise.race([
        preload,
        new Promise((resolve) => window.setTimeout(resolve, Math.max(0, BOOT_SPLASH_MAX_MS - (Date.now() - start)))),
      ]);

      preload.catch(() => {});

      const remaining = Math.max(0, BOOT_SPLASH_MAX_MS - (Date.now() - start));
      window.setTimeout(() => {
        if (mounted) setBooting(false);
      }, remaining);
    };

    boot();
    return () => { mounted = false; };
  }, [dispatch, accessToken]);

  // Show loading until we know auth status
  if (accessToken && (!isInitialized || booting)) {
    return <WelcomeSplash />;
  }

  return (
    <>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#181B22',
            color: '#F0F2F8',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
            fontSize: '13px',
            fontFamily: 'DM Sans, sans-serif',
          },
          success: { iconTheme: { primary: '#00E5A0', secondary: '#000' } },
          error: { iconTheme: { primary: '#FF4B6B', secondary: '#fff' } },
          duration: 3000,
        }}
      />
    </>
  );
}

export default function App() {
  const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

  return (
    <Provider store={store}>
      <Router>
        <AppInit />
      </Router>
    </Provider>
  );
}
