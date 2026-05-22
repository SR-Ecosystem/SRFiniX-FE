import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LogoLoader } from '../components/ui/index';
import { AppLayout } from '../components/layout/AppLayout';

// Pages - lazy imported
import { lazy, Suspense } from 'react';
const Dashboard    = lazy(() => import('../pages/Dashboard'));
const Expenses     = lazy(() => import('../pages/Expenses'));
const Income       = lazy(() => import('../pages/Income'));
const Goals        = lazy(() => import('../pages/Goals'));
const Strategy     = lazy(() => import('../pages/Strategy'));
const Analytics    = lazy(() => import('../pages/Analytics'));
const Notifications= lazy(() => import('../pages/Notifications'));
const Settings     = lazy(() => import('../pages/Settings'));
const Onboarding   = lazy(() => import('../pages/Onboarding'));
const Login        = lazy(() => import('../pages/auth/Login'));
const Register     = lazy(() => import('../pages/auth/Register'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <LogoLoader label="" />
  </div>
);

const PrivateRoute = ({ children }) => {
  const { accessToken, isInitialized } = useSelector((s) => s.auth);
  if (!isInitialized) return <PageLoader />;
  return accessToken ? children : <Navigate to="/login" replace />;
};

const OnboardingGate = ({ children }) => {
  const { user, accessToken } = useSelector((s) => s.auth);
  if (!accessToken) return <Navigate to="/login" replace />;
  if (user && !user.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { accessToken } = useSelector((s) => s.auth);
  return accessToken ? <Navigate to="/" replace /> : children;
};

export const AppRouter = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public */}
      <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      {/* Onboarding */}
      <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />

      {/* Protected App */}
      <Route element={<PrivateRoute><OnboardingGate><AppLayout /></OnboardingGate></PrivateRoute>}>
        <Route index                     element={<Dashboard />} />
        <Route path="expenses"           element={<Expenses />} />
        <Route path="income"             element={<Income />} />
        <Route path="goals"              element={<Goals />} />
        <Route path="strategy"           element={<Strategy />} />
        <Route path="upi"                element={<Navigate to="/expenses" replace />} />
        <Route path="analytics"          element={<Analytics />} />
        <Route path="statistics"         element={<Analytics />} />
        <Route path="notifications"      element={<Notifications />} />
        <Route path="settings"           element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);
