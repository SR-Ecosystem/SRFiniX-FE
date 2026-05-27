import { useEffect, useRef, useState } from 'react';

const ONLINE_VISIBLE_MS = 2000;
const POLL_MS = 500;
const STATUS_KEY = 'srfinix.connectionStatus';

const readStatus = () => localStorage.getItem(STATUS_KEY) || (navigator.onLine ? 'online' : 'offline');
const writeStatus = (status) => localStorage.setItem(STATUS_KEY, status);

export const useConnectionStripState = () => {
  const initialStatus = readStatus();
  const [state, setState] = useState(() => ({
    online: initialStatus !== 'offline',
    showOnlineNotice: false,
  }));
  const hideTimer = useRef(null);
  const wasOffline = useRef(initialStatus === 'offline' || !navigator.onLine);
  const onlineRef = useRef(initialStatus !== 'offline' && navigator.onLine);

  useEffect(() => {
    const showOffline = () => {
      window.clearTimeout(hideTimer.current);
      wasOffline.current = true;
      onlineRef.current = false;
      writeStatus('offline');
      setState({ online: false, showOnlineNotice: false });
    };

    const showOnline = ({ force = false } = {}) => {
      if (!navigator.onLine && !force) return;
      onlineRef.current = true;
      if (!wasOffline.current) {
        writeStatus('online');
        setState({ online: true, showOnlineNotice: false });
        return;
      }

      window.clearTimeout(hideTimer.current);
      writeStatus('online');
      setState({ online: true, showOnlineNotice: true });
      hideTimer.current = window.setTimeout(() => {
        wasOffline.current = false;
        setState({ online: true, showOnlineNotice: false });
      }, ONLINE_VISIBLE_MS);
    };

    const handleSyncEvent = (event) => {
      const type = event.detail?.type;
      if (type === 'queued' || type === 'offline-cache') showOffline();
      if (type === 'online') showOnline({ force: true });
      if (type === 'synced' && Number(event.detail?.remaining || 0) === 0 && Number(event.detail?.synced || 0) > 0) {
        showOnline({ force: true });
      }
    };

    const pollConnection = () => {
      const nextOnline = navigator.onLine;
      if (nextOnline === onlineRef.current) return;
      if (!nextOnline) showOffline();
    };

    window.addEventListener('online', showOnline);
    window.addEventListener('offline', showOffline);
    window.addEventListener('srfinix:offline-sync', handleSyncEvent);
    const pollTimer = window.setInterval(pollConnection, POLL_MS);

    return () => {
      window.clearTimeout(hideTimer.current);
      window.clearInterval(pollTimer);
      window.removeEventListener('online', showOnline);
      window.removeEventListener('offline', showOffline);
      window.removeEventListener('srfinix:offline-sync', handleSyncEvent);
    };
  }, []);

  const visible = !state.online || state.showOnlineNotice;
  const message = state.online
    ? 'Online, Data is syncing...'
    : 'Offline, dont worry we will save in local';

  return { ...state, visible, message };
};
