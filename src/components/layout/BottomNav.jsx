import { NavLink } from 'react-router-dom';
import { BarChart3, Home, Landmark, PlusCircle, Settings } from 'lucide-react';

const primaryItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/income', label: 'Income', icon: Landmark },
  { path: '/expenses?add=1', label: 'Expenses', icon: PlusCircle, primary: true },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const BottomNav = () => {
  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/[0.07] bg-bg-secondary/95 backdrop-blur-xl pb-safe">
        <div className="grid grid-cols-5 px-2 pt-2">
          {primaryItems.map(({ path, label, icon: Icon, primary }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => `flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition-colors ${
                isActive ? 'text-accent-green' : 'text-text-muted'
              }`}
            >
              {({ isActive }) => (
                <>
                  <span className={`flex items-center justify-center ${primary ? 'h-11 w-11 -mt-6 rounded-full border border-accent-green/30 bg-accent-green text-black shadow-lg shadow-accent-green/20' : 'h-6 w-6'}`}>
                    <Icon size={primary ? 22 : 20} strokeWidth={isActive || primary ? 2.4 : 2} />
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
};
