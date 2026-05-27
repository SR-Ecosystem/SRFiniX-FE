import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import {
  Banknote,
  Bot,
  Briefcase,
  Building2,
  Car,
  Check,
  CircleDot,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  Lightbulb,
  Moon,
  Package,
  Plane,
  Receipt,
  Shield,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import { toggleTheme } from '../../features/ui/uiSlice';

export const ICONS = {
  bank: Building2,
  bills: Receipt,
  bot: Bot,
  briefcase: Briefcase,
  business: Briefcase,
  car: Car,
  check: Check,
  dot: CircleDot,
  education: GraduationCap,
  entertainment: Sparkles,
  food: Utensils,
  gadget: Smartphone,
  health: HeartPulse,
  home: Home,
  income: Banknote,
  insights: Lightbulb,
  investments: TrendingUp,
  laptop: Laptop,
  money: Wallet,
  package: Package,
  rent: Home,
  salary: Briefcase,
  savings: Banknote,
  shield: Shield,
  shopping: ShoppingBag,
  spent: TrendingDown,
  target: Target,
  trash: Trash2,
  travel: Plane,
};

export const getIconComponent = (icon = 'package') => {
  if (typeof icon !== 'string') return icon;
  return ICONS[icon] || Package;
};

export const IconBadge = ({ icon = 'package', color = '#00E5A0', className = '', iconClassName = '' }) => {
  const Icon = getIconComponent(icon);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl ${className}`}
      style={{ background: `${color}18`, color }}
    >
      <Icon size={18} strokeWidth={2.2} className={iconClassName} />
    </span>
  );
};

export const ThemeToggle = ({ className = '', orientation = 'horizontal' }) => {
  const dispatch = useDispatch();
  const { theme } = useSelector((s) => s.ui);
  const isDark = theme === 'dark';
  const isVertical = orientation === 'vertical';

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleTheme())}
      className={`flex rounded-full border border-border bg-bg-secondary p-0.5 text-text-secondary shadow-sm transition-colors hover:text-text-primary ${isVertical ? 'h-[4.25rem] w-9 flex-col items-center justify-between' : 'h-9 w-[4.5rem] items-center justify-between'} ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className={`flex items-center justify-center rounded-full transition-all ${isVertical ? 'h-8 w-8' : 'h-7 w-7'} ${!isDark ? 'bg-accent-green text-black shadow-md shadow-accent-green/25' : 'text-text-secondary'}`}>
        <Sun size={isVertical ? 13 : 15} />
      </span>
      <span className={`flex items-center justify-center rounded-full transition-all ${isVertical ? 'h-8 w-8' : 'h-7 w-7'} ${isDark ? 'bg-accent-green text-black shadow-md shadow-accent-green/25' : 'text-text-secondary'}`}>
        <Moon size={isVertical ? 13 : 15} />
      </span>
    </button>
  );
};

// Button
export const Button = ({ children, variant = 'primary', size = 'md', loading, className = '', ...props }) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-gradient-to-r from-accent-green to-emerald-600 text-black',
    secondary: 'bg-bg-tertiary border border-white/10 text-text-primary hover:border-white/20',
    danger: 'bg-accent-red/10 text-accent-red border border-accent-red/20 hover:bg-accent-red/20',
    ghost: 'text-text-secondary hover:text-text-primary',
  };
  const sizes = { sm: 'text-xs px-3 py-2', md: 'text-sm px-5 py-2.5', lg: 'text-base px-6 py-3' };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading} {...props}>
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
};

// Input
export const Input = ({ label, error, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="label">{label}</label>}
    <input
      className={`input ${error ? 'border-accent-red/50' : ''} ${className}`}
      {...props}
    />
    {error && <p className="text-accent-red text-xs mt-1">{error}</p>}
  </div>
);

// Select
export const Select = ({ label, error, children, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="label">{label}</label>}
    <select className={`select ${error ? 'border-accent-red/50' : ''} ${className}`} {...props}>
      {children}
    </select>
    {error && <p className="text-accent-red text-xs mt-1">{error}</p>}
  </div>
);

// Spinner
export const Spinner = ({ size = 'md' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={`${sizes[size]} border-2 border-white/20 border-t-accent-green rounded-full animate-spin`} />
  );
};

