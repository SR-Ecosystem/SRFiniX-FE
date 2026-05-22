import api from './axiosInstance';
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  completeOnboarding: (data) => api.post('/users/onboarding', data),
  getFinancialScore: () => api.get('/users/financial-score'),
  updatePreferences: (data) => api.put('/users/preferences', data),
};