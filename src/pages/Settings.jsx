import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { expenseAPI } from '../api/expense.api';
import { userAPI } from '../api/user.api';
import { fetchFinancialScore, fetchProfile, logoutUser } from '../features/auth/authSlice';
import { fetchActiveStrategy, transferCurrentRemaining, transferToEmergency } from '../features/strategy/strategySlice';
import { fetchOverview } from '../features/analytics/analyticsSlice';
import { redoLastAction, undoLastAction } from '../features/history/historySlice';
import { endOperation, startOperation } from '../features/ui/uiSlice';
import { Button, ConfirmDialog, IconBadge, Input, ProgressBar, Select, ThemeToggle } from '../components/ui/index';
import toast from 'react-hot-toast';
import { parseMoneyInput, formatCurrency, getCurrentPeriod } from '../utils/formatters';
import { ensureMobileNotificationPermission } from '../utils/mobileNotifications';
import { periodKey, shouldFetchKey } from '../utils/cacheKeys';

const isUnusedDivision = (label = '') => String(label).trim().toLowerCase() === 'unused';

export default function Settings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { active: strategy, activeKey: strategyKey, emergencyFundBalance } = useSelector((s) => s.strategy);
  const { undoStack, redoStack, isApplying } = useSelector((s) => s.history);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    profile: { ...user?.profile } || {},
  });
  const [prefs, setPrefs] = useState({ ...user?.preferences });
  const [saving, setSaving] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState({ divisionLabel: '', amount: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [dailyUsage, setDailyUsage] = useState({ spent: 0, loading: false });
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    const currentPeriod = getCurrentPeriod();
    if (shouldFetchKey(strategyKey, periodKey(currentPeriod))) dispatch(fetchActiveStrategy(currentPeriod));
  }, [dispatch, strategyKey]);

  useEffect(() => {
    setProfile({
      name: user?.name || '',
      profile: { ...user?.profile } || {},
    });
    setPrefs({ ...user?.preferences });
  }, [user]);

  useEffect(() => {
    const loadTodaySpending = async () => {
      setDailyUsage((current) => ({ ...current, loading: true }));
      try {
        const now = new Date();
        const { data } = await expenseAPI.getAll({
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          limit: 200,
        });
        const todayKey = now.toDateString();
        const spent = (data.expenses || []).reduce((sum, expense) => {
          const expenseDate = new Date(expense.date);
          if (Number.isNaN(expenseDate.getTime()) || expenseDate.toDateString() !== todayKey) return sum;
          return sum + (Number(expense.amount) || 0);
        }, 0);
        setDailyUsage({ spent, loading: false });
      } catch {
        setDailyUsage({ spent: 0, loading: false });
      }
    };
    loadTodaySpending();
  }, []);

  const setP = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  const setProf = (key, value) => setProfile((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  const setPref = (key, value) => setPrefs((current) => ({ ...current, [key]: value }));

  const saveProfile = async () => {
    setSaving(true);
    dispatch(startOperation('Saving profile...'));
    try {
      let payload = profile;
      if (avatarFile) {
        payload = new FormData();
        payload.append('name', profile.name || '');
        payload.append('profile', JSON.stringify(profile.profile || {}));
        payload.append('avatar', avatarFile);
      }

      await userAPI.updateProfile(payload);
      await dispatch(fetchProfile());
      setAvatarFile(null);
      toast.success('Profile updated.');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      dispatch(endOperation());
      setSaving(false);
    }
  };

  const savePrefs = async () => {
    setSaving(true);
    dispatch(startOperation('Saving preferences...'));
    try {
      if (prefs.notifications) {
        const permission = await ensureMobileNotificationPermission();
        if (permission.native && !permission.granted) {
          toast.error('Notification permission is required for mobile alerts.');
          return;
        }
      }
      await userAPI.updatePreferences({
        ...prefs,
        dailyExpenseLimit: parseMoneyInput(prefs.dailyExpenseLimit || 0),
      });
      await dispatch(fetchProfile());
      toast.success('Preferences saved.');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      dispatch(endOperation());
      setSaving(false);
    }
  };

  const resetDailyLimit = async () => {
    setSaving(true);
    dispatch(startOperation('Resetting daily limit...'));
    try {
      const nextPrefs = { ...prefs, dailyExpenseLimit: 0 };
      await userAPI.updatePreferences(nextPrefs);
      setPrefs(nextPrefs);
      await dispatch(fetchProfile());
      toast.success('Daily limit reset.');
    } catch {
      toast.error('Failed to reset daily limit');
    } finally {
      dispatch(endOperation());
      setSaving(false);
    }
  };

  const addEmergencyFund = async (event) => {
    event?.preventDefault?.();
    if (!emergencyForm.divisionLabel || !emergencyForm.amount) {
      toast.error('Choose strategy part and amount.');
      return;
    }

    dispatch(startOperation('Moving money to emergency fund...'));
    try {
      const res = await dispatch(transferToEmergency({
        divisionLabel: emergencyForm.divisionLabel,
        amount: parseMoneyInput(emergencyForm.amount),
      }));

      if (transferToEmergency.fulfilled.match(res)) {
        toast.success('Added to emergency fund.');
        setEmergencyForm({ divisionLabel: '', amount: '' });
        await refreshEmergencyViews();
      } else {
        toast.error(res.payload || 'Failed to add emergency fund');
      }
    } finally {
      dispatch(endOperation());
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login', { replace: true });
  };

  const handleUndo = async () => {
    dispatch(startOperation('Applying undo...'));
    const res = await dispatch(undoLastAction());
    if (undoLastAction.fulfilled.match(res) && res.payload) toast.success('Undo applied.');
    else toast.error(res.payload || 'Nothing to undo.');
    dispatch(endOperation());
  };

  const handleRedo = async () => {
    dispatch(startOperation('Applying redo...'));
    const res = await dispatch(redoLastAction());
    if (redoLastAction.fulfilled.match(res) && res.payload) toast.success('Redo applied.');
    else toast.error(res.payload || 'Nothing to redo.');
    dispatch(endOperation());
  };

  const initials = user?.name?.split(' ').map((name) => name[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const avatarSrc = avatarPreview || user?.avatarUrl || user?.avatar;
  const dailyLimit = parseMoneyInput(prefs.dailyExpenseLimit || 0);
  const dailyPercent = dailyLimit > 0 ? Math.min(100, Math.round((dailyUsage.spent / dailyLimit) * 100)) : 0;
  const dailyLeft = Math.max(dailyLimit - dailyUsage.spent, 0);
  const spendableStrategyDivisions = (strategy?.divisions || []).filter((division) => !isUnusedDivision(division.label));
  const currentMonthRemaining = spendableStrategyDivisions.reduce(
    (sum, division) => sum + Math.max((division.allocatedAmount || 0) - (division.spentAmount || 0), 0),
    0,
  );

  const refreshEmergencyViews = async () => {
    await Promise.all([
      dispatch(fetchActiveStrategy({})),
      dispatch(fetchOverview({})),
      dispatch(fetchFinancialScore()),
      dispatch(fetchProfile()),
    ]);
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      toast.error('Choose an image up to 2 MB.');
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const transferAllRemaining = async () => {
    if (currentMonthRemaining <= 0) {
      toast.error('No remaining strategy amount to transfer.');
      return;
    }

    dispatch(startOperation('Transferring remaining money...'));
    try {
      const res = await dispatch(transferCurrentRemaining(getCurrentPeriod()));
      if (transferCurrentRemaining.fulfilled.match(res)) {
        toast.success('Remaining amount moved to emergency fund.');
        await refreshEmergencyViews();
      } else {
        toast.error(res.payload || 'Failed to transfer remaining amount.');
      }
    } finally {
      dispatch(endOperation());
    }
  };

  return (
    <div className="max-w-5xl space-y-5">
      <ConfirmDialog
        isOpen={!!confirmAction}
        title={confirmAction?.title}
        description={confirmAction?.description}
        confirmLabel={confirmAction?.confirmLabel || 'Confirm'}
        tone={confirmAction?.tone}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          const action = confirmAction?.onConfirm;
          setConfirmAction(null);
          await action?.();
        }}
      />
      <div>
        <h2 className="font-display font-bold text-xl">Settings</h2>
        <p className="text-sm text-text-secondary mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card">
          <h3 className="font-display font-semibold mb-4">Profile</h3>
          <div className="flex items-center gap-4 mb-5 p-4 bg-bg-tertiary rounded-xl">
            {avatarSrc ? (
              <img src={avatarSrc} alt={user?.name || 'Profile'} className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-purple to-accent-green flex items-center justify-center font-bold text-xl text-white">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate">{user?.name}</p>
              <p className="text-sm text-text-secondary truncate">{user?.email}</p>
              <p className="text-xs text-accent-green mt-0.5">Account active</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Profile Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="input file:mr-3 file:rounded-lg file:border-0 file:bg-accent-green file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-black"
              />
            </div>
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
            <Button onClick={() => setConfirmAction({
              title: 'Save profile changes?',
              description: 'Your profile details and photo changes will be updated.',
              confirmLabel: 'Save',
              onConfirm: saveProfile,
            })} loading={saving}>Save Profile</Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <IconBadge icon="shield" color="#3E8EFF" className="h-10 w-10" />
              <div>
                <h3 className="font-display font-semibold">Emergency Fund</h3>
                <p className="text-xs text-text-muted">Add money from an available strategy part.</p>
              </div>
            </div>
            <p className="font-display font-bold text-accent-blue">
              {formatCurrency(emergencyFundBalance || user?.profile?.emergencyFundBalance || 0)}
            </p>
          </div>
          <form onSubmit={(event) => {
            event.preventDefault();
            setConfirmAction({
              title: 'Move to emergency fund?',
              description: `${formatCurrency(parseMoneyInput(emergencyForm.amount || 0))} will be moved from ${emergencyForm.divisionLabel || 'the selected strategy part'} to Emergency Funds.`,
              confirmLabel: 'Move',
              onConfirm: addEmergencyFund,
            });
          }} className="space-y-4">
            <Select
              label="From Strategy Part"
              value={emergencyForm.divisionLabel}
              onChange={(event) => setEmergencyForm((current) => ({ ...current, divisionLabel: event.target.value }))}
              required
            >
              <option value="">Choose strategy part</option>
              {spendableStrategyDivisions.map((division) => (
                <option key={division.label} value={division.label}>
                  {division.label} - left {formatCurrency(Math.max((division.allocatedAmount || 0) - (division.spentAmount || 0), 0))}
                </option>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="submit">Add Emergency Fund</Button>
              <Button
                type="button"
                variant="secondary"
                disabled={currentMonthRemaining <= 0}
                onClick={() => setConfirmAction({
                  title: 'Transfer all remaining money?',
                  description: `${formatCurrency(currentMonthRemaining)} from this month's remaining strategy allocation will be moved into Emergency Funds.`,
                  confirmLabel: 'Transfer All',
                  onConfirm: transferAllRemaining,
                })}
              >
                Transfer All Remaining
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              Remaining this month: <span className="font-semibold text-text-primary">{formatCurrency(currentMonthRemaining)}</span>
            </p>
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
            <div className="rounded-xl bg-bg-tertiary p-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                <IconBadge icon="spent" color="#FF4B6B" className="h-9 w-9" />
                <div>
                  <p className="text-sm font-medium">Daily Expense Limit</p>
                  <p className="text-xs text-text-muted">Notify me when today&apos;s spending crosses this amount.</p>
                </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-muted">Active limit</p>
                  <p className="text-sm font-bold text-text-primary">{dailyLimit > 0 ? formatCurrency(dailyLimit) : 'Off'}</p>
                </div>
              </div>
              {dailyLimit > 0 && (
                <div className="mb-3 rounded-lg bg-bg-secondary p-3">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-text-muted">Today spent</span>
                    <span className="font-semibold text-text-primary">
                      {dailyUsage.loading ? 'Loading...' : `${formatCurrency(dailyUsage.spent)} / ${formatCurrency(dailyLimit)}`}
                    </span>
                  </div>
                  <ProgressBar value={dailyPercent} color={dailyPercent >= 100 ? '#FF4B6B' : dailyPercent >= 75 ? '#F7931A' : '#00E5A0'} />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
                    <span>{dailyPercent}% used</span>
                    <span>{dailyUsage.spent > dailyLimit ? `${formatCurrency(dailyUsage.spent - dailyLimit)} over` : `${formatCurrency(dailyLeft)} left`}</span>
                  </div>
                </div>
              )}
              <Input
                label="Limit Amount (Rs)"
                type="number"
                min="0"
                step="0.01"
                placeholder="Example: 1000"
                value={prefs.dailyExpenseLimit || ''}
                onChange={(event) => setPref('dailyExpenseLimit', event.target.value)}
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-text-muted">Alerts fire at 50%, 75%, 100%, and over limit.</p>
                <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmAction({
                  title: 'Reset daily limit?',
                  description: 'Daily expense limit alerts will be turned off.',
                  confirmLabel: 'Reset',
                  onConfirm: resetDailyLimit,
                })} loading={saving}>
                  Reset Limit
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-bg-tertiary p-3">
              <div>
                <p className="text-sm font-medium">Appearance</p>
                <p className="text-xs text-text-muted">Switch between light and dark mode</p>
              </div>
              <ThemeToggle />
            </div>
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
            <Button onClick={() => setConfirmAction({
              title: 'Save preferences?',
              description: 'Notification, currency, appearance, and daily limit settings will be updated.',
              confirmLabel: 'Save',
              onConfirm: savePrefs,
            })} loading={saving}>Save Preferences</Button>
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
            <Button variant="secondary" size="sm" onClick={() => setConfirmAction({
              title: 'Undo last change?',
              description: 'The most recent tracked change will be reversed.',
              confirmLabel: 'Undo',
              onConfirm: handleUndo,
            })} disabled={isApplying || undoStack.length === 0}>
              Undo
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmAction({
              title: 'Redo last change?',
              description: 'The most recently undone change will be applied again.',
              confirmLabel: 'Redo',
              onConfirm: handleRedo,
            })} disabled={isApplying || redoStack.length === 0}>
              Redo
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmAction({
              title: 'Logout?',
              description: 'This device will return to the login screen.',
              confirmLabel: 'Logout',
              tone: 'danger',
              onConfirm: handleLogout,
            })}>
              Logout
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
