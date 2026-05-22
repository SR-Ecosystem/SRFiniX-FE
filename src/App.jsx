import { useEffect } from 'react';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { store } from './app/store';
import { AppRouter } from './router/AppRouter';
import { fetchProfile } from './features/auth/authSlice';
import { fetchNotifications } from './features/notifications/notificationSlice';
import { LogoLoader } from './components/ui/index';

// Inner component with access to Redux
function AppInit() {
  const dispatch = useDispatch();
  const { accessToken, isInitialized } = useSelector((s) => s.auth);

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchProfile());
      dispatch(fetchNotifications());
    } else {
      // Mark as initialized even without a token
      dispatch({ type: 'auth/fetchProfile/rejected' });
    }
  }, [dispatch, accessToken]);

  // Show loading until we know auth status
  if (accessToken && !isInitialized) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <LogoLoader />
      </div>
    );
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
