import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Bell, CheckCircle2, CreditCard, Flag, Info, Target, Trash2 } from 'lucide-react';
import { deleteAllNotifications, deleteNotification, fetchNotifications, markAllRead, markRead } from '../features/notifications/notificationSlice';
import { Button, EmptyState, ComponentLoader, ConfirmDialog, Spinner } from '../components/ui/index';
import { timeAgo } from '../utils/formatters';
import toast from 'react-hot-toast';

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
  const { list, unreadCount, loaded, isLoading, error } = useSelector((s) => s.notifications);
  const [deletingId, setDeletingId] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  useEffect(() => {
    if (!loaded) dispatch(fetchNotifications());
  }, [dispatch, loaded]);

  const handleMarkAllRead = async () => {
    await dispatch(markAllRead());
    dispatch(fetchNotifications());
  };

  const handleOpen = async (notification) => {
    if (!notification.isRead) {
      await dispatch(markRead(notification._id));
      dispatch(fetchNotifications());
    }
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  const handleDelete = async (event, id) => {
    event.stopPropagation();
    setDeletingId(id);
    try {
      const res = await dispatch(deleteNotification(id));
      if (deleteNotification.fulfilled.match(res)) toast.success('Notification deleted.');
      else toast.error('Failed to delete notification.');
      dispatch(fetchNotifications());
    } finally {
      setDeletingId('');
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await dispatch(deleteAllNotifications());
      if (deleteAllNotifications.fulfilled.match(res)) {
        toast.success('All notifications deleted.');
        setConfirmDeleteAll(false);
        return;
      } else {
        toast.error(res.payload || 'Failed to delete notifications.');
      }
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <ConfirmDialog
        isOpen={confirmDeleteAll}
        title="Delete all notifications?"
        description="This will permanently remove every notification from your account."
        confirmLabel="Delete all"
        tone="danger"
        onClose={() => setConfirmDeleteAll(false)}
        onConfirm={handleDeleteAll}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Notifications</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
          {list.length > 0 && (
            <Button variant="danger" size="sm" onClick={() => setConfirmDeleteAll(true)} loading={deletingAll}>
              Delete all
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-accent-red/20 bg-accent-red/10 p-3 text-sm text-accent-red">
          {error}
        </div>
      )}

      {isLoading ? (
        <ComponentLoader label="Loading notifications..." />
      ) : list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="bell"
            title="No notifications"
            description="Alerts about UPI payments, overspending, goals, and summaries will appear here."
          />
        </div>
      ) : (
        <div className="card relative divide-y divide-white/[0.05] p-0 overflow-hidden">
          {deletingAll && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-bg-secondary/75 backdrop-blur-sm">
              <Spinner />
              <p className="text-xs font-medium text-text-muted">Deleting notifications...</p>
            </div>
          )}
          {list.map((notification, index) => {
            const meta = TYPE_META[notification.type] || TYPE_META.system;
            const Icon = meta.icon;

            return (
              <motion.div
                key={notification._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                className={`relative flex w-full cursor-pointer items-start gap-4 p-4 text-left group transition-colors hover:bg-white/[0.03] ${!notification.isRead ? 'bg-white/[0.02]' : ''} ${deletingId === notification._id ? 'opacity-70' : ''}`}
              >
                {deletingId === notification._id && (
                  <span className="absolute inset-0 z-10 flex items-center justify-center bg-bg-secondary/60 backdrop-blur-sm">
                    <Spinner size="sm" />
                  </span>
                )}
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  <Icon size={20} />
                </span>

                <button type="button" onClick={() => handleOpen(notification)} className="flex-1 min-w-0 text-left">
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
                </button>

                <button
                  type="button"
                  onClick={(event) => handleDelete(event, notification._id)}
                  disabled={!!deletingId || deletingAll}
                  className="opacity-100 md:opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all flex-shrink-0 mt-1"
                  aria-label="Delete notification"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
