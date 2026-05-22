import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { fetchActiveStrategy, fetchPredefined, createStrategy } from '../features/strategy/strategySlice';
import { fetchIncome } from '../features/income/incomeSlice';
import { Button, Spinner, ProgressBar } from '../components/ui/index';
import { formatCurrency } from '../utils/formatters';
import { STRATEGY_COLORS } from '../constants/categories';
import toast from 'react-hot-toast';

export default function Strategy() {
  const dispatch = useDispatch();
  const { active, predefined, isLoading } = useSelector((s) => s.strategy);
  const { total: totalIncome } = useSelector((s) => s.income);

  const [mode, setMode] = useState('view'); // view | pick | custom
  const [customDivisions, setCustomDivisions] = useState([
    { label: 'Needs', percentage: 50, color: '#00E5A0' },
    { label: 'Wants', percentage: 30, color: '#7B6EF6' },
    { label: 'Savings', percentage: 20, color: '#F7931A' },
  ]);

  useEffect(() => {
    dispatch(fetchActiveStrategy({}));
    dispatch(fetchPredefined());
    dispatch(fetchIncome({}));
  }, [dispatch]);

  const totalPct = customDivisions.reduce((s, d) => s + d.percentage, 0);

  const handlePickPredefined = async (s) => {
    const res = await dispatch(createStrategy({ name: s.name, type: 'predefined', divisions: s.divisions }));
    if (createStrategy.fulfilled.match(res)) { toast.success(`${s.name} strategy activated!`); setMode('view'); }
    else { toast.error('Failed to apply strategy'); }
  };

  const handleSaveCustom = async () => {
    if (Math.round(totalPct) !== 100) { toast.error('Divisions must total 100%'); return; }
    const res = await dispatch(createStrategy({ name: 'Custom', type: 'custom', divisions: customDivisions }));
    if (createStrategy.fulfilled.match(res)) { toast.success('Custom strategy saved!'); setMode('view'); }
    else { toast.error('Failed to save strategy'); }
  };

  const updateDiv = (i, key, val) => {
    setCustomDivisions((prev) => prev.map((d, idx) => idx === i ? { ...d, [key]: key === 'percentage' ? Number(val) : val } : d));
  };

  const addDiv = () => {
    if (customDivisions.length >= 6) return;
    const remaining = 100 - totalPct;
    setCustomDivisions((p) => [...p, { label: 'New', percentage: Math.max(0, remaining), color: STRATEGY_COLORS[p.length] || '#8B91A7' }]);
  };

  const removeDiv = (i) => {
    if (customDivisions.length <= 2) { toast.error('Minimum 2 divisions required'); return; }
    setCustomDivisions((p) => p.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Budget Strategy</h2>
          <p className="text-sm text-text-secondary mt-0.5">Allocate your income smartly</p>
        </div>
        <div className="flex gap-2">
          {mode !== 'view' && <Button variant="secondary" onClick={() => setMode('view')} size="sm">Cancel</Button>}
          {mode === 'view' && <Button onClick={() => setMode('pick')} size="sm">Change Strategy</Button>}
          {mode === 'pick' && <Button onClick={() => setMode('custom')} size="sm">Custom →</Button>}
          {mode === 'custom' && <Button onClick={handleSaveCustom} size="sm">Save Strategy</Button>}
        </div>
      </div>

      {/* Active strategy view */}
      {mode === 'view' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40"><Spinner /></div>
          ) : active ? (
            <>
              <div className="card">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-lg">{active.name}</h3>
                    <p className="text-xs text-text-muted">Active strategy · Total income: {formatCurrency(active.totalIncome)}</p>
                  </div>
                  <span className="badge-green">Active</span>
                </div>

                {/* Visual bar */}
                <div className="flex h-4 rounded-xl overflow-hidden mb-5 gap-0.5">
                  {active.divisions.map((d) => (
                    <div key={d.label} className="transition-all" style={{ flex: d.percentage, background: d.color }} title={`${d.label}: ${d.percentage}%`} />
                  ))}
                </div>

                {/* Divisions */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {active.divisions.map((d) => {
                    const pct = d.allocatedAmount > 0 ? Math.min(Math.round((d.spentAmount / d.allocatedAmount) * 100), 100) : 0;
                    const isOver = d.spentAmount > d.allocatedAmount;
                    return (
                      <motion.div key={d.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-bg-tertiary rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                            <span className="font-semibold">{d.label}</span>
                            <span className="text-xs text-text-muted">({d.percentage}%)</span>
                          </div>
                          <div className="text-right">
                            <span className="font-display font-bold text-sm" style={{ color: d.color }}>{formatCurrency(d.allocatedAmount)}</span>
                            {isOver && <span className="ml-2 text-xs text-accent-red font-medium">Over budget!</span>}
                          </div>
                        </div>
                        <ProgressBar value={pct} color={isOver ? '#FF4B6B' : d.color} className="mb-2" />
                        <div className="flex justify-between text-xs text-text-muted">
                          <span>Spent: {formatCurrency(d.spentAmount)}</span>
                          <span className={isOver ? 'text-accent-red' : ''}>
                            {isOver ? `Over by ${formatCurrency(d.spentAmount - d.allocatedAmount)}` : `Left: ${formatCurrency(d.allocatedAmount - d.spentAmount)}`}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">⬡</p>
              <h3 className="font-display font-semibold mb-2">No strategy set</h3>
              <p className="text-sm text-text-secondary mb-4">Choose a strategy to start allocating your income</p>
              <Button onClick={() => setMode('pick')} className="mx-auto">Choose Strategy</Button>
            </div>
          )}
        </div>
      )}

      {/* Pick predefined */}
      {mode === 'pick' && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold">Choose a strategy</h3>
          {predefined.map((s) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card hover:border-white/20 cursor-pointer transition-all"
              onClick={() => handlePickPredefined(s)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-display font-semibold">{s.name}</h4>
                <span className="text-xs text-accent-green">Apply →</span>
              </div>
              <div className="flex h-3 rounded-lg overflow-hidden mb-3 gap-0.5">
                {s.divisions.map((d) => <div key={d.label} style={{ flex: d.percentage, background: d.color }} />)}
              </div>
              <div className="flex gap-4 text-xs text-text-muted">
                {s.divisions.map((d) => (
                  <span key={d.label} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
                    {d.label} {d.percentage}%
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Custom builder */}
      {mode === 'custom' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold">Custom Strategy Builder</h3>
            <span className={`text-sm font-bold ${Math.round(totalPct) === 100 ? 'text-accent-green' : 'text-accent-red'}`}>
              {totalPct}% / 100%
            </span>
          </div>

          {/* Preview bar */}
          <div className="flex h-4 rounded-xl overflow-hidden gap-0.5">
            {customDivisions.map((d) => (
              <div key={d.label} style={{ flex: d.percentage, background: d.color }} className="transition-all" />
            ))}
          </div>

          {customDivisions.map((d, i) => (
            <div key={i} className="bg-bg-tertiary rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <input
                  value={d.label}
                  onChange={(e) => updateDiv(i, 'label', e.target.value)}
                  className="input flex-1 py-2 text-sm"
                  placeholder="Division name"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={d.percentage}
                    onChange={(e) => updateDiv(i, 'percentage', e.target.value)}
                    className="input w-20 py-2 text-sm text-center"
                    min="1" max="99"
                  />
                  <span className="text-text-muted text-sm">%</span>
                </div>
                <button onClick={() => removeDiv(i)} className="text-text-muted hover:text-accent-red transition-colors text-sm">✕</button>
              </div>
              <div className="flex gap-2">
                {STRATEGY_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateDiv(i, 'color', c)}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                    style={{ background: c, outline: d.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                  />
                ))}
              </div>
              {totalIncome > 0 && (
                <p className="text-xs text-text-muted">= {formatCurrency(Math.round((d.percentage / 100) * totalIncome))} / month</p>
              )}
            </div>
          ))}

          <button onClick={addDiv} className="w-full border-2 border-dashed border-white/10 rounded-xl py-3 text-sm text-text-muted hover:border-accent-green/30 hover:text-accent-green transition-all">
            + Add Division
          </button>
        </div>
      )}
    </div>
  );
}
