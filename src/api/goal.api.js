import api from './axiosInstance';
export const goalAPI = {
  create: (data) => api.post('/goals', data),
  getAll: (params) => api.get('/goals', { params }),
  getOne: (id) => api.get(`/goals/${id}`),
  update: (id, data) => api.put(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`),
  contribute: (id, data) => api.post(`/goals/${id}/contribute`, data),
};