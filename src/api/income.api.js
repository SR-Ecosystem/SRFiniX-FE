import api from './axiosInstance';
export const incomeAPI = {
  add: (data) => api.post('/income', data),
  getAll: (params) => api.get('/income', { params }),
  getHistory: () => api.get('/income/history'),
  update: (id, data) => api.put(`/income/${id}`, data),
  delete: (id) => api.delete(`/income/${id}`),
};