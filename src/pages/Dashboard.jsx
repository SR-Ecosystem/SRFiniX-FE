import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { fetchOverview, fetchInsights, fetchMonthly } from '../features/analytics/analyticsSlice';
import { fetchActiveStrategy } from '../features/strategy/strategySlice';
import { fetchExpenses } from '../features/expenses/expenseSlice';
import { fetchGoals } from '../features/goals/goalSlice';
import { fetchBudget } from '../features/budget/budgetSlice';
import { fetchFinancialScore } from '../features/auth/authSlice';
import { fetchIncome } from '../features/income/incomeSlice';
import { StatCard, ProgressBar, ComponentLoader, EmptyState, IconBadge } from '../components/ui/index';
import { formatCurrency, formatCurrencyWithPaise, formatCompact, getAccountStartPeriod, getCurrentPeriod, getPeriodLabel, getProgress, timeAgo } from '../utils/formatters';
import { CATEGORIES } from '../constants/categories';
import { PeriodFilter } from '../components/ui/PeriodFilter';
import { periodKey, queryKey, shouldFetchKey } from '../utils/cacheKeys';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const UNUSED_LABEL = 'Unused';
const UNUSED_COLOR = '#8B91A7';
const isUnusedDivision = (label = '') => String(label).trim().toLowerCase() === UNUSED_LABEL.toLowerCase();
const formatPercent = (value = 0) => {
  const rounded = Number(value || 0);
  return Number.isInteger(rounded) ? rounded : rounded.toFixed(2).replace(/\.?0+$/, '');
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-bg-secondary border border-white/10 rounded-xl p-3 text-xs">
        <p className="text-text-muted mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const dispatch = useDispatch();
  const { overview, overviewKey, insights, insightsLoaded, monthly, monthlyKey, isLoading } = useSelector((s) => s.analytics);
  const { active: strategy, activeKey: strategyKey } = useSelector((s) => s.strategy);
  const { list: expenses, queryKey: expensesKey } = useSelector((s) => s.expenses);
  const { list: goals, queryKey: goalsKey } = useSelector((s) => s.goals);
  const { user, financialScoreKey } = useSelector((s) => s.auth);
  const { data: budget, periodKey: budgetKey } = useSelector((s) => s.budget);
  const { total: incomeTotal, periodKey: incomeKey } = useSelector((s) => s.income);
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const key = periodKey(period);
    const requests = [];
    if (shouldFetchKey(overviewKey, key)) requests.push(dispatch(fetchOverview(period)));
    if (!insightsLoaded) requests.push(dispatch(fetchInsights()));
    if (shouldFetchKey(monthlyKey, String(period.year))) requests.push(dispatch(fetchMonthly({ year: period.year })));
    if (shouldFetchKey(strategyKey, key)) requests.push(dispatch(fetchActiveStrategy(period)));
    if (shouldFetchKey(expensesKey, queryKey({ ...period, limit: 200 }))) requests.push(dispatch(fetchExpenses({ ...period, limit: 200 })));
    if (shouldFetchKey(incomeKey, key)) requests.push(dispatch(fetchIncome(period)));
    if (shouldFetchKey(goalsKey, queryKey({}))) requests.push(dispatch(fetchGoals({})));
    if (shouldFetchKey(budgetKey, key)) requests.push(dispatch(fetchBudget(period)));
    if (shouldFetchKey(financialScoreKey, key)) requests.push(dispatch(fetchFinancialScore(period)));

    if (requests.length === 0) {
      setDashboardLoading(false);
      return () => { alive = false; };
    }

    setDashboardLoading(true);
    Promise.allSettled(requests).finally(() => {
      if (alive) setDashboardLoading(false);
    });
    return () => { alive = false; };
  }, [dispatch, period, overviewKey, insightsLoaded, monthlyKey, strategyKey, expensesKey, incomeKey, goalsKey, budgetKey, financialScoreKey]);

  const chartData = monthly?.months?.map((m) => ({
    name: MONTH_NAMES[m.month - 1],
    Income: m.income,
    Expenses: m.expense,
    Savings: Math.max(0, m.savings),
  })) || [];

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
  const emergencyBalance = overview?.emergencyFundBalance || 0;
  const activeGoals = goals.filter((goal) => !goal.isCompleted);
  const statsLoading = dashboardLoading || !overview;
  const accountStartPeriod = getAccountStartPeriod(user?.createdAt);
  const financialScore = user?.financialHealthScore || 0;
  const financialHealthLabel = financialScore >= 80 ? 'Excellent' : financialScore >= 60 ? 'Good' : financialScore >= 40 ? 'Fair' : 'Needs work';
  const strategyDivisions = strategy?.divisions || [];
  const effectiveStrategyIncome = Number(incomeTotal || strategy?.totalIncome || 0);
  const spendableStrategyTotal = strategyDivisions
    .filter((division) => !isUnusedDivision(division.label))
    .reduce((sum, division) => sum + (Number(division.allocatedAmount) || 0), 0);
  const calculatedUnusedAmount = Math.max(effectiveStrategyIncome - spendableStrategyTotal, 0);
  const calculatedUnusedPercentage = effectiveStrategyIncome > 0 ? (calculatedUnusedAmount / effectiveStrategyIncome) * 100 : 0;
  const hasUnusedDivision = strategyDivisions.some((division) => isUnusedDivision(division.label));
  const displayStrategyDivisions = strategy
    ? [
        ...strategyDivisions.map((division) => (
          isUnusedDivision(division.label)
            ? {
                ...division,
                label: UNUSED_LABEL,
                color: division.color || UNUSED_COLOR,
                allocatedAmount: calculatedUnusedAmount,
                percentage: calculatedUnusedPercentage,
                spentAmount: 0,
              }
            : division
        )),
        ...(!hasUnusedDivision && (strategy.allocationMode === 'amount' || strategy.type === 'custom')
          ? [{
              label: UNUSED_LABEL,
              color: UNUSED_COLOR,
              allocatedAmount: calculatedUnusedAmount,
              percentage: calculatedUnusedPercentage,
              spentAmount: 0,
            }]
          : []),
      ]
    : [];
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-[1500px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold leading-tight">Dashboard</h2>
          <p className="mt-0.5 text-sm text-text-secondary">Showing {getPeriodLabel(period)}</p>
        </div>
        <PeriodFilter
          period={period}
          minPeriod={accountStartPeriod}
          onApply={setPeriod}
          compact
          className="rounded-xl border border-border bg-bg-secondary p-1 shadow-sm"
        />
      </div>

      {/* Stat cards */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="This Month Income"
          value={formatCurrencyWithPaise(overview?.totalIncome || 0)}
          icon="money"
          color="#00E5A0"
          delta="Every rupee is progress"
          loading={statsLoading}
        />
        <StatCard
          label="Income Till Now"
          value={formatCurrencyWithPaise(overview?.incomeTillNow || 0)}
          icon="income"
          color="#00E5A0"
          delta="Your effort is adding up"
          loading={statsLoading}
        />
        <StatCard
          label="This Month Expense"
          value={formatCurrencyWithPaise(overview?.totalExpense || 0)}
          icon="spent"
          color="#FF4B6B"
          delta={overview?.totalExpense > 0 ? 'Stay aware, stay in control' : 'Clean slate, keep it steady'}
          loading={statsLoading}
        />
        <StatCard
          label="Expense Till Now"
          value={formatCurrencyWithPaise(overview?.expenseTillNow || 0)}
          icon="spent"
          color="#FF4B6B"
          delta="Mindful choices win"
          loading={statsLoading}
        />
        <StatCard
          label="Month Left"
          value={formatCurrencyWithPaise(overview?.netSavings || 0)}
          icon="savings"
          color="#F7931A"
          delta={overview?.netSavings > 0 ? 'Future you will smile' : 'You can rebuild this'}
          loading={statsLoading}
        />
        <StatCard
          label="Active Goals"
          value={overview?.goalCount || 0}
          icon="target"
          color="#7B6EF6"
          delta={overview?.goalCount > 0 ? 'Dreams with a plan' : `Build with ${overview?.strategyName || 'a plan'}`}
          loading={statsLoading}
        />
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div variants={item} className="card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <IconBadge icon="shield" color="#3E8EFF" className="h-12 w-12 flex-shrink-0" iconClassName="h-6 w-6" />
              <div>
                <h3 className="font-display font-semibold">Emergency Funds</h3>
                <p className="text-xs text-text-muted">Approved unused allocation reserve.</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              {dashboardLoading ? (
                <div className="space-y-2 sm:ml-auto">
                  <div className="h-6 w-28 animate-pulse rounded-lg bg-bg-card" />
                  <div className="h-3 w-20 animate-pulse rounded bg-bg-card" />
                </div>
              ) : (
                <>
                  <p className="font-display text-xl font-bold text-accent-blue">{formatCurrencyWithPaise(emergencyBalance)}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {overview?.lastEmergencyRollover ? `Last rollover: ${overview.lastEmergencyRollover}` : 'No rollover yet'}
                  </p>
                </>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="card">
          <div className="grid h-full gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <h3 className="font-display font-semibold">Financial Health</h3>
              <p className="mt-1 text-xs text-text-muted">Single score based on savings, goals, and spending.</p>
              <div className="mt-4">
                <ProgressBar value={financialScore} color="#00E5A0" />
              </div>
            </div>
            <div className="rounded-2xl border border-accent-green/20 bg-accent-green/10 px-5 py-3 text-center">
              <p className="font-display text-2xl font-bold text-accent-green">{financialScore}%</p>
              <p className="text-xs text-text-secondary">{financialHealthLabel}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Chart + Strategy */}
      <div className="grid gap-5 xl:grid-cols-5">
        {/* Income vs Expenses chart */}
        <motion.div variants={item} className="card xl:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-semibold">Income vs Expenses</h3>
              <p className="text-xs text-text-muted mt-0.5">{period.year} overview</p>
            </div>
            <div className="flex gap-3 text-xs text-text-secondary">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-green inline-block" />Income</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-purple inline-block" />Expenses</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-orange inline-block" />Savings</span>
            </div>
          </div>
          {dashboardLoading ? (
            <ComponentLoader label="Loading chart..." />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={chartData} barSize={8} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fill: '#555C72', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555C72', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}K`} width={45} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="Income" fill="#00E5A0" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Bar dataKey="Expenses" fill="#7B6EF6" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Bar dataKey="Savings" fill="#F7931A" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Strategy donut */}
        <motion.div variants={item} className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold">{strategy?.name || 'Strategy'}</h3>
              <p className="text-xs text-text-muted mt-0.5">Budget allocation</p>
            </div>
            <Link to="/strategy" className="text-xs text-accent-green hover:underline">Edit</Link>
          </div>

          {dashboardLoading ? (
            <ComponentLoader label="Loading strategy..." />
          ) : strategy ? (
            <div className="space-y-3">
              {displayStrategyDivisions.map((d) => {
                const isUnused = isUnusedDivision(d.label);
                const pct = d.allocatedAmount > 0 ? Math.min(Math.round((d.spentAmount / d.allocatedAmount) * 100), 100) : 0;
                return (
                  <div key={d.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-xs text-text-secondary">{d.label} ({formatPercent(d.percentage)}%)</span>
                      </div>
                      <span className="text-xs font-semibold font-display" style={{ color: d.color }}>
                        {formatCompact(d.allocatedAmount)}
                      </span>
                    </div>
                    <ProgressBar value={isUnused ? 100 : pct} color={d.color} />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-text-muted">{isUnused ? 'Protected' : `Spent: ${formatCompact(d.spentAmount)}`}</span>
                      <span className="text-[10px] text-text-muted">{isUnused ? 'Allocate before use' : `Left: ${formatCompact(Math.max(d.allocatedAmount - d.spentAmount, 0))}`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="target" title="No strategy" description="Set up a budget strategy" action={<Link to="/strategy" className="btn-primary">Set Strategy</Link>} />
          )}
        </motion.div>
      </div>

      {/* Transactions + Goals + Insights */}
      <div className="grid gap-5 xl:grid-cols-3">
        {/* Recent transactions */}
        <motion.div variants={item} className="card xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Recent Transactions</h3>
            <Link to="/expenses" className="text-xs text-accent-green hover:underline">View all</Link>
          </div>
          {dashboardLoading ? (
            <ComponentLoader label="Loading transactions..." />
          ) : expenses.length === 0 ? (
            <EmptyState icon="package" title="No expenses" description="Add your first expense" />
          ) : (
            <div className="space-y-0 divide-y divide-white/[0.05]">
              {expenses.slice(0, 6).map((exp) => {
                const cat = CATEGORIES[exp.category];
                return (
                  <div key={exp._id} className="flex items-center gap-3 py-3">
                    <IconBadge icon={cat?.icon} color={cat?.color} className="h-9 w-9 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{exp.description}</p>
                      <p className="text-[11px] text-text-muted">
                        {cat?.label} / {timeAgo(exp.date)}
                        {exp.offlinePending && <span className="ml-1 text-accent-orange">/ Pending sync</span>}
                      </p>
                    </div>
                    <span className="text-sm font-display font-semibold text-accent-red flex-shrink-0">
                      -{formatCurrency(exp.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Goals */}
        <motion.div variants={item} className="card xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Active Goals</h3>
            <Link to="/goals" className="text-xs text-accent-green hover:underline">View all</Link>
          </div>
          {dashboardLoading ? (
            <ComponentLoader label="Loading goals..." />
          ) : activeGoals.length === 0 ? (
            <EmptyState icon="target" title="No goals" description="Create your first savings goal" action={<Link to="/goals" className="btn-primary">Add Goal</Link>} />
          ) : (
            <div className="space-y-4">
              {activeGoals.slice(0, 3).map((goal) => {
                const pct = getProgress(goal.currentAmount, goal.targetAmount);
                return (
                  <div key={goal._id}>
                    <div className="flex items-center gap-2 mb-2">
                      <IconBadge icon={goal.icon || 'target'} color={goal.color || '#7B6EF6'} className="h-9 w-9 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {goal.title}
                          {goal.offlinePending && <span className="ml-1 text-[10px] font-bold uppercase text-accent-orange">Pending</span>}
                        </p>
                        <p className="text-[11px] text-text-muted">{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</p>
                      </div>
                      <span className="badge-green text-xs">{pct}%</span>
                    </div>
                    <ProgressBar value={pct} color={goal.color} />
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* AI Insights */}
        <motion.div variants={item} className="card border-accent-purple/20 bg-gradient-to-br from-accent-purple/10 to-accent-green/5 xl:col-span-1">
          <div className="mb-1 flex items-center gap-2">
            <IconBadge icon="bot" color="#7B6EF6" className="h-8 w-8" />
            <h3 className="font-display font-semibold">AI Insights</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">Personalized for this month</p>
          {dashboardLoading ? (
            <ComponentLoader label="Loading insights..." />
          ) : insights.length === 0 ? (
            <EmptyState icon="insights" title="No insights yet" description="Add more transactions to get insights" />
          ) : (
            <div className="space-y-0 divide-y divide-white/[0.05]">
              {insights.slice(0, 4).map((ins, i) => (
                <div key={i} className="flex gap-3 py-3">
                  <IconBadge icon="insights" color="#7B6EF6" className="h-8 w-8 flex-shrink-0" />
                  <p className="text-xs text-text-secondary leading-relaxed" dangerouslySetInnerHTML={{
                    __html: ins.message.replace(/(\d[\d,]+)/g, '<strong class="text-text-primary">$1</strong>')
                  }} />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
