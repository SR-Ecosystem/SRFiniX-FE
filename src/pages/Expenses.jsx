import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchExpenses, addExpense, deleteExpense } from '../features/expenses/expenseSlice';
import { fetchActiveStrategy } from '../features/strategy/strategySlice';
import { fetchOverview } from '../features/analytics/analyticsSlice';
import { Button, Modal, Input, Select, EmptyState, Spinner } from '../components/ui/index';
import { formatCurrency, timeAgo, getCurrentPeriod } from '../utils/formatters';
import { CATEGORIES, PAYMENT_METHODS } from '../constants/categories';

const CATEGORY_LIST = Object.entries(CATEGORIES).map(([value, meta]) => ({ value, ...meta }));

function AddExpenseModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((s) => s.expenses);
  const { active: strategy } = useSelector((s) => s.strategy);
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
  const strategyDivisions = strategy?.divisions || [];

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
    const res = await dispatch(addExpense({ ...form, amount: Number(form.amount) }));
    if (addExpense.fulfilled.match(res)) {
      resetForm();
      dispatch(fetchActiveStrategy({}));
      dispatch(fetchOverview({}));
      onClose();
    } else { setError(res.payload || 'Failed to add expense'); }
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
            {CATEGORY_LIST.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
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
            <Input label="Emergency Fund" value="Use emergency reserve" readOnly />
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
  const { list, isLoading } = useSelector((s) => s.expenses);
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState('');
  const { month, year } = getCurrentPeriod();

  useEffect(() => {
    dispatch(fetchExpenses({ month, year }));
    dispatch(fetchActiveStrategy({ month, year }));
    dispatch(fetchOverview({ month, year }));
  }, [dispatch]);

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
    dispatch(fetchExpenses({ month, year, category: c || undefined }));
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this expense?')) dispatch(deleteExpense(id));
  };

  // Category totals
  const catTotals = {};
  list.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const totalSpent = list.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-5 max-w-5xl">
      <AddExpenseModal isOpen={showModal} onClose={() => setShowModal(false)} />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Expense Tracker</h2>
          <p className="text-sm text-text-secondary mt-0.5">{list.length} transactions · {formatCurrency(totalSpent)} spent</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Expense</Button>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleFilter('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${!filterCat ? 'bg-accent-green/10 border-accent-green/30 text-accent-green' : 'bg-bg-secondary border-white/[0.07] text-text-secondary hover:border-white/20'}`}
        >
          All · {formatCurrency(totalSpent)}
        </button>
        {CATEGORY_LIST.filter((c) => catTotals[c.value]).map((c) => (
          <button
            key={c.value}
            onClick={() => handleFilter(c.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${filterCat === c.value ? 'border-white/30 text-text-primary' : 'bg-bg-secondary border-white/[0.07] text-text-secondary hover:border-white/20'}`}
            style={filterCat === c.value ? { background: c.bg, borderColor: c.color + '40', color: c.color } : {}}
          >
            {c.icon} {c.label} · {formatCurrency(catTotals[c.value])}
          </button>
        ))}
      </div>

      {/* Expense list */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Spinner /></div>
        ) : list.length === 0 ? (
          <EmptyState icon="📭" title="No expenses yet" description="Start tracking your spending by adding your first expense." action={<Button onClick={() => setShowModal(true)}>+ Add First Expense</Button>} />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {list.map((exp) => {
              const cat = CATEGORIES[exp.category];
              return (
                <motion.div
                  key={exp._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4 py-3.5 group"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: cat?.bg }}>
                    {cat?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{exp.description}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {cat?.label} · {exp.strategyDivision || 'Strategy'} · {exp.paymentMethod?.toUpperCase()} · {timeAgo(exp.date)}
                      {exp.notes && ` · ${exp.notes}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-semibold text-accent-red">-{formatCurrency(exp.amount)}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{new Date(exp.date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(exp._id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all ml-2 text-sm"
                  >
                    🗑
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
