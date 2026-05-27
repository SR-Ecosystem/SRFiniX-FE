import api from './axiosInstance';

const uploadConfig = (data) => (
  data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
);

export const expenseAPI = {
  add: (data) => api.post('/expenses', data, uploadConfig(data)),
  getAll: (params) => api.get('/expenses', { params }),
  getOne: (id) => api.get(`/expenses/${id}`),
  update: (id, data) => api.put(`/expenses/${id}`, data, uploadConfig(data)),
  delete: (id) => api.delete(`/expenses/${id}`),
  getByCategory: (params) => api.get('/expenses/categories', { params }),
};
