import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  createStrategy,
  createStrategyTemplate,
  deleteStrategyTemplate,
  fetchActiveStrategy,
  fetchPredefined,
  fetchTemplates,
} from '../features/strategy/strategySlice';
import { fetchIncome } from '../features/income/incomeSlice';
import { endOperation, startOperation } from '../features/ui/uiSlice';
import { Button, ComponentLoader, ConfirmDialog, Input, ProgressBar, IconBadge } from '../components/ui/index';
import { formatCurrency, getAccountStartPeriod, getCurrentPeriod, getPeriodLabel, parseMoneyInput } from '../utils/formatters';
import { STRATEGY_COLORS } from '../constants/categories';
import { PeriodFilter } from '../components/ui/PeriodFilter';
import { periodKey, shouldFetchKey } from '../utils/cacheKeys';
import toast from 'react-hot-toast';

const UNUSED_LABEL = 'Unused';
const UNUSED_COLOR = '#8B91A7';
const isUnusedDivision = (label = '') => String(label).trim().toLowerCase() === UNUSED_LABEL.toLowerCase();
const formatPercent = (value = 0) => {
  const number = Number(value || 0);
  return Number.isInteger(number) ? number : number.toFixed(2).replace(/\.?0+$/, '');
};

export default function Strategy() {
  const dispatch = useDispatch();
  const {
    active,
    activeKey,
    predefined,
    predefinedLoaded,
    templates,
    templatesLoaded,
    emergencyFundBalance,
    isLoading,
  } = useSelector((s) => s.strategy);
  const { total: totalIncome, periodKey: incomeKey } = useSelector((s) => s.income);
  const { user } = useSelector((s) => s.auth);

  const [mode, setMode] = useState('view'); // view | pick | custom
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [allocationMode, setAllocationMode] = useState('percentage');
  const [confirmAction, setConfirmAction] = useState(null);
  const [customName, setCustomName] = useState('Custom');
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const [customDivisions, setCustomDivisions] = useState([
    { label: 'Needs', percentage: 50, allocatedAmount: '', color: '#00E5A0' },
    { label: 'Wants', percentage: 30, allocatedAmount: '', color: '#7B6EF6' },
    { label: 'Savings', percentage: 20, allocatedAmount: '', color: '#F7931A' },
  ]);

  useEffect(() => {
    const key = periodKey(period);
    if (shouldFetchKey(activeKey, key)) dispatch(fetchActiveStrategy(period));
    if (!predefinedLoaded) dispatch(fetchPredefined());
    if (!templatesLoaded) dispatch(fetchTemplates());
    if (shouldFetchKey(incomeKey, key)) dispatch(fetchIncome(period));
  }, [dispatch, period, activeKey, predefinedLoaded, templatesLoaded, incomeKey]);

  const spendableCustomDivisions = customDivisions.filter((division) => !isUnusedDivision(division.label));
  const totalPct = spendableCustomDivisions.reduce((s, d) => s + d.percentage, 0);
  const totalAllocated = spendableCustomDivisions.reduce((sum, division) => sum + parseMoneyInput(division.allocatedAmount || 0), 0);
  const amountRemaining = Math.max((totalIncome || 0) - totalAllocated, 0);
  const amountOver = Math.max(totalAllocated - (totalIncome || 0), 0);
  const amountProgress = totalIncome > 0 ? Math.min(100, Math.round((totalAllocated / totalIncome) * 100)) : 0;
  const previewDivisions = allocationMode === 'amount'
    ? [
        ...spendableCustomDivisions,
        {
          label: UNUSED_LABEL,
          percentage: totalIncome > 0 ? Number(((amountRemaining / totalIncome) * 100).toFixed(2)) : 0,
          allocatedAmount: amountRemaining,
          color: UNUSED_COLOR,
        },
      ]
    : customDivisions;
  const accountStartPeriod = getAccountStartPeriod(user?.createdAt);
  const activeTotalIncome = Number(totalIncome || active?.totalIncome || 0);
  const activeBaseDivisions = active?.divisions || [];
  const activeSpendableTotal = activeBaseDivisions
    .filter((division) => !isUnusedDivision(division.label))
    .reduce((sum, division) => sum + (Number(division.allocatedAmount) || 0), 0);
  const activeUnusedAmount = Math.max(activeTotalIncome - activeSpendableTotal, 0);
  const activeUnusedPercentage = activeTotalIncome > 0 ? Number(((activeUnusedAmount / activeTotalIncome) * 100).toFixed(2)) : 0;
  const activeHasUnused = activeBaseDivisions.some((division) => isUnusedDivision(division.label));
  const activeDisplayDivisions = active
    ? [
        ...activeBaseDivisions.map((division) => (
          isUnusedDivision(division.label)
            ? {
                ...division,
                label: UNUSED_LABEL,
                color: division.color || UNUSED_COLOR,
                allocatedAmount: activeUnusedAmount,
                percentage: activeUnusedPercentage,
                spentAmount: 0,
              }
            : division
        )),
        ...(!activeHasUnused && (active.type === 'custom' || active.allocationMode === 'amount')
          ? [{
              label: UNUSED_LABEL,
              color: UNUSED_COLOR,
              allocatedAmount: activeUnusedAmount,
              percentage: activeUnusedPercentage,
              spentAmount: 0,
            }]
          : []),
      ]
    : [];

  const applyStrategy = async (payload, successMessage) => {
    dispatch(startOperation('Applying strategy...'));
    try {
      const res = await dispatch(createStrategy(payload));
      if (createStrategy.fulfilled.match(res)) {
        await Promise.allSettled([
          dispatch(fetchActiveStrategy(period)),
          dispatch(fetchIncome(period)),
        ]);
        toast.success(successMessage);
        setMode('view');
      } else {
        toast.error(res.payload || 'Failed to apply strategy');
      }
    } finally {
      dispatch(endOperation());
    }
  };

  const applySavedTemplate = (template) => {
    setConfirmAction({
      title: `Apply ${template.name}?`,
      description: `${template.name} will be applied to ${getPeriodLabel(period)}. You can reuse this saved strategy again next month.`,
      confirmLabel: 'Apply',
      onConfirm: () => applyStrategy({
        name: template.name,
        type: 'custom',
        allocationMode: template.allocationMode,
        divisions: template.divisions,
        ...period,
      }, `${template.name} strategy activated!`),
    });
  };

  const handleDeleteTemplate = (event, template) => {
    event.stopPropagation();
    setConfirmAction({
      title: `Delete ${template.name}?`,
      description: 'This removes only the saved reusable strategy. Active monthly strategies will not be changed.',
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        dispatch(startOperation('Deleting saved strategy...'));
        try {
          const res = await dispatch(deleteStrategyTemplate(template._id));
          if (deleteStrategyTemplate.fulfilled.match(res)) toast.success('Saved strategy deleted.');
          else toast.error(res.payload || 'Failed to delete saved strategy.');
        } finally {
          dispatch(endOperation());
        }
      },
    });
  };

  const handlePickPredefined = (s) => {
    setConfirmAction({
      title: `Apply ${s.name}?`,
      description: `${s.name} will become the active strategy for ${getPeriodLabel(period)}.`,
      confirmLabel: 'Apply',
      onConfirm: () => applyStrategy({ name: s.name, type: 'predefined', divisions: s.divisions, ...period }, `${s.name} strategy activated!`),
    });
  };

  const handleSaveCustom = async () => {
    let divisions = customDivisions;
    if (allocationMode === 'amount') {
      if (totalIncome <= 0) { toast.error('Add income before creating an amount-based strategy.'); return; }
      if (totalAllocated - totalIncome > 0.01) {
        toast.error(`Allocated amount cannot exceed ${formatCurrency(totalIncome)}.`);
        return;
      }
      divisions = spendableCustomDivisions.map((division) => {
        const amount = parseMoneyInput(division.allocatedAmount);
        return {
          ...division,
          allocatedAmount: amount,
          percentage: totalIncome > 0 ? Number(((amount / totalIncome) * 100).toFixed(2)) : 0,
        };
      });
      divisions.push({
        label: UNUSED_LABEL,
        allocatedAmount: amountRemaining,
        percentage: totalIncome > 0 ? Number(((amountRemaining / totalIncome) * 100).toFixed(2)) : 0,
        color: UNUSED_COLOR,
      });
    } else if (Math.round(totalPct) !== 100) {
      toast.error('Divisions must total 100%');
      return;
    }

    const strategyName = customName.trim() || 'Custom';
    const templateDivisions = divisions.filter((division) => !isUnusedDivision(division.label));

    setConfirmAction({
      title: 'Apply custom strategy?',
      description: `${strategyName} will allocate ${allocationMode === 'amount' ? `${formatCurrency(totalAllocated)} and keep ${formatCurrency(amountRemaining)} unused` : `${Math.round(totalPct)}%`} for ${getPeriodLabel(period)}${saveAsTemplate ? ' and be saved for reuse.' : '.'}`,
      confirmLabel: 'Apply',
      onConfirm: async () => {
        if (saveAsTemplate) {
          dispatch(startOperation('Saving custom strategy...'));
          try {
            const saved = await dispatch(createStrategyTemplate({ name: strategyName, allocationMode, divisions: templateDivisions }));
            if (!createStrategyTemplate.fulfilled.match(saved)) {
              toast.error(saved.payload || 'Failed to save reusable strategy.');
              return;
            }
          } finally {
            dispatch(endOperation());
          }
        }
        await applyStrategy({ name: strategyName, type: 'custom', allocationMode, divisions, ...period }, `${strategyName} strategy activated!`);
      },
    });
  };

  const updateDiv = (i, key, val) => {
    setCustomDivisions((prev) => prev.map((d, idx) => {
      if (idx !== i) return d;
      if (key === 'percentage') {
        const percentage = Number(val);
        return {
          ...d,
          percentage,
          allocatedAmount: totalIncome > 0 ? Number(((percentage / 100) * totalIncome).toFixed(2)) : d.allocatedAmount,
        };
      }
      if (key === 'allocatedAmount') {
        const amount = parseMoneyInput(val);
        return {
          ...d,
          allocatedAmount: val,
          percentage: totalIncome > 0 ? Number(((amount / totalIncome) * 100).toFixed(2)) : d.percentage,
        };
      }
      return { ...d, [key]: val };
    }));
  };

  const buildWholeAmountDivisions = (divisions) => {
    const total = Number(totalIncome) || 0;
    let used = 0;
    return divisions.map((division, index) => {
      const rawAmount = ((Number(division.percentage) || 0) / 100) * total;
      const amount = index === divisions.length - 1
        ? Number((total - used).toFixed(2))
        : (Number.isInteger(total) ? Math.round(rawAmount) : Number(rawAmount.toFixed(2)));
      used += amount;
      return { ...division, allocatedAmount: Math.max(0, amount) };
    });
  };

  const changeAllocationMode = (nextMode) => {
    setAllocationMode(nextMode);
    if (nextMode !== 'amount') return;
    setCustomDivisions((prev) => prev
      .filter((division) => !isUnusedDivision(division.label))
      .map((division) => ({ ...division, percentage: 0, allocatedAmount: 0 })));
  };

  const editActiveCustom = () => {
    if (!active) return;
    const nextMode = active.allocationMode || 'percentage';
    setCustomName(active.name || 'Custom');
    setSaveAsTemplate(false);
    setAllocationMode(nextMode);
    setCustomDivisions((active.divisions || []).filter((division) => !isUnusedDivision(division.label)).map((division) => ({
      label: division.label,
      percentage: division.percentage,
      allocatedAmount: nextMode === 'amount' ? division.allocatedAmount : '',
      color: division.color,
    })));
    setMode('custom');
  };

  const startNewCustom = () => {
    setCustomName('Custom');
    setSaveAsTemplate(true);
    setAllocationMode('percentage');
    setCustomDivisions([
      { label: 'Needs', percentage: 50, allocatedAmount: '', color: '#00E5A0' },
      { label: 'Wants', percentage: 30, allocatedAmount: '', color: '#7B6EF6' },
      { label: 'Savings', percentage: 20, allocatedAmount: '', color: '#F7931A' },
    ]);
    setMode('custom');
  };

  const addDiv = () => {
    if (spendableCustomDivisions.length >= 6) return;
    const remaining = 100 - totalPct;
    setCustomDivisions((p) => [...p, { label: 'New', percentage: Math.max(0, remaining), allocatedAmount: '', color: STRATEGY_COLORS[p.length] || '#8B91A7' }]);
  };

  const removeDiv = (i) => {
    if (spendableCustomDivisions.length <= 2) { toast.error('Minimum 2 divisions required'); return; }
    setCustomDivisions((p) => p.filter((_, idx) => idx !== i));
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <ConfirmDialog
        isOpen={!!confirmAction}
        title={confirmAction?.title}
        description={confirmAction?.description}
        confirmLabel={confirmAction?.confirmLabel || 'Apply'}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          const action = confirmAction?.onConfirm;
          setConfirmAction(null);
          await action?.();
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-xl">Budget Strategy</h2>
          <p className="text-sm text-text-secondary mt-0.5">Allocate your income smartly / {getPeriodLabel(period)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter period={period} minPeriod={accountStartPeriod} onChange={setPeriod} compact className="rounded-xl border border-border bg-bg-secondary p-1 shadow-sm" />
          {mode !== 'view' && <Button variant="secondary" onClick={() => setMode('view')} size="sm">Cancel</Button>}
          {mode === 'view' && <Button onClick={() => setMode('pick')} size="sm">Change Strategy</Button>}
          {mode === 'pick' && <Button onClick={startNewCustom} size="sm">New Custom</Button>}
          {mode === 'custom' && <Button onClick={handleSaveCustom} size="sm">Save Strategy</Button>}
        </div>
      </div>

      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <IconBadge icon="shield" color="#3E8EFF" className="h-11 w-11 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-display font-semibold">Emergency Funds</h3>
              <p className="text-xs text-text-muted">Separate reserve funded from unused monthly allocation.</p>
            </div>
          </div>
          <p className="flex-shrink-0 pt-1 text-right font-display text-lg font-bold text-accent-blue">{formatCurrency(emergencyFundBalance || 0)}</p>
        </div>
      </div>

      {/* Active strategy view */}
      {mode === 'view' && (
        <div className="space-y-4">
          {isLoading ? (
            <ComponentLoader label="Loading strategy..." />
          ) : active ? (
            <>
              <div className="card">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-lg">{active.name}</h3>
                    <p className="text-xs text-text-muted">Active strategy / Total income: {formatCurrency(activeTotalIncome)}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {active.type === 'custom' && (
                      <Button size="sm" variant="secondary" onClick={editActiveCustom}>
                        Edit Custom
                      </Button>
                    )}
                    <span className="badge-green">Active</span>
                  </div>
                </div>

                {/* Visual bar */}
                <div className="flex h-4 rounded-xl overflow-hidden mb-5 gap-0.5">
                  {activeDisplayDivisions.map((d) => (
                    <div key={d.label} className="transition-all" style={{ flex: d.percentage || 0.1, background: d.color }} title={`${d.label}: ${formatPercent(d.percentage)}%`} />
                  ))}
                </div>

                {/* Divisions */}
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  {activeDisplayDivisions.map((d) => {
                    const isUnused = isUnusedDivision(d.label);
                    const pct = d.allocatedAmount > 0 ? Math.min(Math.round((d.spentAmount / d.allocatedAmount) * 100), 100) : 0;
                    const isOver = d.spentAmount > d.allocatedAmount;
                    return (
                      <motion.div key={d.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`bg-bg-tertiary rounded-xl p-4 ${isUnused ? 'border border-dashed border-border' : ''}`}>
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                            <span className="font-semibold">{d.label}</span>
                            <span className="text-xs text-text-muted">({formatPercent(d.percentage)}%)</span>
                          </div>
                          <div className="w-full text-left sm:w-auto sm:text-right">
                            <span className="font-display text-sm font-bold" style={{ color: d.color }}>{formatCurrency(d.allocatedAmount)}</span>
                            {isOver && <span className="ml-2 text-xs text-accent-red font-medium">Over budget!</span>}
                          </div>
                        </div>
                          <ProgressBar value={isUnused ? 100 : pct} color={isUnused ? '#8B91A7' : isOver ? '#FF4B6B' : d.color} className="mb-2" />
                        <div className="flex justify-between text-xs text-text-muted">
                          <span>{isUnused ? 'Protected balance' : `Spent: ${formatCurrency(d.spentAmount)}`}</span>
                          <span className={isOver ? 'text-accent-red' : ''}>
                            {isUnused ? 'Allocate before use' : isOver ? `Over by ${formatCurrency(d.spentAmount - d.allocatedAmount)}` : `Left: ${formatCurrency(d.allocatedAmount - d.spentAmount)}`}
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
              <IconBadge icon="target" color="#7B6EF6" className="mx-auto mb-3 h-14 w-14" iconClassName="h-7 w-7" />
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
          {templates?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Saved custom strategies</h4>
                <span className="text-[11px] text-text-muted">Reuse every month</span>
              </div>
              {templates.map((template) => (
                <motion.div
                  key={template._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card cursor-pointer transition-all hover:border-accent-green/30"
                  onClick={() => applySavedTemplate(template)}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-display font-semibold">{template.name}</h4>
                      <p className="text-xs text-text-muted">
                        Custom / {template.allocationMode === 'amount' ? 'Amount based' : 'Percentage based'}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="text-xs font-semibold text-accent-green">Apply</span>
                      <button
                        type="button"
                        onClick={(event) => handleDeleteTemplate(event, template)}
                        className="text-text-muted transition-colors hover:text-accent-red"
                        aria-label={`Delete ${template.name}`}
                      >
                        <IconBadge icon="trash" color="#FF4B6B" className="h-8 w-8" />
                      </button>
                    </div>
                  </div>
                  <div className="mb-3 flex h-3 overflow-hidden rounded-lg gap-0.5">
                    {template.divisions.map((division) => (
                      <div
                        key={division.label}
                        style={{
                          flex: template.allocationMode === 'amount'
                            ? Math.max(Number(division.allocatedAmount) || 1, 1)
                            : Number(division.percentage) || 1,
                          background: division.color,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                    {template.divisions.map((division) => (
                      <span key={division.label} className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: division.color }} />
                        {division.label} {template.allocationMode === 'amount' ? formatCurrency(division.allocatedAmount) : `${formatPercent(division.percentage)}%`}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Predefined strategies</h4>
          </div>
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
            <div>
              <h3 className="font-display font-semibold">Custom Strategy Builder</h3>
              <p className="mt-0.5 text-xs text-text-muted">Total income: {formatCurrency(totalIncome || 0)}</p>
            </div>
            <span className={`text-sm font-bold ${allocationMode === 'amount' ? (Math.abs(totalAllocated - totalIncome) <= 0.01 ? 'text-accent-green' : 'text-accent-red') : (Math.round(totalPct) === 100 ? 'text-accent-green' : 'text-accent-red')}`}>
              {allocationMode === 'amount' ? `${formatCurrency(totalAllocated)} / ${formatCurrency(totalIncome || 0)}` : `${totalPct}% / 100%`}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input
              label="Strategy name"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="Monthly home plan"
            />
            <label className="flex h-12 items-center gap-2 rounded-xl border border-border bg-bg-tertiary px-4 text-sm font-semibold text-text-secondary">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={(event) => setSaveAsTemplate(event.target.checked)}
                className="h-4 w-4 accent-emerald-400"
              />
              Save for every month
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-bg-tertiary p-1">
            <button
              type="button"
              onClick={() => changeAllocationMode('percentage')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${allocationMode === 'percentage' ? 'bg-accent-green text-black' : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'}`}
            >
              By %
            </button>
            <button
              type="button"
              onClick={() => changeAllocationMode('amount')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${allocationMode === 'amount' ? 'bg-accent-green text-black' : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'}`}
            >
              By Amount
            </button>
          </div>

          {allocationMode === 'amount' && (
            <div className="rounded-xl border border-border bg-bg-tertiary p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-text-muted">Allocated amount</span>
                <span className="font-semibold text-text-primary">{amountProgress}% filled</span>
              </div>
              <ProgressBar value={amountProgress} color={amountOver > 0 ? '#FF4B6B' : amountRemaining <= 0 ? '#00E5A0' : '#F7931A'} />
              <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                <span>{formatCurrency(totalAllocated)} allocated</span>
                <span className={amountOver > 0 ? 'text-accent-red' : amountRemaining <= 0 ? 'text-accent-green' : ''}>
                  {amountOver > 0 ? `${formatCurrency(amountOver)} over` : `${formatCurrency(amountRemaining)} left`}
                </span>
              </div>
              <div className="mt-3 rounded-lg border border-dashed border-border bg-bg-secondary p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Unused</p>
                    <p className="text-xs text-text-muted">Protected balance. Allocate it before using it for expenses or emergency funds.</p>
                  </div>
                  <p className="font-display font-bold text-text-secondary">{formatCurrency(amountRemaining)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Preview bar */}
          <div className="flex h-4 rounded-xl overflow-hidden gap-0.5">
            {previewDivisions.map((d) => (
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
                  {allocationMode === 'amount' ? (
                    <Input
                      type="number"
                      value={d.allocatedAmount}
                      onChange={(e) => updateDiv(i, 'allocatedAmount', e.target.value)}
                      className="w-28 py-2 text-sm text-center"
                      min="0"
                      step="0.01"
                      placeholder="Amount"
                    />
                  ) : (
                    <>
                      <input
                        type="number"
                        value={d.percentage}
                        onChange={(e) => updateDiv(i, 'percentage', e.target.value)}
                        className="input w-20 py-2 text-sm text-center"
                        min="1" max="99"
                      />
                      <span className="text-text-muted text-sm">%</span>
                    </>
                  )}
                </div>
                <button onClick={() => removeDiv(i)} className="text-text-muted hover:text-accent-red transition-colors text-sm" aria-label="Remove division">
                  <IconBadge icon="trash" color="#FF4B6B" className="h-8 w-8" />
                </button>
              </div>
              <div className="flex gap-2">
                {STRATEGY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateDiv(i, 'color', c)}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                    style={{ background: c, outline: d.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                  />
                ))}
                <label className="relative flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border bg-bg-secondary">
                  <input
                    type="color"
                    value={/^#[0-9A-F]{6}$/i.test(d.color) ? d.color : '#00E5A0'}
                    onChange={(event) => updateDiv(i, 'color', event.target.value)}
                    className="absolute inset-0 h-8 w-8 cursor-pointer opacity-0"
                    aria-label="Pick custom color"
                  />
                  <span className="text-[10px] font-bold text-text-muted">+</span>
                </label>
              </div>
              {totalIncome > 0 && (
                <p className="text-xs text-text-muted">
                  {allocationMode === 'amount'
                    ? `${Number(d.percentage || 0).toFixed(2)}% of income`
                    : `= ${formatCurrency((d.percentage / 100) * totalIncome)} / month`}
                </p>
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
