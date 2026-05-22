// Format currency
export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);
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
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
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
