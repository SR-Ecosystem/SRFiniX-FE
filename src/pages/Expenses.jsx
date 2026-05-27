import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchExpenses, addExpense, deleteExpense } from '../features/expenses/expenseSlice';
import { fetchActiveStrategy } from '../features/strategy/strategySlice';
import { fetchOverview } from '../features/analytics/analyticsSlice';
import { endOperation, startOperation } from '../features/ui/uiSlice';
import { Button, Modal, Input, Select, EmptyState, ComponentLoader, ConfirmDialog, IconBadge } from '../components/ui/index';
import { formatCurrency, timeAgo, getAccountStartPeriod, getCurrentPeriod, getPeriodLabel, parseMoneyInput } from '../utils/formatters';
import { CATEGORIES, PAYMENT_METHODS } from '../constants/categories';
import { PeriodFilter } from '../components/ui/PeriodFilter';
import { periodKey, queryKey, shouldFetchKey } from '../utils/cacheKeys';
import toast from 'react-hot-toast';

const CATEGORY_LIST = Object.entries(CATEGORIES).map(([value, meta]) => ({ value, ...meta }));
const isUnusedDivision = (label = '') => String(label).trim().toLowerCase() === 'unused';
const PendingSyncBadge = () => (
  <span className="mt-1 inline-flex rounded-full border border-accent-orange/25 bg-accent-orange/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-orange">
    Pending sync
  </span>
);

