import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { userAPI } from '../api/user.api';
import { fetchProfile, logoutUser } from '../features/auth/authSlice';
import { fetchActiveStrategy, transferToEmergency } from '../features/strategy/strategySlice';
import { Button, Input, Select } from '../components/ui/index';
import toast from 'react-hot-toast';

export default function Settings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { active: strategy } = useSelector((s) => s.strategy);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    profile: { ...user?.profile } || {},
  });
  const [prefs, setPrefs] = useState({ ...user?.preferences });
  const [saving, setSaving] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState({ divisionLabel: '', amount: '' });

  useEffect(() => {
    dispatch(fetchActiveStrategy({}));
  }, [dispatch]);

  const setP = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  const setProf = (key, value) => setProfile((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  const setPref = (key, value) => setPrefs((current) => ({ ...current, [key]: value }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      await userAPI.updateProfile(profile);
      await dispatch(fetchProfile());
      toast.success('Profile updated.');
    } catch {
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      await userAPI.updatePreferences(prefs);
      await dispatch(fetchProfile());
      toast.success('Preferences saved.');
    } catch {
      toast.error('Failed to save preferences');
    }
    setSaving(false);
  };

  const addEmergencyFund = async (event) => {
    event.preventDefault();
    if (!emergencyForm.divisionLabel || !emergencyForm.amount) {
      toast.error('Choose strategy part and amount.');
      return;
    }

    const res = await dispatch(transferToEmergency({
      divisionLabel: emergencyForm.divisionLabel,
      amount: Number(emergencyForm.amount),
    }));

    if (transferToEmergency.fulfilled.match(res)) {
      toast.success('Added to emergency fund.');
      setEmergencyForm({ divisionLabel: '', amount: '' });
    } else {
      toast.error(res.payload || 'Failed to add emergency fund');
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login', { replace: true });
  };

  const initials = user?.name?.split(' ').map((name) => name[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h2 className="font-display font-bold text-xl">Settings</h2>
        <p className="text-sm text-text-secondary mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card">
          <h3 className="font-display font-semibold mb-4">Profile</h3>
          <div className="flex items-center gap-4 mb-5 p-4 bg-bg-tertiary rounded-xl">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-purple to-accent-green flex items-center justify-center font-bold text-xl text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{user?.name}</p>
              <p className="text-sm text-text-secondary truncate">{user?.email}</p>
              <p className="text-xs text-accent-green mt-0.5">Account active</p>
            </div>
          </div>
          <div className="space-y-4">
            <Input label="Full Name" value={profile.name} onChange={(event) => setP('name', event.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Age" type="number" value={profile.profile.age || ''} onChange={(event) => setProf('age', event.target.value)} />
              <Input label="Occupation" value={profile.profile.occupation || ''} onChange={(event) => setProf('occupation', event.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Monthly Income (Rs)" type="number" value={profile.profile.monthlyGrossIncome || ''} onChange={(event) => setProf('monthlyGrossIncome', event.target.value)} />
              <Input label="Monthly Rent (Rs)" type="number" value={profile.profile.monthlyRent || ''} onChange={(event) => setProf('monthlyRent', event.target.value)} />
            </div>
            <Select label="Risk Appetite" value={profile.profile.riskAppetite || 'medium'} onChange={(event) => setProf('riskAppetite', event.target.value)}>
              <option value="low">Low - Conservative</option>
              <option value="medium">Medium - Balanced</option>
              <option value="high">High - Aggressive</option>
            </Select>
            <Button onClick={saveProfile} loading={saving}>Save Profile</Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card">
          <h3 className="font-display font-semibold mb-1">Emergency Fund</h3>
          <p className="text-xs text-text-muted mb-4">Add money from an available strategy part.</p>
          <form onSubmit={addEmergencyFund} className="space-y-4">
            <Select
              label="From Strategy Part"
              value={emergencyForm.divisionLabel}
              onChange={(event) => setEmergencyForm((current) => ({ ...current, divisionLabel: event.target.value }))}
              required
            >
              <option value="">Choose strategy part</option>
              {(strategy?.divisions || []).map((division) => (
                <option key={division.label} value={division.label}>{division.label}</option>
              ))}
            </Select>
            <Input
              label="Amount (Rs)"
              type="number"
              value={emergencyForm.amount}
              onChange={(event) => setEmergencyForm((current) => ({ ...current, amount: event.target.value }))}
              placeholder="1000"
              min="1"
              required
            />
            <Button type="submit">Add Emergency Fund</Button>
          </form>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
          <h3 className="font-display font-semibold mb-4">Preferences</h3>
          <div className="space-y-4">
            <Select label="Currency" value={prefs.currency || 'INR'} onChange={(event) => setPref('currency', event.target.value)}>
              <option value="INR">Indian Rupee (INR)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GBP">British Pound (GBP)</option>
            </Select>
            <Select label="Theme" value={prefs.theme || 'dark'} onChange={(event) => setPref('theme', event.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </Select>
            <label className="flex items-center justify-between cursor-pointer py-2">
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-text-muted">Alerts for overspending, goals, reminders</p>
              </div>
              <div
                onClick={() => setPref('notifications', !prefs.notifications)}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative ${prefs.notifications ? 'bg-accent-green' : 'bg-bg-card'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${prefs.notifications ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
            <Button onClick={savePrefs} loading={saving}>Save Preferences</Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card">
          <h3 className="font-display font-semibold mb-3">Financial Health Score</h3>
          <div className="flex items-center gap-5 p-4 bg-bg-tertiary rounded-xl">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg viewBox="0 0 80 80" className="transform -rotate-90 w-full h-full">
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle
                  cx="40" cy="40" r="32" fill="none" stroke="#00E5A0" strokeWidth="8"
                  strokeDasharray={`${(user?.financialHealthScore || 0) * 2.01} 201`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display font-bold text-xl text-accent-green">{user?.financialHealthScore || 0}</span>
              </div>
            </div>
            <div>
              <p className="font-display font-semibold text-lg">
                {(user?.financialHealthScore || 0) >= 80 ? 'Excellent' :
                  (user?.financialHealthScore || 0) >= 60 ? 'Good' :
                  (user?.financialHealthScore || 0) >= 40 ? 'Fair' : 'Needs work'}
              </p>
              <p className="text-sm text-text-secondary mt-1">Based on savings rate, goals, and spending habits</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card border-accent-red/20 lg:col-span-2">
          <h3 className="font-display font-semibold mb-1 text-accent-red">Account Actions</h3>
          <p className="text-xs text-text-muted mb-4">Sign out only when you want this device to forget the session.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Logout
            </Button>
            <Button variant="danger" size="sm" onClick={() => toast.error('Contact support to delete your account')}>
            Delete Account
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
