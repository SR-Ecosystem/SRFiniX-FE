import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Home, Landmark, LayoutGrid, PlusCircle, Target } from 'lucide-react';
import { MobileFeatureMenu } from './MobileFeatureMenu';
import { useConnectionStripState } from '../../hooks/useConnectionStripState';

const primaryItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/income', label: 'Income', icon: Landmark },
  { path: '/expenses?add=1', label: 'Expenses', icon: PlusCircle, primary: true },
  { path: '/strategy', label: 'Strategy', icon: Target },
  { path: '/menu', label: 'Menu', icon: LayoutGrid, menu: true },
];

export const BottomNav = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { visible: statusVisible } = useConnectionStripState();

  return (
    <>
      <MobileFeatureMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <nav className={`fixed inset-x-3 z-30 overflow-visible rounded-2xl border border-border bg-bg-secondary/95 shadow-xl shadow-black/10 backdrop-blur-xl transition-[bottom] duration-200 md:hidden ${statusVisible ? 'bottom-9' : 'bottom-3'}`}>
        <div className="grid grid-cols-5 px-2 pb-1.5 pt-1.5">
          {primaryItems.map(({ path, label, icon: Icon, primary, menu }) => (
            menu ? (
              <button
                key={path}
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold text-text-muted transition-colors hover:text-accent-green"
              >
                <span className="flex h-5 w-5 items-center justify-center">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className="leading-none">{label}</span>
              </button>
            ) : (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) => `${primary ? 'relative flex min-h-[52px] !overflow-visible flex-col items-center justify-end rounded-xl pb-1 pt-0' : 'flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl py-1'} text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-accent-green' : 'text-text-muted'
                }`}
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex items-center justify-center ${primary ? 'absolute -top-7 h-14 w-14 rounded-full border-[5px] border-bg-secondary bg-accent-green text-black shadow-xl shadow-accent-green/30 ring-1 ring-accent-green/35 transition-transform active:scale-95' : 'h-5 w-5'}`}>
                      <Icon size={primary ? 21 : 18} strokeWidth={isActive || primary ? 2.4 : 2} />
                    </span>
                    <span className={`${primary ? 'mt-7' : ''} leading-none`}>{label}</span>
                  </>
                )}
              </NavLink>
            )
          ))}
        </div>
      </nav>
    </>
  );
};
