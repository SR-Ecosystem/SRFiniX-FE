import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { fetchIncome, addIncome, deleteIncome } from '../features/income/incomeSlice';
import { Button, Modal, Input, Select, EmptyState, Spinner, StatCard } from '../components/ui/index';
import { formatCurrency, getCurrentPeriod, timeAgo } from '../utils/formatters';
import { INCOME_TYPES } from '../constants/categories';

function AddIncomeModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ type: 'salary', amount: '', source: '', description: '', isRecurring: false, date: new Date().toISOString().split('T')[0] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount) { setError('Amount is required.'); return; }
    setLoading(true);
    const res = await dispatch(addIncome({ ...form, amount: Number(form.amount) }));
    setLoading(false);
    if (addIncome.fulfilled.match(res)) { setForm({ type: 'salary', amount: '', source: '', description: '', isRecurring: false, date: new Date().toISOString().split('T')[0] }); onClose(); }
    else { setError(res.payload || 'Failed to add income'); }
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

const TYPE_ICONS = { salary: '💼', side: '💻', freelance: '🎨', onetime: '🎁', additional: '➕', other: '📦' };
const TYPE_COLORS = { salary: '#00E5A0', side: '#7B6EF6', freelance: '#F7931A', onetime: '#3E8EFF', additional: '#00E5A0', other: '#8B91A7' };

export default function Income() {
  const dispatch = useDispatch();
  const { list, total, isLoading } = useSelector((s) => s.income);
  const [showModal, setShowModal] = useState(false);
  const { month, year } = getCurrentPeriod();

  useEffect(() => { dispatch(fetchIncome({ month, year })); }, [dispatch]);

  const byType = {};
  list.forEach((i) => { byType[i.type] = (byType[i.type] || 0) + i.amount; });

  return (
    <div className="space-y-5 max-w-5xl">
      <AddIncomeModal isOpen={showModal} onClose={() => setShowModal(false)} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Income Manager</h2>
          <p className="text-sm text-text-secondary mt-0.5">{list.length} sources · {formatCurrency(total)} total</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Income</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard label="Total Income" value={formatCurrency(total)} icon="💰" color="#00E5A0" />
        <StatCard label="Salary" value={formatCurrency(byType.salary || 0)} icon="💼" color="#3E8EFF" />
        <StatCard label="Side Income" value={formatCurrency((byType.side || 0) + (byType.freelance || 0))} icon="💻" color="#7B6EF6" />
        <StatCard label="One-time" value={formatCurrency(byType.onetime || 0)} icon="🎁" color="#F7931A" />
      </div>

      {/* Income list */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Spinner /></div>
        ) : list.length === 0 ? (
          <EmptyState icon="💰" title="No income records" description="Add your income sources to start tracking." action={<Button onClick={() => setShowModal(true)}>+ Add Income</Button>} />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {list.map((inc) => (
              <motion.div key={inc._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 py-3.5 group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: `${TYPE_COLORS[inc.type]}15` }}>
                  {TYPE_ICONS[inc.type] || '💰'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{inc.source || inc.description || 'Income'}</p>
                  <p className="text-xs text-text-muted mt-0.5 capitalize">
                    {inc.type} {inc.isRecurring ? '· Recurring' : ''} · {timeAgo(inc.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-semibold text-accent-green">+{formatCurrency(inc.amount)}</p>
                  <p className="text-[10px] text-text-muted">{new Date(inc.date).toLocaleDateString('en-IN')}</p>
                </div>
                <button
                  onClick={() => dispatch(deleteIncome(inc._id))}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all ml-2 text-sm"
                >🗑</button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
