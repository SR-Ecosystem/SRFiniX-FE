import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Bell,
  GitBranch,
  Home,
  Landmark,
  ReceiptText,
  Settings,
  Target,
} from 'lucide-react';
import { logoutUser } from '../../features/auth/authSlice';
import { BrandLogo } from '../ui/index';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/expenses', icon: ReceiptText, label: 'Expenses' },
  { path: '/income', icon: Landmark, label: 'Income' },
  { path: '/goals', icon: Target, label: 'Goals' },
  { path: '/strategy', icon: GitBranch, label: 'Strategy' },
];

const bottomItems = [
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/notifications', icon: Bell, label: 'Alerts' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar = ({ isOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { unreadCount } = useSelector((s) => s.notifications);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: -220, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -220, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="hidden md:flex w-[220px] flex-shrink-0 bg-bg-secondary border-r border-white/[0.07] flex-col h-screen sticky top-0"
        >
          <div className="p-6 pb-7">
            <div className="flex items-center gap-2.5">
              <BrandLogo size="sm" />
              <span className="font-display font-bold text-lg">
                SR<span className="text-accent-green">FiniX</span>
              </span>
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            <p className="text-[10px] text-text-muted uppercase tracking-[1.5px] px-3 mb-2">Menu</p>
            {navItems.map(({ path, icon: Icon, label }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                {label}
              </NavLink>
            ))}

            <p className="text-[10px] text-text-muted uppercase tracking-[1.5px] px-3 mt-5 mb-2">Insights</p>
            {bottomItems.map(({ path, icon: Icon, label }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                {label}
                {path === '/notifications' && unreadCount > 0 && (
                  <span className="ml-auto bg-accent-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-3">
            <div className="bg-bg-tertiary rounded-xl p-3">
              <div className="flex items-center gap-2.5 mb-3">
                {user?.avatarUrl || user?.avatar ? (
                  <img
                    src={user.avatarUrl || user.avatar}
                    alt={user?.name || 'Profile'}
                    className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-accent-green flex items-center justify-center font-bold text-xs text-white flex-shrink-0">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-[11px] text-text-secondary truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-xs text-text-muted hover:text-accent-red transition-colors text-left"
              >
                Sign out
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
