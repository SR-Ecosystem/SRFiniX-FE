import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const NOTIFIED_KEY = 'srfinix.mobileNotifiedIds';
const CHANNEL_ID = 'srfinix-alerts';

const isNative = () => Capacitor.isNativePlatform();

const readNotifiedIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

const writeNotifiedIds = (ids) => {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids].slice(-200)));
};

const numericId = (id) => {
  const source = String(id || Date.now());
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) || Date.now();
};

export const ensureMobileNotificationPermission = async () => {
  if (!isNative()) return { granted: false, native: false };

  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return { granted: true, native: true };

  const requested = await LocalNotifications.requestPermissions();
  return { granted: requested.display === 'granted', native: true };
};

export const setupMobileNotifications = async () => {
  if (!isNative()) return false;

  const permission = await ensureMobileNotificationPermission();
  if (!permission.granted) return false;

  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'SRFiniX Alerts',
    description: 'Finance alerts and daily limit updates',
    importance: 4,
    visibility: 1,
    vibration: true,
  });

  return true;
};

export const showMobileNotification = async ({ id, title, message }) => {
  if (!isNative()) return false;

  const ready = await setupMobileNotifications();
  if (!ready) return false;

  await LocalNotifications.schedule({
    notifications: [{
      id: numericId(id),
      title: title || 'SRFiniX',
      body: message || 'You have a new update.',
      channelId: CHANNEL_ID,
    }],
  });

  return true;
};

export const notifyUnreadOnMobile = async (notifications = [], enabled = true) => {
  if (!enabled || !isNative()) return;

  const notifiedIds = readNotifiedIds();
  const freshUnread = notifications
    .filter((notification) => notification?._id && !notification.isRead && !notifiedIds.has(notification._id))
    .slice(0, 5);

  if (!freshUnread.length) return;

  for (const notification of freshUnread) {
    await showMobileNotification({
      id: notification._id,
      title: notification.title,
      message: notification.message,
    });
    notifiedIds.add(notification._id);
  }

  writeNotifiedIds(notifiedIds);
};
