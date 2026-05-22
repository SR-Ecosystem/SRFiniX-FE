import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: true, activeModal: null, theme: 'dark' },
  reducers: {
    toggleSidebar: (s) => { s.sidebarOpen = !s.sidebarOpen; },
    openModal: (s, a) => { s.activeModal = a.payload; },
    closeModal: (s) => { s.activeModal = null; },
    setTheme: (s, a) => { s.theme = a.payload; },
  },
});

export const { toggleSidebar, openModal, closeModal, setTheme } = uiSlice.actions;
export default uiSlice.reducer;