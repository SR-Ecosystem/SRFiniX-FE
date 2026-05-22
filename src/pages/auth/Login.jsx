import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { loginUser, clearError } from '../../features/auth/authSlice';
import { BrandLogo, Button, Input } from '../../components/ui/index';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    dispatch(clearError());
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await dispatch(loginUser(form));
    if (loginUser.fulfilled.match(res)) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <BrandLogo className="mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl mb-1">Welcome back</h1>
          <p className="text-text-secondary text-sm">Sign in to your SRFiniX account</p>
        </div>

        {/* Card */}
        <div className="card">
          {error && (
            <div className="bg-accent-red/10 border border-accent-red/20 rounded-xl p-3 mb-5 text-accent-red text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
            <div>
              <Input
                label="Password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              <div className="flex justify-end mt-1.5">
                <Link to="/forgot-password" className="text-xs text-accent-green hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" loading={isLoading} className="w-full justify-center mt-2">
              Sign In
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/[0.07] text-center">
            <p className="text-text-secondary text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-accent-green font-medium hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-text-muted text-xs mt-6">
          Demo: test@srfinix.app / password123
        </p>
      </motion.div>
    </div>
  );
}
