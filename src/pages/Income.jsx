import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { fetchIncome, addIncome, deleteIncome } from '../features/income/incomeSlice';
import { fetchActiveStrategy } from '../features/strategy/strategySlice';
import { fetchOverview } from '../features/analytics/analyticsSlice';
import { endOperation, startOperation } from '../features/ui/uiSlice';
import { Button, Modal, Input, Select, EmptyState, ComponentLoader, StatCard, IconBadge, ConfirmDialog } from '../components/ui/index';
import { formatCurrency, getAccountStartPeriod, getCurrentPeriod, getPeriodLabel, parseMoneyInput, timeAgo } from '../utils/formatters';
import { INCOME_TYPES } from '../constants/categories';
import { PeriodFilter } from '../components/ui/PeriodFilter';
import { periodKey, shouldFetchKey } from '../utils/cacheKeys';
import toast from 'react-hot-toast';

function AddIncomeModal({ isOpen, onClose, period }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ type: 'salary', amount: '', source: '', description: '', isRecurring: false, date: new Date().toISOString().split('T')[0] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount) { setError('Amount is required.'); return; }
    setLoading(true);
    dispatch(startOperation('Adding income...'));
    try {
      const res = await dispatch(addIncome({ ...form, amount: parseMoneyInput(form.amount) }));
      if (addIncome.fulfilled.match(res)) {
        await Promise.allSettled([
          dispatch(fetchIncome(period)),
          dispatch(fetchActiveStrategy(period)),
          dispatch(fetchOverview(period)),
        ]);
        setForm({ type: 'salary', amount: '', source: '', description: '', isRecurring: false, date: new Date().toISOString().split('T')[0] });
        onClose();
        toast.success('Income added and strategy updated.');
      }
      else {
        setError(res.payload || 'Failed to add income');
        toast.error(res.payload || 'Failed to add income');
      }
    } finally {
      setLoading(false);
      dispatch(endOperation());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Income">
      {error && <div className="bg-accent-red/10 border border-accent-red/20 rounded-xl p-3 mb-4 text-accent-red text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Amount (₹)" type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="85000" required />
          <Input label="Date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <Select label="Income Type" value={form.type} onChange={(e) => set('type', e.target.value)}>
          {INCOME_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Input label="Source" value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="Company Name / Client" />
        <Input label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="May 2025 salary" />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isRecurring} onChange={(e) => set('isRecurring', e.target.checked)} className="w-4 h-4 rounded" />
          <span className="text-sm text-text-secondary">Recurring income</span>
        </label>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Cancel</Button>
          <Button type="submit" loading={loading} className="flex-1 justify-center">Add Income</Button>
        </div>
      </form>
    </Modal>
  );
}

const TYPE_ICONS = { salary: 'salary', side: 'laptop', freelance: 'briefcase', onetime: 'income', additional: 'savings', other: 'package' };
const TYPE_COLORS = { salary: '#00E5A0', side: '#7B6EF6', freelance: '#F7931A', onetime: '#3E8EFF', additional: '#00E5A0', other: '#8B91A7' };
const PendingSyncBadge = () => (
  <span className="mt-1 inline-flex rounded-full border border-accent-orange/25 bg-accent-orange/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-orange">
    Pending sync
  </span>
);

export default function Income() {
  const dispatch = useDispatch();
  const { list, total, periodKey: incomeKey, isLoading } = useSelector((s) => s.income);
  const { user } = useSelector((s) => s.auth);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [period, setPeriod] = useState(getCurrentPeriod());

  useEffect(() => {
    if (shouldFetchKey(incomeKey, periodKey(period))) dispatch(fetchIncome(period));
  }, [dispatch, period, incomeKey]);

  const byType = {};
  list.forEach((i) => { byType[i.type] = (byType[i.type] || 0) + i.amount; });
  const accountStartPeriod = getAccountStartPeriod(user?.createdAt);

  const handleDeleteIncome = async (id) => {
    dispatch(startOperation('Deleting income...'));
    try {
      const res = await dispatch(deleteIncome(id));
      await Promise.allSettled([
        dispatch(fetchIncome(period)),
        dispatch(fetchActiveStrategy(period)),
        dispatch(fetchOverview(period)),
      ]);
      if (deleteIncome.fulfilled.match(res)) toast.success('Income deleted and strategy recalculated.');
      else toast.error(res.payload || 'Failed to delete income.');
      setDeleteId(null);
    } finally {
      dispatch(endOperation());
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <AddIncomeModal isOpen={showModal} onClose={() => setShowModal(false)} period={period} />
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete income?"
        description="This income will be removed and the strategy allocation for this month will be recalculated."
        confirmLabel="Delete"
        tone="danger"
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDeleteIncome(deleteId)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-xl">Income Manager</h2>
          <p className="text-sm text-text-secondary mt-0.5">{getPeriodLabel(period)} / {list.length} sources / {formatCurrency(total)} total</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter period={period} minPeriod={accountStartPeriod} onChange={setPeriod} compact className="rounded-xl border border-border bg-bg-secondary p-1 shadow-sm" />
          <Button onClick={() => setShowModal(true)}>+ Add Income</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard label="Total Income" value={formatCurrency(total)} icon="money" color="#00E5A0" />
        <StatCard label="Salary" value={formatCurrency(byType.salary || 0)} icon="salary" color="#3E8EFF" />
        <StatCard label="Side Income" value={formatCurrency((byType.side || 0) + (byType.freelance || 0))} icon="laptop" color="#7B6EF6" />
        <StatCard label="One-time" value={formatCurrency(byType.onetime || 0)} icon="income" color="#F7931A" />
      </div>

      {/* Income list */}
      <div className="card">
        {isLoading ? (
          <ComponentLoader label="Loading income..." />
        ) : list.length === 0 ? (
          <EmptyState icon="money" title="No income records" description="Add your income sources to start tracking." action={<Button onClick={() => setShowModal(true)}>+ Add Income</Button>} />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {list.map((inc) => (
              <motion.div key={inc._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group flex items-start gap-3 py-3.5 sm:gap-4">
                <IconBadge icon={TYPE_ICONS[inc.type] || 'money'} color={TYPE_COLORS[inc.type] || '#00E5A0'} className="h-10 w-10 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-text-primary">{inc.source || inc.description || 'Income'}</p>
                  <p className="mt-1 text-xs capitalize leading-snug text-text-muted">
                    {inc.type} {inc.isRecurring ? '/ Recurring' : ''} / {timeAgo(inc.date)}
                  </p>
                  {inc.description && inc.description !== inc.source && (
                    <p className="mt-1 text-xs leading-snug text-text-secondary line-clamp-2">{inc.description}</p>
                  )}
                </div>
                <div className="min-w-[82px] flex-shrink-0 text-right sm:min-w-[96px]">
                  <p className="font-display text-sm font-semibold text-accent-green sm:text-base">+{formatCurrency(inc.amount)}</p>
                  <p className="mt-1 text-[10px] text-text-muted">{new Date(inc.date).toLocaleDateString('en-IN')}</p>
                  {inc.offlinePending && <PendingSyncBadge />}
                </div>
                <button
                  onClick={() => setDeleteId(inc._id)}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all ml-2 text-sm"
                >
                  <IconBadge icon="trash" color="#FF4B6B" className="h-8 w-8" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
