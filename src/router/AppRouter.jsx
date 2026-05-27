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

const Loadable = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
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
  <Routes>
    {/* Public */}
    <Route path="/login"           element={<PublicRoute><Loadable><Login /></Loadable></PublicRoute>} />
    <Route path="/register"        element={<PublicRoute><Loadable><Register /></Loadable></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><Loadable><ForgotPassword /></Loadable></PublicRoute>} />

    {/* Onboarding */}
    <Route path="/onboarding" element={<PrivateRoute><Loadable><Onboarding /></Loadable></PrivateRoute>} />

    {/* Protected App */}
    <Route element={<PrivateRoute><OnboardingGate><AppLayout /></OnboardingGate></PrivateRoute>}>
      <Route index                     element={<Loadable><Dashboard /></Loadable>} />
      <Route path="expenses"           element={<Loadable><Expenses /></Loadable>} />
      <Route path="income"             element={<Loadable><Income /></Loadable>} />
      <Route path="goals"              element={<Loadable><Goals /></Loadable>} />
      <Route path="strategy"           element={<Loadable><Strategy /></Loadable>} />
      <Route path="upi"                element={<Navigate to="/expenses" replace />} />
      <Route path="analytics"          element={<Loadable><Analytics /></Loadable>} />
      <Route path="statistics"         element={<Loadable><Analytics /></Loadable>} />
      <Route path="notifications"      element={<Loadable><Notifications /></Loadable>} />
      <Route path="settings"           element={<Loadable><Settings /></Loadable>} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
