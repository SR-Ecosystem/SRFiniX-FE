import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, LayoutGrid, Menu, Search } from 'lucide-react';
import { toggleSidebar } from '../../features/ui/uiSlice';
import { MobileFeatureMenu } from './MobileFeatureMenu';
import { BrandLogo } from '../ui/index';

const PAGE_TITLES = {
  '/': { title: 'Dashboard', sub: 'Your financial overview' },
  '/expenses': { title: 'Expenses', sub: 'Track your spending' },
  '/income': { title: 'Income', sub: 'Manage income sources' },
  '/goals': { title: 'Goals', sub: 'Your savings targets' },
  '/strategy': { title: 'Budget Strategy', sub: 'Allocate your income' },
  '/analytics': { title: 'Analytics', sub: 'Deep financial insights' },
  '/statistics': { title: 'Analytics', sub: 'Your financial statistics' },
  '/notifications': { title: 'Notifications', sub: 'Alerts & reminders' },
  '/settings': { title: 'Settings', sub: 'Preferences & account' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const Topbar = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [isFeatureMenuOpen, setIsFeatureMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const { unreadCount } = useSelector((s) => s.notifications);
  const { user } = useSelector((s) => s.auth);

  const page = PAGE_TITLES[location.pathname] || { title: 'SRFiniX', sub: '' };
  const period = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const dateTime = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const greeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayTitle = location.pathname === '/'
    ? `${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`
    : page.title;

  return (
    <>
      <MobileFeatureMenu isOpen={isFeatureMenuOpen} onClose={() => setIsFeatureMenuOpen(false)} />
      <header className="sticky top-0 z-10 bg-bg-primary/90 backdrop-blur-md border-b border-white/[0.07] px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <BrandLogo size="sm" className="flex-shrink-0" />
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="hidden md:flex w-9 h-9 rounded-xl bg-bg-secondary border border-white/[0.07] items-center justify-center text-text-secondary hover:text-text-primary hover:border-white/20 transition-all"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="font-display font-bold text-base md:text-lg leading-tight truncate">
                SR<span className="text-accent-green">FiniX</span>
              </h1>
              <span className="hidden sm:inline text-xs text-text-muted truncate">{displayTitle}</span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 truncate">
              <span className="sm:hidden">{displayTitle} · </span>{dateTime}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFeatureMenuOpen(true)}
            className="md:hidden w-9 h-9 rounded-xl bg-bg-secondary border border-white/[0.07] flex items-center justify-center text-text-secondary"
            aria-label="Open all features"
          >
            <LayoutGrid size={18} />
          </button>

          <div className="hidden sm:flex bg-bg-secondary border border-white/[0.07] rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary">
            {dateTime} · {period}
          </div>

          <div className="hidden md:flex items-center gap-2 bg-bg-secondary border border-white/[0.07] rounded-xl px-3 h-9 min-w-[160px]">
            <Search size={15} className="text-text-muted" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-xs text-text-primary placeholder:text-text-muted w-full font-sans"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => navigate('/notifications')}
              className="w-9 h-9 rounded-xl bg-bg-secondary border border-white/[0.07] flex items-center justify-center text-text-secondary hover:border-accent-green/40 hover:text-accent-green transition-all"
              aria-label="Open notifications"
            >
              <Bell size={18} />
            </button>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-red text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>

          {user?.financialHealthScore > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 bg-accent-green/10 border border-accent-green/20 rounded-xl px-3 py-1.5">
              <span className="text-xs text-accent-green font-semibold">Score</span>
              <span className="font-display font-bold text-sm text-accent-green">{user.financialHealthScore}</span>
            </div>
          )}
        </div>
      </header>
    </>
  );
};
