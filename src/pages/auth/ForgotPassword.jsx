import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../../api/auth.api';
import { BrandLogo, Button, Input } from '../../components/ui/index';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [step, setStep] = useState('email'); // email | reset
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSendReset = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      const res = await authAPI.forgotPassword({ email });
      setUserId(res.data.userId);
      if (res.data.resetToken) setResetToken(res.data.resetToken);
      setStep('reset');
    } catch (e) { setError(e.response?.data?.message || 'Something went wrong'); }
    finally { setIsLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setIsLoading(true); setError('');
    try {
      await authAPI.resetPassword({ userId, resetToken, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (e) { setError(e.response?.data?.message || 'Invalid reset token'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <BrandLogo className="mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl mb-1">Reset password</h1>
          <p className="text-text-secondary text-sm">We'll send you reset instructions</p>
        </div>
        <div className="card">
          {error && <div className="bg-accent-red/10 border border-accent-red/20 rounded-xl p-3 mb-5 text-accent-red text-sm">{error}</div>}
          {success && <div className="bg-accent-green/10 border border-accent-green/20 rounded-xl p-3 mb-5 text-accent-green text-sm">Password reset! Redirecting...</div>}

          {step === 'email' && (
            <form onSubmit={handleSendReset} className="space-y-4">
              <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              <Button type="submit" loading={isLoading} className="w-full justify-center">Send Reset Link</Button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <Input label="Reset Token" value={resetToken} onChange={(e) => setResetToken(e.target.value)} placeholder="Enter reset token" required />
              <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" required />
              <Button type="submit" loading={isLoading} className="w-full justify-center">Reset Password</Button>
            </form>
          )}

          <div className="mt-5 pt-5 border-t border-white/[0.07] text-center">
            <Link to="/login" className="text-accent-green text-sm hover:underline">← Back to login</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
