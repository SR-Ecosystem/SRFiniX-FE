import api from './axiosInstance';
export const strategyAPI = {
  getPredefined: () => api.get('/strategies/predefined'),
  getActive: (params) => api.get('/strategies/active', { params }),
  getHistory: () => api.get('/strategies/history'),
  create: (data) => api.post('/strategies', data),
  update: (id, data) => api.put(`/strategies/${id}`, data),
  transferToEmergency: (data) => api.post('/strategies/transfer-emergency', data),
};
