import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchGoals, createGoal, deleteGoal, contributeToGoal } from '../features/goals/goalSlice';
import { endOperation, startOperation } from '../features/ui/uiSlice';
import { Button, Modal, Input, Select, EmptyState, ComponentLoader, ConfirmDialog, ProgressBar, IconBadge } from '../components/ui/index';
import { queryKey, shouldFetchKey } from '../utils/cacheKeys';
import { formatCurrency, getProgress, monthsUntil, parseMoneyInput } from '../utils/formatters';
import { GOAL_CATEGORIES } from '../constants/categories';
import toast from 'react-hot-toast';

function GoalModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ title: '', targetAmount: '', targetDate: '', category: 'other', icon: 'target', priority: 'medium' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.targetAmount) { setError('Title and target amount are required.'); return; }
    setLoading(true);
    dispatch(startOperation('Creating goal...'));
    const catMeta = GOAL_CATEGORIES.find((c) => c.value === form.category);
    try {
      const res = await dispatch(createGoal({ ...form, targetAmount: parseMoneyInput(form.targetAmount), icon: catMeta?.icon || 'target' }));
      if (createGoal.fulfilled.match(res)) {
        setForm({ title: '', targetAmount: '', targetDate: '', category: 'other', icon: 'target', priority: 'medium' });
        toast.success('Goal created.');
        onClose();
      } else {
        setError(res.payload || 'Failed to create goal');
        toast.error(res.payload || 'Failed to create goal');
      }
    } finally {
      setLoading(false);
      dispatch(endOperation());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Goal">
      {error && <div className="bg-accent-red/10 border border-accent-red/20 rounded-xl p-3 mb-4 text-accent-red text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Goal Title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="iPhone 16 Pro" required />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Target Amount (₹)" type="number" value={form.targetAmount} onChange={(e) => set('targetAmount', e.target.value)} placeholder="120000" required />
          <Input label="Target Date" type="date" value={form.targetDate} onChange={(e) => set('targetDate', e.target.value)} />
        </div>
        <Select label="Category" value={form.category} onChange={(e) => set('category', e.target.value)}>
          {GOAL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
        <Select label="Priority" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </Select>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Cancel</Button>
          <Button type="submit" loading={loading} className="flex-1 justify-center">Create Goal</Button>
        </div>
      </form>
    </Modal>
  );
}

function ContributeModal({ goal, onClose }) {
  const dispatch = useDispatch();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    dispatch(startOperation('Adding contribution...'));
    try {
      const res = await dispatch(contributeToGoal({ id: goal._id, data: { amount: parseMoneyInput(amount), note } }));
      if (contributeToGoal.fulfilled.match(res)) toast.success('Contribution added.');
      else toast.error(res.payload || 'Failed to add contribution.');
      onClose();
    } finally {
      setLoading(false);
      dispatch(endOperation());
    }
  };

  return (
    <Modal isOpen={!!goal} onClose={onClose} title={`Add to: ${goal?.title}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-bg-tertiary rounded-xl p-4 text-center">
          <IconBadge icon={goal?.icon || 'target'} color={goal?.color || '#7B6EF6'} className="mx-auto mb-3 h-14 w-14" iconClassName="h-7 w-7" />
          <p className="text-sm text-text-secondary mb-1">{formatCurrency(goal?.currentAmount)} saved</p>
          <ProgressBar value={getProgress(goal?.currentAmount, goal?.targetAmount)} color={goal?.color} className="mb-1" />
          <p className="text-xs text-text-muted">{getProgress(goal?.currentAmount, goal?.targetAmount)}% of {formatCurrency(goal?.targetAmount)}</p>
        </div>
        <Input label="Amount to Add (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" required />
        <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Monthly saving" />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Cancel</Button>
          <Button type="submit" loading={loading} className="flex-1 justify-center">Add Contribution</Button>
        </div>
      </form>
    </Modal>
  );
}

const PRIORITY_COLORS = { high: '#FF4B6B', medium: '#F7931A', low: '#8B91A7' };
const PendingSyncBadge = () => (
  <span className="inline-flex rounded-full border border-accent-orange/25 bg-accent-orange/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-orange">
    Pending sync
  </span>
);

export default function Goals() {
  const dispatch = useDispatch();
  const { list, queryKey: goalsKey, isLoading } = useSelector((s) => s.goals);
  const [showCreate, setShowCreate] = useState(false);
  const [contributeGoal, setContributeGoal] = useState(null);
  const [deleteGoalId, setDeleteGoalId] = useState(null);
  const [tab, setTab] = useState('active');

  useEffect(() => {
    if (shouldFetchKey(goalsKey, queryKey({}))) dispatch(fetchGoals({}));
  }, [dispatch, goalsKey]);

  const filtered = list.filter((g) => tab === 'active' ? !g.isCompleted : g.isCompleted);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <GoalModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      {contributeGoal && <ContributeModal goal={contributeGoal} onClose={() => setContributeGoal(null)} />}
      <ConfirmDialog
        isOpen={!!deleteGoalId}
        title="Delete goal?"
        description="This savings goal and its progress will be removed."
        confirmLabel="Delete"
        tone="danger"
        onClose={() => setDeleteGoalId(null)}
        onConfirm={async () => {
          dispatch(startOperation('Deleting goal...'));
          try {
            const res = await dispatch(deleteGoal(deleteGoalId));
            if (deleteGoal.fulfilled.match(res)) toast.success('Goal deleted.');
            else toast.error(res.payload || 'Failed to delete goal.');
            setDeleteGoalId(null);
          } finally {
            dispatch(endOperation());
          }
        }}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Savings Goals</h2>
          <p className="text-sm text-text-secondary mt-0.5">{filtered.length} {tab} goals</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New Goal</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['active', 'completed'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-accent-green/10 border border-accent-green/30 text-accent-green' : 'bg-bg-secondary border border-white/[0.07] text-text-secondary'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({list.filter((g) => t === 'active' ? !g.isCompleted : g.isCompleted).length})
          </button>
        ))}
      </div>

      {isLoading ? (
        <ComponentLoader label="Loading goals..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="target"
          title={tab === 'active' ? 'No active goals' : 'No completed goals yet'}
          description={tab === 'active' ? 'Create your first savings goal to get started.' : 'Complete your goals to see them here.'}
          action={tab === 'active' ? <Button onClick={() => setShowCreate(true)}>+ Create Goal</Button> : null}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((goal) => {
            const pct = getProgress(goal.currentAmount, goal.targetAmount);
            const months = goal.targetDate ? monthsUntil(goal.targetDate) : null;
            return (
              <motion.div key={goal._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card hover:border-white/15 transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <IconBadge icon={goal.icon || 'target'} color={goal.color || '#7B6EF6'} className="h-11 w-11 flex-shrink-0" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-semibold">{goal.title}</h3>
                        {goal.offlinePending && <PendingSyncBadge />}
                      </div>
                      <p className="text-xs text-text-muted capitalize">{goal.category} / {goal.priority} priority</p>
                    </div>
                  </div>
                  {goal.isCompleted ? (
                    <span className="badge-green">Done</span>
                  ) : (
                    <span className="text-xs font-bold" style={{ color: PRIORITY_COLORS[goal.priority] }}>●</span>
                  )}
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-text-muted">{formatCurrency(goal.currentAmount)} saved</span>
                    <span className="font-semibold" style={{ color: goal.color }}>{pct}%</span>
                  </div>
                  <ProgressBar value={pct} color={goal.color} />
                  <div className="flex justify-between text-[10px] text-text-muted mt-1">
                    <span>Target: {formatCurrency(goal.targetAmount)}</span>
                    <span>{formatCurrency(goal.targetAmount - goal.currentAmount)} remaining</span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid sm:grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Monthly', value: formatCurrency(goal.monthlyContribution) },
                    { label: 'Remaining', value: formatCurrency(goal.targetAmount - goal.currentAmount) },
                    { label: months ? `${months}mo left` : 'No date', value: goal.targetDate ? new Date(goal.targetDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : '-' },
                  ].map((s) => (
                    <div key={s.label} className="bg-bg-tertiary rounded-lg p-2 text-center">
                      <p className="text-[10px] text-text-muted">{s.label}</p>
                      <p className="text-xs font-semibold font-display mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {!goal.isCompleted && (
                  <div className="flex gap-2">
                    <Button onClick={() => setContributeGoal(goal)} className="flex-1 justify-center" size="sm">
                      + Contribute
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteGoalId(goal._id)}>
                      <IconBadge icon="trash" color="#FF4B6B" className="h-7 w-7" />
                    </Button>
                  </div>
                )}

                {goal.isCompleted && (
                  <div className="bg-accent-green/10 border border-accent-green/20 rounded-xl p-3 text-center">
                    <p className="text-accent-green font-semibold text-sm">Goal complete. Ready to buy.</p>
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Add new card */}
          {tab === 'active' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowCreate(true)}
              className="border-2 border-dashed border-white/10 rounded-card flex items-center justify-center flex-col gap-2 cursor-pointer min-h-[200px] hover:border-accent-green/30 transition-colors group"
            >
              <span className="text-3xl opacity-30 group-hover:opacity-60 transition-opacity">+</span>
              <span className="text-sm text-text-muted group-hover:text-text-secondary transition-colors">New goal</span>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
