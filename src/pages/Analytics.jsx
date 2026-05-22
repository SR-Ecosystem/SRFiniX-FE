import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { fetchDaily, fetchInsights, fetchMonthly, fetchOverview, fetchWeekly } from '../features/analytics/analyticsSlice';
import { ProgressBar, Spinner, StatCard } from '../components/ui/index';
import { formatCompact, formatCurrency } from '../utils/formatters';
import { CATEGORIES } from '../constants/categories';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-bg-secondary border border-white/10 rounded-xl p-3 text-xs shadow-xl">
      <p className="text-text-muted mb-1.5 font-medium">{label}</p>
      {payload.map((item, index) => (
        <p key={index} style={{ color: item.color }}>
          {item.name}: {formatCurrency(item.value)}
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const dispatch = useDispatch();
  const { overview, daily, monthly, insights, weekly, isLoading } = useSelector((s) => s.analytics);

  useEffect(() => {
    const year = new Date().getFullYear();
    dispatch(fetchOverview({}));
    dispatch(fetchDaily({}));
    dispatch(fetchMonthly({ year }));
    dispatch(fetchWeekly());
    dispatch(fetchInsights());
  }, [dispatch]);

  const dailyChartData = daily?.days?.map((day) => ({
    name: String(day.day),
    Income: day.income,
    Expenses: day.expense,
    Savings: Math.max(0, day.savings),
  })) || [];

  const monthlyChartData = monthly?.months?.map((month) => ({
    name: MONTH_NAMES[month.month - 1],
    Income: month.income,
    Expenses: month.expense,
    Savings: Math.max(0, month.savings),
  })) || [];

  const categoryData = Object.entries(overview?.categoryBreakdown || {})
    .map(([key, value]) => ({
      key,
      name: CATEGORIES[key]?.label || key,
      value,
      color: CATEGORIES[key]?.color || '#8B91A7',
    }))
    .sort((a, b) => b.value - a.value);

  const totalExpense = overview?.totalExpense || 0;

  return (
    <div className="space-y-5 max-w-6xl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Income" value={formatCompact(overview?.totalIncome || 0)} icon="+" color="#00E5A0" delta={`${overview?.savingsRate || 0}% savings rate`} />
        <StatCard label="Total Spent" value={formatCompact(overview?.totalExpense || 0)} icon="-" color="#FF4B6B" delta={overview?.expenseDelta !== undefined ? `${Math.abs(overview.expenseDelta)}% vs last month` : ''} />
        <StatCard label="Net Savings" value={formatCompact(overview?.netSavings || 0)} icon="=" color="#F7931A" />
        <StatCard label="Avg Daily Spend" value={formatCompact(Math.round((overview?.totalExpense || 0) / 30))} icon="*" color="#7B6EF6" delta="This month" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="mb-5">
          <h3 className="font-display font-semibold">Daily Analysis</h3>
          <p className="text-xs text-text-muted mt-0.5">Income, expenses, and savings by day</p>
        </div>
        {isLoading ? (
          <div className="h-56 flex items-center justify-center"><Spinner /></div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyChartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#555C72', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#555C72', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value / 1000}K`} width={45} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
              <Line type="monotone" dataKey="Income" stroke="#00E5A0" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Expenses" stroke="#FF4B6B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Savings" stroke="#F7931A" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h3 className="font-display font-semibold">Monthly Analysis</h3>
            <p className="text-xs text-text-muted mt-0.5">{new Date().getFullYear()} comparison</p>
          </div>
          <div className="flex gap-4 text-xs text-text-secondary">
            {[['Income', '#00E5A0'], ['Expenses', '#7B6EF6'], ['Savings', '#F7931A']].map(([name, color]) => (
              <span key={name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
                {name}
              </span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyChartData} barSize={8} barCategoryGap="35%">
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#555C72', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#555C72', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value / 1000}K`} width={45} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="Income" fill="#00E5A0" radius={[4, 4, 0, 0]} opacity={0.85} />
            <Bar dataKey="Expenses" fill="#7B6EF6" radius={[4, 4, 0, 0]} opacity={0.85} />
            <Bar dataKey="Savings" fill="#F7931A" radius={[4, 4, 0, 0]} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
          <h3 className="font-display font-semibold mb-4">Category Analysis</h3>
          {categoryData.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No expense data yet</p>
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3}>
                    {categoryData.map((entry) => <Cell key={entry.key} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {categoryData.map((category) => {
                const pct = totalExpense > 0 ? Math.round((category.value / totalExpense) * 100) : 0;
                return (
                  <div key={category.key}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: `${category.color}15` }}>
                        {CATEGORIES[category.key]?.icon || '#'}
                      </div>
                      <span className="text-sm flex-1">{category.name}</span>
                      <span className="font-display font-semibold text-sm">{formatCurrency(category.value)}</span>
                      <span className="text-xs text-text-muted w-8 text-right">{pct}%</span>
                    </div>
                    <div className="pl-10">
                      <ProgressBar value={pct} color={category.color} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card">
            <h3 className="font-display font-semibold mb-1">Weekly Analysis</h3>
            <p className="text-xs text-text-muted mb-4">Last 7 days spending</p>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted">Total Spent</p>
                <p className="font-display font-bold text-sm text-accent-red mt-0.5">{formatCurrency(weekly?.totalSpent || 0)}</p>
              </div>
              <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted">Daily Avg</p>
                <p className="font-display font-bold text-sm text-accent-purple mt-0.5">{formatCurrency(weekly?.avgDaily || 0)}</p>
              </div>
              <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted">Top Category</p>
                <p className="font-display font-bold text-xs text-accent-orange mt-0.5 capitalize">{weekly?.topCategory?.name || '-'}</p>
              </div>
            </div>
            {weekly?.dailyData?.length > 0 && (
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={weekly.dailyData} barSize={12}>
                  <XAxis dataKey="date" hide />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="amount" fill="#7B6EF6" radius={[3, 3, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card bg-gradient-to-br from-accent-purple/10 to-transparent border-accent-purple/20">
            <h3 className="font-display font-semibold mb-1">Smart Insights</h3>
            <p className="text-xs text-text-muted mb-3">Based on your spending patterns</p>
            <div className="space-y-3">
              {insights.slice(0, 4).map((insight, index) => (
                <div key={index} className="flex gap-3 p-3 bg-bg-tertiary/50 rounded-xl">
                  <span className="text-lg flex-shrink-0">{insight.icon}</span>
                  <p className="text-xs text-text-secondary leading-relaxed">{insight.message}</p>
                </div>
              ))}
              {insights.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">Add more transactions to unlock insights</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
