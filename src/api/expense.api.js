import api from './axiosInstance';
export const expenseAPI = {
  add: (data) => api.post('/expenses', data),
  getAll: (params) => api.get('/expenses', { params }),
  getOne: (id) => api.get(`/expenses/${id}`),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  getByCategory: (params) => api.get('/expenses/categories', { params }),
};