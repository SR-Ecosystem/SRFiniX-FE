import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Bell, CheckCircle2, CreditCard, Flag, Info, Target, Trash2 } from 'lucide-react';
import { deleteNotification, fetchNotifications, markAllRead, markRead } from '../features/notifications/notificationSlice';
import { Button, EmptyState, Spinner } from '../components/ui/index';
import { timeAgo } from '../utils/formatters';

const TYPE_META = {
  overspending: { icon: AlertTriangle, color: '#FF4B6B', bg: 'rgba(255,75,107,0.1)' },
  goal_complete: { icon: CheckCircle2, color: '#00E5A0', bg: 'rgba(0,229,160,0.1)' },
  goal_milestone: { icon: Target, color: '#00E5A0', bg: 'rgba(0,229,160,0.1)' },
  low_savings: { icon: AlertTriangle, color: '#F7931A', bg: 'rgba(247,147,26,0.1)' },
  monthly_summary: { icon: Flag, color: '#7B6EF6', bg: 'rgba(123,110,246,0.1)' },
  bill_reminder: { icon: Bell, color: '#3E8EFF', bg: 'rgba(62,142,255,0.1)' },
  emi_reminder: { icon: Bell, color: '#F7931A', bg: 'rgba(247,147,26,0.1)' },
  payment: { icon: CreditCard, color: '#00E5A0', bg: 'rgba(0,229,160,0.1)' },
  system: { icon: Info, color: '#8B91A7', bg: 'rgba(139,145,167,0.1)' },
};

export default function Notifications() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, unreadCount, isLoading, error } = useSelector((s) => s.notifications);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const handleMarkAllRead = () => dispatch(markAllRead());

  const handleOpen = async (notification) => {
    if (!notification.isRead) await dispatch(markRead(notification._id));
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  const handleDelete = async (event, id) => {
    event.stopPropagation();
    await dispatch(deleteNotification(id));
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Notifications</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-accent-red/20 bg-accent-red/10 p-3 text-sm text-accent-red">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><Spinner /></div>
      ) : list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="bell"
            title="No notifications"
            description="Alerts about UPI payments, overspending, goals, and summaries will appear here."
          />
        </div>
      ) : (
        <div className="card divide-y divide-white/[0.05] p-0 overflow-hidden">
          {list.map((notification, index) => {
            const meta = TYPE_META[notification.type] || TYPE_META.system;
            const Icon = meta.icon;

            return (
              <motion.button
                type="button"
                key={notification._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => handleOpen(notification)}
                className={`flex w-full cursor-pointer items-start gap-4 p-4 text-left group transition-colors hover:bg-white/[0.03] ${!notification.isRead ? 'bg-white/[0.02]' : ''}`}
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  <Icon size={20} />
                </span>

                <span className="flex-1 min-w-0">
                  <span className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-medium ${!notification.isRead ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {notification.title}
                    </span>
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: meta.color }} />
                    )}
                  </span>
                  <span className="block text-xs text-text-muted mt-1 leading-relaxed">{notification.message}</span>
                  <span className="block text-[11px] text-text-muted mt-1.5">{timeAgo(notification.createdAt)}</span>
                </span>

                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => handleDelete(event, notification._id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') handleDelete(event, notification._id);
                  }}
                  className="opacity-100 md:opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all flex-shrink-0 mt-1"
                  aria-label="Delete notification"
                >
                  <Trash2 size={16} />
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
