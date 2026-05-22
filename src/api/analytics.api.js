import api from './axiosInstance';
export const analyticsAPI = {
  getOverview: (params) => api.get('/analytics/overview', { params }),
  getDaily: (params) => api.get('/analytics/daily', { params }),
  getMonthly: (params) => api.get('/analytics/monthly', { params }),
  getWeekly: () => api.get('/analytics/weekly'),
  getInsights: () => api.get('/analytics/insights'),
  getTrends: () => api.get('/analytics/trends'),
};
