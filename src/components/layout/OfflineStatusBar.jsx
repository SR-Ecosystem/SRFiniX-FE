import { useConnectionStripState } from '../../hooks/useConnectionStripState';

export const OfflineStatusBar = () => {
  const { online, visible, message } = useConnectionStripState();

  return visible ? (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className={`w-full px-4 py-1.5 text-center text-[13px] font-semibold leading-snug text-white shadow-[0_-4px_14px_rgba(0,0,0,0.14)] ${
        online
          ? 'bg-emerald-500'
          : 'bg-[#ff2017]'
      }`}
      >
        {message}
      </div>
    </div>
  ) : null;
};