function AddExpenseModal({ isOpen, onClose, period }) {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((s) => s.expenses);
  const { active: strategy, emergencyFundBalance } = useSelector((s) => s.strategy);
  const [form, setForm] = useState({
    amount: '',
    category: 'food',
    description: '',
    notes: '',
    paymentMethod: 'cash',
    fundingSource: 'strategy',
    strategyDivision: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');
  const strategyDivisions = (strategy?.divisions || []).filter((division) => !isUnusedDivision(division.label));

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const resetForm = () => setForm({
    amount: '',
    category: 'food',
    description: '',
    notes: '',
    paymentMethod: 'cash',
    fundingSource: 'strategy',
    strategyDivision: strategyDivisions[0]?.label || '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isOpen && strategyDivisions.length > 0 && !form.strategyDivision) {
      set('strategyDivision', strategyDivisions[0].label);
    }
  }, [isOpen, strategyDivisions.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.description) { setError('Amount and description are required.'); return; }
    if (form.fundingSource === 'strategy' && strategyDivisions.length > 0 && !form.strategyDivision) {
      setError('Choose which strategy part this expense should cut from.');
      return;
    }
    const numericAmount = parseMoneyInput(form.amount);
    if (form.fundingSource === 'emergency' && numericAmount > (emergencyFundBalance || 0)) {
      setError(`Emergency Fund has ${formatCurrency(emergencyFundBalance || 0)} available.`);
      return;
    }
    const payload = new FormData();
    Object.entries({ ...form, amount: numericAmount }).forEach(([key, value]) => {
      payload.append(key, value ?? '');
    });

    dispatch(startOperation('Adding expense...'));
    try {
      const res = await dispatch(addExpense(payload));
      if (addExpense.fulfilled.match(res)) {
        resetForm();
        await Promise.allSettled([
          dispatch(fetchExpenses({ ...period, limit: 200 })),
          dispatch(fetchActiveStrategy(period)),
          dispatch(fetchOverview(period)),
        ]);
        onClose();
        toast.success('Expense added and balances updated.');
      } else {
        setError(res.payload || 'Failed to add expense');
        toast.error(res.payload || 'Failed to add expense');
      }
    } finally {
      dispatch(endOperation());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Expense">
      {error && <div className="bg-accent-red/10 border border-accent-red/20 rounded-xl p-3 mb-4 text-accent-red text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Amount (₹)" type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="500" required />
          <Input label="Date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <Input label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Swiggy dinner order" required />
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Category" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORY_LIST.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Select label="Payment Method" value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Cut Amount From" value={form.fundingSource} onChange={(e) => set('fundingSource', e.target.value)}>
            <option value="strategy">Monthly Strategy</option>
            <option value="emergency">Emergency Fund</option>
          </Select>
          {form.fundingSource === 'strategy' ? (
            <Select label="Strategy Part" value={form.strategyDivision} onChange={(e) => set('strategyDivision', e.target.value)}>
              {strategyDivisions.length === 0 && <option value="">No active strategy</option>}
              {strategyDivisions.map((division) => (
                <option key={division.label} value={division.label}>
                  {division.label} - left {formatCurrency(Math.max((division.allocatedAmount || 0) - (division.spentAmount || 0), 0))}
                </option>
              ))}
            </Select>
          ) : (
            <Input label="Emergency Fund" value={`Available reserve: ${formatCurrency(emergencyFundBalance || 0)}`} readOnly />
          )}
        </div>
        <Input label="Notes (optional)" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes..." />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Cancel</Button>
          <Button type="submit" loading={isLoading} className="flex-1 justify-center">Add Expense</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Expenses() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { list, queryKey: expensesKey, isLoading } = useSelector((s) => s.expenses);
  const { activeKey: strategyKey } = useSelector((s) => s.strategy);
  const { overviewKey } = useSelector((s) => s.analytics);
  const { user } = useSelector((s) => s.auth);
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [period, setPeriod] = useState(getCurrentPeriod());

  useEffect(() => {
    const key = periodKey(period);
    if (shouldFetchKey(expensesKey, queryKey({ ...period, limit: 200 }))) dispatch(fetchExpenses({ ...period, limit: 200 }));
    if (shouldFetchKey(strategyKey, key)) dispatch(fetchActiveStrategy(period));
    if (shouldFetchKey(overviewKey, key)) dispatch(fetchOverview(period));
  }, [dispatch, period, expensesKey, strategyKey, overviewKey]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === '1') {
      setShowModal(true);
      navigate('/expenses', { replace: true });
    }
  }, [location.search, navigate]);

  const handleFilter = (cat) => {
    const c = cat === filterCat ? '' : cat;
    setFilterCat(c);
    dispatch(fetchExpenses({ ...period, category: c || undefined, limit: 200 }));
  };

  const handleDelete = async (id) => {
    dispatch(startOperation('Deleting expense...'));
    try {
      const res = await dispatch(deleteExpense(id));
      await Promise.allSettled([
        dispatch(fetchExpenses({ ...period, limit: 200 })),
        dispatch(fetchActiveStrategy(period)),
        dispatch(fetchOverview(period)),
      ]);
      if (deleteExpense.fulfilled.match(res)) toast.success('Expense deleted and amount restored.');
      else toast.error(res.payload || 'Failed to delete expense.');
      setDeleteId(null);
    } finally {
      dispatch(endOperation());
    }
  };

  // Category totals
  const catTotals = {};
  list.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const totalSpent = list.reduce((s, e) => s + e.amount, 0);
  const accountStartPeriod = getAccountStartPeriod(user?.createdAt);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <AddExpenseModal isOpen={showModal} onClose={() => setShowModal(false)} period={period} />
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete expense?"
        description="This expense will be removed and the affected strategy or emergency balance will be adjusted."
        confirmLabel="Delete"
        tone="danger"
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-xl">Expense Tracker</h2>
          <p className="text-sm text-text-secondary mt-0.5">{getPeriodLabel(period)} / {list.length} transactions / {formatCurrency(totalSpent)} spent</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter period={period} minPeriod={accountStartPeriod} onChange={setPeriod} compact className="rounded-xl border border-border bg-bg-secondary p-1 shadow-sm" />
          <Button onClick={() => setShowModal(true)}>+ Add Expense</Button>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleFilter('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${!filterCat ? 'bg-accent-green/10 border-accent-green/30 text-accent-green' : 'bg-bg-secondary border-white/[0.07] text-text-secondary hover:border-white/20'}`}
        >
          All / {formatCurrency(totalSpent)}
        </button>
        {CATEGORY_LIST.filter((c) => catTotals[c.value]).map((c) => (
          <button
            key={c.value}
            onClick={() => handleFilter(c.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${filterCat === c.value ? 'border-white/30 text-text-primary' : 'bg-bg-secondary border-white/[0.07] text-text-secondary hover:border-white/20'}`}
            style={filterCat === c.value ? { background: c.bg, borderColor: c.color + '40', color: c.color } : {}}
          >
            {c.label} / {formatCurrency(catTotals[c.value])}
          </button>
        ))}
      </div>

      {/* Expense list */}
      <div className="card">
        {isLoading ? (
          <ComponentLoader label="Loading expenses..." />
        ) : list.length === 0 ? (
          <EmptyState icon="package" title="No expenses yet" description="Start tracking your spending by adding your first expense." action={<Button onClick={() => setShowModal(true)}>+ Add First Expense</Button>} />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {list.map((exp) => {
              const cat = CATEGORIES[exp.category];
              return (
                <motion.div
                  key={exp._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group flex items-start gap-3 py-3.5 sm:gap-4"
                >
                  <IconBadge icon={cat?.icon} color={cat?.color} className="h-10 w-10 flex-shrink-0" />
                  {exp.attachments?.[0]?.dataUrl && (
                    <img
                      src={exp.attachments[0].dataUrl}
                      alt={exp.attachments[0].filename || 'Expense attachment'}
                      className="h-10 w-10 flex-shrink-0 rounded-xl border border-border object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-text-primary">{exp.description}</p>
                    <p className="mt-1 text-xs leading-snug text-text-muted">
                      {cat?.label} / {exp.strategyDivision || 'Strategy'} / {exp.paymentMethod?.toUpperCase()} / {timeAgo(exp.date)}
                      {exp.notes && ` / ${exp.notes}`}
                    </p>
                  </div>
                  <div className="min-w-[76px] flex-shrink-0 text-right sm:min-w-[92px]">
                    <p className="font-display text-sm font-semibold text-accent-red sm:text-base">-{formatCurrency(exp.amount)}</p>
                    <p className="mt-1 text-[10px] text-text-muted">{new Date(exp.date).toLocaleDateString('en-IN')}</p>
                    {exp.offlinePending && <PendingSyncBadge />}
                  </div>
                  <button
                    onClick={() => setDeleteId(exp._id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all ml-2 text-sm"
                  >
                    <IconBadge icon="trash" color="#FF4B6B" className="h-8 w-8" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
