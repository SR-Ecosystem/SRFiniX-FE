import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Goal,
  Home,
  Landmark,
  PieChart,
  PlusCircle,
  ReceiptText,
  Settings,
  X,
} from 'lucide-react';

export const mobileFeatures = [
  { path: '/', label: 'Dashboard', icon: Home, sub: 'Overview' },
  { path: '/expenses', label: 'Expenses', icon: ReceiptText, sub: 'Track spending' },
  { path: '/income', label: 'Income', icon: Landmark, sub: 'Sources' },
  { path: '/goals', label: 'Goals', icon: Goal, sub: 'Savings targets' },
  { path: '/strategy', label: 'Strategy', icon: PieChart, sub: 'Budget plan' },
  { path: '/expenses?add=1', label: 'Add Expense', icon: PlusCircle, sub: 'Record spend' },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, sub: 'Insights' },
  { path: '/notifications', label: 'Alerts', icon: Bell, sub: 'Reminders' },
  { path: '/settings', label: 'Settings', icon: Settings, sub: 'Account' },
];

export const MobileFeatureMenu = ({ isOpen, onClose }) => {
  const location = useLocation();

  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-white/[0.07] bg-bg-secondary p-4 pb-safe shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">All Features</h2>
            <p className="text-xs text-text-secondary">Everything in SRFiniX</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-bg-tertiary text-text-secondary"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {mobileFeatures.map(({ path, label, icon: Icon, sub }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={onClose}
                className={`rounded-2xl border p-3 transition-colors ${
                  active ? 'border-accent-green/40 bg-accent-green/10 text-accent-green' : 'border-white/[0.07] bg-bg-tertiary text-text-primary'
                }`}
              >
                <Icon size={20} />
                <span className="mt-2 block text-xs font-bold">{label}</span>
                <span className="mt-0.5 block text-[10px] text-text-muted">{sub}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
