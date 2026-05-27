import api from './axiosInstance';

const uploadConfig = (data) => (
  data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
);

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data, uploadConfig(data)),
  completeOnboarding: (data) => api.post('/users/onboarding', data),
  getFinancialScore: (params) => api.get('/users/financial-score', { params }),
  updatePreferences: (data) => api.put('/users/preferences', data),
};
