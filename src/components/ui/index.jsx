import { motion, AnimatePresence } from 'framer-motion';

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
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors text-xl">✕</button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Empty State
export const EmptyState = ({ icon = '📭', title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl mb-4 opacity-40">{icon}</div>
    <h3 className="font-display font-semibold text-text-primary mb-2">{title}</h3>
    <p className="text-text-secondary text-sm max-w-xs mb-6">{description}</p>
    {action}
  </div>
);

// Stat Card
export const StatCard = ({ label, value, delta, icon, color = '#00E5A0', sub }) => (
  <motion.div
    className="stat-card"
    whileHover={{ y: -2 }}
    transition={{ type: 'spring', stiffness: 400 }}
  >
    <div
      className="absolute top-0 left-0 right-0 h-0.5"
      style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
    />
    <span className="absolute top-4 right-4 text-2xl opacity-10">{icon}</span>
    <p className="text-xs text-text-muted uppercase tracking-widest mb-2">{label}</p>
    <p className="font-display text-lg sm:text-2xl font-bold leading-tight break-words mb-1.5" style={{ color }}>{value}</p>
    {delta && <p className="text-xs text-text-secondary">{delta}</p>}
    {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
  </motion.div>
);
