import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, RefreshCw } from 'lucide-react';
import { startOperation, toggleSidebar } from '../../features/ui/uiSlice';
import { BrandLogo, ThemeToggle } from '../ui/index';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CompactClockText = ({ date }) => {
  const weekday = new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date);
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS[date.getMonth()];
  const hour24 = date.getHours();
  const hour = String(hour24 % 12 || 12).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  const meridiem = hour24 >= 12 ? 'pm' : 'am';

  return <>{weekday}, {day} {month}, {hour}:{minute}:<span className="inline-block min-w-[2ch] text-center">{second}</span> {meridiem}</>;
};

export const Topbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);
  const { unreadCount } = useSelector((s) => s.notifications);
  const { user } = useSelector((s) => s.auth);

  const period = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const dateTimeParts = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name?.split(' ')[0] || 'there';
  const displayTitle = `${greeting()}, ${firstName}`;
  const profileInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'S';

  const handleRefresh = async () => {
    if (!navigator.onLine) {
      window.dispatchEvent(new CustomEvent('srfinix:offline-sync', { detail: { type: 'offline-cache' } }));
      return;
    }
    setRefreshing(true);
    dispatch(startOperation('Reloading latest data...'));
    window.setTimeout(() => window.location.reload(), 120);
  };

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[74px] items-stretch justify-between gap-2 overflow-hidden border-b border-border bg-bg-secondary/95 px-3 py-2 shadow-sm backdrop-blur-xl md:h-[82px] md:px-7 md:py-3">
        <div className="flex min-w-0 flex-1 flex-col justify-center self-center">
          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <BrandLogo size="md" className="h-8 w-8 flex-shrink-0 border border-border shadow-sm min-[420px]:h-9 min-[420px]:w-9 md:h-10 md:w-10" />
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-border bg-bg-tertiary text-text-secondary transition-all hover:border-accent-green/30 hover:text-text-primary xl:flex"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
            <h1 className="min-w-0 truncate font-display text-xl font-bold leading-none text-text-primary min-[420px]:text-2xl md:text-3xl">
              SR<span className="text-accent-green">FiniX</span>
            </h1>
          </div>
          <p className="mt-1.5 max-w-[48vw] overflow-hidden whitespace-nowrap pl-0.5 text-[10px] leading-none text-text-secondary min-[420px]:max-w-[52vw] min-[420px]:text-[11px] sm:max-w-none md:text-sm">
            <span className="sm:hidden">
              <CompactClockText date={now} />
            </span>
            <span className="hidden sm:inline">
              {dateTimeParts.map((part) => part.value).join('')}
            </span>
          </p>
        </div>

        <div className="flex flex-shrink-0 items-stretch gap-2 md:gap-3">
          <div className="flex min-w-0 flex-col items-end justify-between py-0.5">
            <p className="max-w-[46vw] truncate whitespace-nowrap text-right text-[11px] font-semibold leading-none text-text-primary min-[420px]:text-[12px] md:max-w-[40vw] md:text-sm">
              {greeting()}, {firstName}
            </p>

            <div className="flex items-center gap-1 md:gap-2">
              <ThemeToggle className="!h-8 !w-[4rem] md:!h-9 md:!w-[4.5rem]" />

              <div className="flex items-center rounded-2xl border border-border bg-bg-tertiary/90 p-0.5 shadow-sm md:p-1">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex h-7 w-7 items-center justify-center rounded-xl text-text-secondary transition-all hover:bg-bg-card hover:text-accent-green disabled:cursor-wait disabled:opacity-70 min-[420px]:h-8 min-[420px]:w-8 md:h-9 md:w-9 md:rounded-2xl"
                  aria-label="Refresh latest data"
                  title="Refresh latest data"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => navigate('/notifications')}
                    className="flex h-7 w-7 items-center justify-center rounded-xl text-text-secondary transition-all hover:bg-bg-card hover:text-accent-green min-[420px]:h-8 min-[420px]:w-8 md:h-9 md:w-9 md:rounded-2xl"
                    aria-label="Open notifications"
                  >
                    <Bell size={16} />
                  </button>
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-red px-1 text-[9px] font-bold text-white md:right-2 md:top-1">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex aspect-square h-full max-h-[58px] min-h-[54px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-accent-orange/60 bg-bg-tertiary p-0.5 text-sm font-bold text-text-primary shadow-sm transition-all hover:border-accent-green/60 md:max-h-[62px]"
            aria-label="Open profile settings"
            title="Profile"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user?.name || 'Profile'} className="h-full w-full rounded-full object-cover" />
            ) : (
              <span>{profileInitial}</span>
            )}
          </button>

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
