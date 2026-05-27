import api from './axiosInstance';
export const strategyAPI = {
  getPredefined: () => api.get('/strategies/predefined'),
  getTemplates: () => api.get('/strategies/templates'),
  getActive: (params) => api.get('/strategies/active', { params }),
  getHistory: () => api.get('/strategies/history'),
  create: (data) => api.post('/strategies', data),
  createTemplate: (data) => api.post('/strategies/templates', data),
  deleteTemplate: (id) => api.delete(`/strategies/templates/${id}`),
  update: (id, data) => api.put(`/strategies/${id}`, data),
  transferToEmergency: (data) => api.post('/strategies/transfer-emergency', data),
  transferCurrentRemaining: (data) => api.post('/strategies/transfer-current-remaining', data),
  approveEmergencyRollover: (data) => api.post('/strategies/approve-emergency-rollover', data),
};
