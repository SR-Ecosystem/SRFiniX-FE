import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { fetchOverview, fetchInsights, fetchMonthly } from '../features/analytics/analyticsSlice';
import { fetchActiveStrategy } from '../features/strategy/strategySlice';
import { fetchExpenses } from '../features/expenses/expenseSlice';
import { fetchGoals } from '../features/goals/goalSlice';
import { fetchBudget } from '../features/budget/budgetSlice';
import { StatCard, ProgressBar, Spinner, EmptyState } from '../components/ui/index';
import { formatCurrency, formatCurrencyWithPaise, formatCompact, getProgress, timeAgo } from '../utils/formatters';
import { CATEGORIES } from '../constants/categories';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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
  const { overview, insights, monthly, isLoading } = useSelector((s) => s.analytics);
  const { active: strategy } = useSelector((s) => s.strategy);
  const { list: expenses } = useSelector((s) => s.expenses);
  const { list: goals } = useSelector((s) => s.goals);
  const { data: budget } = useSelector((s) => s.budget);

  useEffect(() => {
    dispatch(fetchOverview({}));
    dispatch(fetchInsights());
    dispatch(fetchMonthly({ year: new Date().getFullYear() }));
    dispatch(fetchActiveStrategy({}));
    dispatch(fetchExpenses({ limit: 8 }));
    dispatch(fetchGoals({ status: 'active' }));
    dispatch(fetchBudget({}));
  }, [dispatch]);

  const chartData = monthly?.months?.map((m) => ({
    name: MONTH_NAMES[m.month - 1],
    Income: m.income,
    Expenses: m.expense,
    Savings: Math.max(0, m.savings),
  })) || [];

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 max-w-7xl">
      {/* Stat cards */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          label="Total Income"
          value={formatCurrencyWithPaise(overview?.totalIncome || 0)}
          icon="💰"
          color="#00E5A0"
          delta={`${overview?.savingsRate || 0}% savings rate`}
        />
        <StatCard
          label="Total Spent"
          value={formatCurrencyWithPaise(overview?.totalExpense || 0)}
          icon="📤"
          color="#FF4B6B"
          delta={overview?.expenseDelta !== undefined ? `${overview.expenseDelta > 0 ? '↑' : '↓'} ${Math.abs(overview.expenseDelta)}% vs last month` : ''}
        />
        <StatCard
          label="Net Savings"
          value={formatCurrencyWithPaise(overview?.netSavings || 0)}
          icon="🏦"
          color="#F7931A"
          delta="This month"
        />
        <StatCard
          label="Active Goals"
          value={overview?.goalCount || 0}
          icon="🎯"
          color="#7B6EF6"
          delta={`Using ${overview?.strategyName || '--'}`}
        />
      </motion.div>

      {/* Chart + Strategy */}
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Income vs Expenses chart */}
        <motion.div variants={item} className="card lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-semibold">Income vs Expenses</h3>
              <p className="text-xs text-text-muted mt-0.5">{new Date().getFullYear()} overview</p>
            </div>
            <div className="flex gap-3 text-xs text-text-secondary">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-green inline-block" />Income</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-purple inline-block" />Expenses</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-orange inline-block" />Savings</span>
            </div>
          </div>
          {isLoading ? (
            <div className="h-44 flex items-center justify-center"><Spinner /></div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
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
        <motion.div variants={item} className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold">{strategy?.name || 'Strategy'}</h3>
              <p className="text-xs text-text-muted mt-0.5">Budget allocation</p>
            </div>
            <Link to="/strategy" className="text-xs text-accent-green hover:underline">Edit</Link>
          </div>

          {strategy ? (
            <div className="space-y-3">
              {strategy.divisions.map((d) => {
                const pct = d.allocatedAmount > 0 ? Math.min(Math.round((d.spentAmount / d.allocatedAmount) * 100), 100) : 0;
                return (
                  <div key={d.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-xs text-text-secondary">{d.label} ({d.percentage}%)</span>
                      </div>
                      <span className="text-xs font-semibold font-display" style={{ color: d.color }}>
                        {formatCompact(d.allocatedAmount)}
                      </span>
                    </div>
                    <ProgressBar value={pct} color={d.color} />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-text-muted">Spent: {formatCompact(d.spentAmount)}</span>
                      <span className="text-[10px] text-text-muted">Left: {formatCompact(d.allocatedAmount - d.spentAmount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="⬡" title="No strategy" description="Set up a budget strategy" action={<Link to="/strategy" className="btn-primary">Set Strategy</Link>} />
          )}
        </motion.div>
      </div>

      {/* Transactions + Goals + Insights */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent transactions */}
        <motion.div variants={item} className="card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Recent Transactions</h3>
            <Link to="/expenses" className="text-xs text-accent-green hover:underline">View all</Link>
          </div>
          {expenses.length === 0 ? (
            <EmptyState icon="📭" title="No expenses" description="Add your first expense" />
          ) : (
            <div className="space-y-0 divide-y divide-white/[0.05]">
              {expenses.slice(0, 6).map((exp) => {
                const cat = CATEGORIES[exp.category];
                return (
                  <div key={exp._id} className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: cat?.bg }}>
                      {cat?.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{exp.description}</p>
                      <p className="text-[11px] text-text-muted">{cat?.label} · {timeAgo(exp.date)}</p>
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
        <motion.div variants={item} className="card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Active Goals</h3>
            <Link to="/goals" className="text-xs text-accent-green hover:underline">View all</Link>
          </div>
          {goals.length === 0 ? (
            <EmptyState icon="🎯" title="No goals" description="Create your first savings goal" action={<Link to="/goals" className="btn-primary">Add Goal</Link>} />
          ) : (
            <div className="space-y-4">
              {goals.slice(0, 3).map((goal) => {
                const pct = getProgress(goal.currentAmount, goal.targetAmount);
                return (
                  <div key={goal._id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{goal.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{goal.title}</p>
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
        <motion.div variants={item} className="card lg:col-span-1 bg-gradient-to-br from-accent-purple/10 to-accent-green/5 border-accent-purple/20">
          <h3 className="font-display font-semibold mb-1">🤖 AI Insights</h3>
          <p className="text-xs text-text-muted mb-4">Personalized for this month</p>
          {insights.length === 0 ? (
            <EmptyState icon="💡" title="No insights yet" description="Add more transactions to get insights" />
          ) : (
            <div className="space-y-0 divide-y divide-white/[0.05]">
              {insights.slice(0, 4).map((ins, i) => (
                <div key={i} className="flex gap-3 py-3">
                  <span className="text-xl flex-shrink-0">{ins.icon}</span>
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