export const BrandLogo = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-8 h-8', md: 'w-12 h-12', lg: 'w-16 h-16' };
  return (
    <img
      src="/logo.png"
      alt="SRFiniX"
      className={`${sizes[size]} rounded-full object-cover ${className}`}
    />
  );
};

export const LogoLoader = ({ label = 'Loading SRFiniX...' }) => (
  <div className="flex flex-col items-center justify-center text-center">
    <div className="relative w-24 h-24 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-accent-green/15" />
      <div className="absolute inset-1 rounded-full border-2 border-white/10 border-t-accent-green animate-spin" />
      <div className="absolute inset-4 rounded-full border border-accent-purple/20 border-b-accent-purple animate-spin [animation-duration:1.8s] [animation-direction:reverse]" />
      <BrandLogo size="lg" className="relative z-10 shadow-xl shadow-black/30" />
    </div>
    {label && <p className="text-text-muted text-sm mt-4">{label}</p>}
  </div>
);

export const WelcomeSplash = ({ label = 'Preparing your finance workspace...' }) => (
  <motion.div
    className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-primary px-6 text-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,229,160,0.08),transparent_34%,rgba(247,147,26,0.08)_68%,rgba(62,142,255,0.08))]" />
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-green/50 to-transparent" />
    <motion.div
      className="relative z-10 flex w-full max-w-sm flex-col items-center"
      initial={{ y: 18, scale: 0.96 }}
      animate={{ y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 16 }}
    >
      <motion.div
        className="relative flex h-32 w-32 items-center justify-center"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          className="absolute inset-0 rounded-full border border-accent-green/25 shadow-2xl shadow-accent-green/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-bg-card border-t-accent-green border-r-accent-orange"
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
        <BrandLogo size="lg" className="relative z-10 h-24 w-24 shadow-2xl shadow-black/20" />
      </motion.div>
      <motion.h1
        className="mt-5 font-display text-3xl font-bold text-text-primary"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        Welcome to SR<span className="text-accent-green">FiniX</span>
      </motion.h1>
      <motion.p
        className="mt-2 max-w-xs text-sm leading-relaxed text-text-secondary"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {label}
      </motion.p>
      <motion.div
        className="mt-6 grid w-full grid-cols-3 gap-2"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.12, delayChildren: 0.35 } },
        }}
      >
        {[
          ['Income', '#00E5A0'],
          ['Budget', '#7B6EF6'],
          ['Goals', '#F7931A'],
        ].map(([text, color]) => (
          <motion.div
            key={text}
            className="rounded-xl border border-border bg-bg-secondary/80 px-3 py-2 shadow-sm"
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: { opacity: 1, y: 0 },
            }}
          >
            <span className="mx-auto mb-1 block h-1.5 w-8 rounded-full" style={{ background: color }} />
            <p className="text-[11px] font-semibold text-text-secondary">{text}</p>
          </motion.div>
        ))}
      </motion.div>
      <div className="mt-6 h-1.5 w-52 overflow-hidden rounded-full bg-bg-tertiary">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-accent-green via-accent-orange to-accent-blue"
          initial={{ x: '-100%' }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  </motion.div>
);

