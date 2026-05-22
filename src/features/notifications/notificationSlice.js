import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationAPI } from '../../api/notification.api';

export const fetchNotifications = createAsyncThunk('notifications/fetch', async (_, { rejectWithValue }) => {
  try { const res = await notificationAPI.getAll(); return res.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});
export const markAllRead = createAsyncThunk('notifications/markAllRead', async () => {
  await notificationAPI.markAllRead();
});
export const markRead = createAsyncThunk('notifications/markRead', async (id) => {
  await notificationAPI.markRead(id);
  return id;
});
export const deleteNotification = createAsyncThunk('notifications/delete', async (id) => {
  await notificationAPI.delete(id);
  return id;
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { list: [], unreadCount: 0, isLoading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchNotifications.pending, (s) => { s.isLoading = true; s.error = null; });
    b.addCase(fetchNotifications.fulfilled, (s, a) => { s.isLoading = false; s.list = a.payload.notifications; s.unreadCount = a.payload.unreadCount; });
    b.addCase(fetchNotifications.rejected, (s, a) => { s.isLoading = false; s.error = a.payload || 'Failed to load notifications'; });
    b.addCase(markAllRead.fulfilled, (s) => { s.unreadCount = 0; s.list = s.list.map((n) => ({ ...n, isRead: true })); });
    b.addCase(markRead.fulfilled, (s, a) => {
      const notification = s.list.find((n) => n._id === a.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        s.unreadCount = Math.max(0, s.unreadCount - 1);
      }
    });
    b.addCase(deleteNotification.fulfilled, (s, a) => {
      const notification = s.list.find((n) => n._id === a.payload);
      if (notification && !notification.isRead) s.unreadCount = Math.max(0, s.unreadCount - 1);
      s.list = s.list.filter((n) => n._id !== a.payload);
    });
  },
});
export default notificationSlice.reducer;
