import { createSlice } from '@reduxjs/toolkit';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6 ? 'dark' : 'light';
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    activeModal: null,
    theme: getInitialTheme(),
    operationLoading: false,
    operationLabel: 'Updating...',
  },
  reducers: {
    toggleSidebar: (s) => { s.sidebarOpen = !s.sidebarOpen; },
    openModal: (s, a) => { s.activeModal = a.payload; },
    closeModal: (s) => { s.activeModal = null; },
    setTheme: (s, a) => { s.theme = a.payload; },
    toggleTheme: (s) => { s.theme = s.theme === 'dark' ? 'light' : 'dark'; },
    startOperation: (s, a) => {
      s.operationLoading = true;
      s.operationLabel = a.payload || 'Updating...';
    },
    endOperation: (s) => {
      s.operationLoading = false;
      s.operationLabel = 'Updating...';
    },
  },
});

export const { toggleSidebar, openModal, closeModal, setTheme, toggleTheme, startOperation, endOperation } = uiSlice.actions;
export default uiSlice.reducer;