export const ComponentLoader = ({ label = 'Loading...', prominent = false }) => (
  <div className={`flex flex-col items-center justify-center text-center ${prominent ? 'min-h-0' : 'min-h-40'}`}>
    <div className={`relative flex items-center justify-center ${prominent ? 'h-24 w-24' : 'h-16 w-16'}`}>
      <div className="absolute inset-0 rounded-full border border-accent-green/25 shadow-[0_0_35px_rgba(0,229,160,0.22)]" />
      <div className="absolute inset-1 rounded-full border-2 border-slate-200 border-t-accent-green animate-spin dark:border-white/10 dark:border-t-accent-green" />
      <div className="absolute inset-3 rounded-full border border-accent-orange/20 border-b-accent-orange animate-spin [animation-duration:1.8s] [animation-direction:reverse]" />
      <BrandLogo
        size={prominent ? 'lg' : 'md'}
        className="relative z-10 border border-white/80 bg-white shadow-xl shadow-black/20 dark:border-white/15"
      />
    </div>
    {label && (
      <p className={`${prominent ? 'mt-4 text-sm' : 'mt-3 text-xs'} max-w-[14rem] font-semibold leading-snug text-slate-700 dark:text-slate-200`}>
        {label}
      </p>
    )}
    {prominent && (
      <div className="mt-4 h-1.5 w-44 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <motion.div
          className="h-full w-1/2 rounded-full bg-gradient-to-r from-accent-green via-accent-orange to-accent-blue"
          initial={{ x: '-120%' }}
          animate={{ x: ['-120%', '240%'] }}
          transition={{ duration: 1.25, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    )}
  </div>
);

export const OperationOverlay = () => {
  const { operationLoading, operationLabel } = useSelector((s) => s.ui);

  return (
    <AnimatePresence>
      {operationLoading && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/95 px-9 py-8 shadow-2xl shadow-black/35 dark:border-white/10 dark:bg-[#10141C]/95"
            initial={{ scale: 0.96, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 10 }}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent-green via-accent-orange to-accent-blue" />
            <ComponentLoader label={operationLabel || 'Updating latest data...'} prominent />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const ConfirmDialog = ({
  isOpen,
  title = 'Confirm action',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'green',
  onConfirm,
  onClose,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title}>
    <p className="text-sm leading-relaxed text-text-secondary">{description}</p>
    <div className="mt-6 flex gap-3">
      <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">
        {cancelLabel}
      </Button>
      <Button
        type="button"
        variant={tone === 'danger' ? 'danger' : 'primary'}
        onClick={onConfirm}
        className="flex-1 justify-center"
      >
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);

// Card
export const Card = ({ children, className = '', hover = false, ...props }) => (
  <div className={`card ${hover ? 'hover:border-white/15 cursor-pointer transition-colors' : ''} ${className}`} {...props}>
    {children}
  </div>
);

// Badge
export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-white/10 text-text-primary',
    green:  'badge-green',
    red:    'badge-red',
    purple: 'badge-purple',
    orange: 'badge-orange',
  };
  return <span className={`badge ${variants[variant]} ${className}`}>{children}</span>;
};

// Progress Bar
export const ProgressBar = ({ value, color = '#00E5A0', className = '' }) => (
  <div className={`progress-bar ${className}`}>
    <div
      className="progress-fill"
      style={{ width: `${Math.min(value, 100)}%`, background: color }}
    />
  </div>
);

// Modal
export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className={`modal-content ${maxWidth}`}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="flex items-center justify-between p-6 border-b border-white/[0.07]">
            <h3 className="font-display font-semibold text-base">{title}</h3>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors" aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Empty State
export const EmptyState = ({ icon = 'package', title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <IconBadge icon={icon} color="#8B91A7" className="mb-4 h-14 w-14 opacity-80" iconClassName="h-7 w-7" />
    <h3 className="font-display font-semibold text-text-primary mb-2">{title}</h3>
    <p className="text-text-secondary text-sm max-w-xs mb-6">{description}</p>
    {action}
  </div>
);

// Stat Card
export const StatCard = ({ label, value, delta, icon, color = '#00E5A0', sub, loading = false }) => (
  <motion.div
    className="stat-card"
    whileHover={{ y: -2 }}
    transition={{ type: 'spring', stiffness: 400 }}
  >
    <div
      className="absolute top-0 left-0 right-0 h-0.5"
      style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
    />
    <span className="absolute top-4 right-4 opacity-20">
      {(() => {
        const Icon = getIconComponent(icon);
        return <Icon size={28} strokeWidth={1.8} style={{ color }} />;
      })()}
    </span>
    <p className="mb-2 pr-9 text-xs uppercase tracking-widest text-text-muted break-words">{label}</p>
    {loading ? (
      <div className="space-y-2">
        <div className="h-7 w-28 max-w-full animate-pulse rounded-lg bg-bg-card" />
        <div className="h-3 w-24 max-w-full animate-pulse rounded bg-bg-card" />
      </div>
    ) : (
      <>
        <p className="font-display text-lg sm:text-2xl font-bold leading-tight break-words mb-1.5" style={{ color }}>{value}</p>
        {delta && <p className="text-xs leading-snug text-text-secondary">{delta}</p>}
        {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
      </>
    )}
  </motion.div>
);
