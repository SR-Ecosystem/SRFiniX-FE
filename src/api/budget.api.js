import api from './axiosInstance';
export const budgetAPI = {
  getCurrent: (params) => api.get('/budget/current', { params }),
  getWarnings: () => api.get('/budget/warnings'),
};