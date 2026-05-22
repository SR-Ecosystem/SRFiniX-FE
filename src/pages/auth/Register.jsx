import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { registerUser, clearError } from '../../features/auth/authSlice';
import { BrandLogo, Button, Input } from '../../components/ui/index';

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    dispatch(clearError());
    setLocalError('');
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    const res = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(res)) {
      navigate('/onboarding');
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
        <div className="text-center mb-8">
          <BrandLogo className="mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl mb-1">Create account</h1>
          <p className="text-text-secondary text-sm">Start your financial journey today</p>
        </div>

        <div className="card">
          {(error || localError) && (
            <div className="bg-accent-red/10 border border-accent-red/20 rounded-xl p-3 mb-5 text-accent-red text-sm">
              {error || localError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full name" name="name" value={form.name} onChange={handleChange} placeholder="Arjun Rao" required />
            <Input label="Email address" type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
            <Input label="Password" type="password" name="password" value={form.password} onChange={handleChange} placeholder="Min 8 characters" required />

            <Button type="submit" loading={isLoading} className="w-full justify-center mt-2">
              Create Account
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/[0.07] text-center">
            <p className="text-text-secondary text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-accent-green font-medium hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
