// Format currency
export const formatCurrency = (amount, currency = 'INR') => {
  const value = Number(amount) || 0;
  const hasPaise = Math.abs(value - Math.round(value)) > 0.001;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatCurrencyWithPaise = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

// Format compact (1,20,000 → ₹1.2L)
export const formatCompact = (amount) => {
  const value = Number(amount) || 0;
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
  return formatCurrency(value);
};

export const parseMoneyInput = (value) => {
  if (typeof value === 'number') return Math.round((value + Number.EPSILON) * 100) / 100;
  const cleaned = String(value ?? '').trim().replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  const decimalIndex = Math.max(lastDot, lastComma);
  const decimalPart = decimalIndex >= 0 ? cleaned.slice(decimalIndex + 1) : '';
  const hasDecimal = decimalIndex >= 0 && decimalPart.length > 0 && decimalPart.length <= 2;
  const normalized = hasDecimal
    ? `${cleaned.slice(0, decimalIndex).replace(/[.,]/g, '')}.${decimalPart.replace(/[.,]/g, '')}`
    : cleaned.replace(/[.,]/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) / 100 : 0;
};

// Get month name
export const getMonthName = (month) => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[month - 1] || '';
};

// Get current month/year
export const getCurrentPeriod = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

export const getAccountStartPeriod = (createdAt) => {
  const current = getCurrentPeriod();
  if (!createdAt) return { month: 1, year: current.year };

  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return { month: 1, year: current.year };

  const month = created.getMonth() + 1;
  const year = created.getFullYear();
  if (year > current.year || (year === current.year && month > current.month)) return current;
  return { month, year };
};

export const getPeriodLabel = ({ month, year }) => `${getMonthName(month)} ${year}`;

// Days until date
export const daysUntil = (date) => {
  const now = new Date();
  const target = new Date(date);
  const diff = target - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Months until date
export const monthsUntil = (date) => {
  const now = new Date();
  const target = new Date(date);
  return Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
};

// Progress percentage
export const getProgress = (current, target) => {
  if (!target || target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
};

// Time ago
export const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
