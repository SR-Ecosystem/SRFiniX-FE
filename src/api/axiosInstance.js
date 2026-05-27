import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const DEPLOYED_API_URL = 'https://sr-finix.onrender.com/api';
const API_BASE_URL = import.meta.env.VITE_API_URL || (Capacitor.isNativePlatform() ? DEPLOYED_API_URL : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

const CACHE_PREFIX = 'srfinix.apiCache.';
const QUEUE_KEY = 'srfinix.offlineQueue';
const STATUS_KEY = 'srfinix.connectionStatus';

const readJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || ''); } catch { return fallback; }
};

const writeJson = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

const emitOfflineEvent = (detail) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('srfinix:offline-sync', { detail }));
  }
};

const markOffline = () => {
  try { localStorage.setItem(STATUS_KEY, 'offline'); } catch {}
  emitOfflineEvent({ type: 'offline-cache' });
};

const markOnline = () => {
  try {
    if (localStorage.getItem(STATUS_KEY) === 'offline') {
      localStorage.setItem(STATUS_KEY, 'online');
      emitOfflineEvent({ type: 'online' });
    }
  } catch {}
};

const normalizeUrl = (config = {}) => {
  const url = config.url || '';
  return url.startsWith('http') ? new URL(url).pathname.replace('/api', '') : url;
};

const cacheKeyFor = (config = {}) => {
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${CACHE_PREFIX}${String(config.method || 'get').toUpperCase()}:${normalizeUrl(config)}:${params}`;
};

const isNetworkOfflineError = (error) => (
  !navigator.onLine ||
  error.code === 'ERR_NETWORK' ||
  error.message === 'Network Error' ||
  error.message?.toLowerCase?.().includes('network')
);

const getQueue = () => readJson(QUEUE_KEY, []);
const setQueue = (queue) => writeJson(QUEUE_KEY, queue);

export const getOfflineQueueCount = () => getQueue().length;

const serializeData = (data) => {
  if (data instanceof FormData) {
    const object = {};
    data.forEach((value, key) => {
      if (value instanceof File || value instanceof Blob) return;
      object[key] = value;
    });
    return { kind: 'form', value: object };
  }
  return { kind: 'json', value: data || {} };
};

const restoreData = (item) => {
  if (item.data?.kind === 'form') {
    const form = new FormData();
    Object.entries(item.data.value || {}).forEach(([key, value]) => form.append(key, value ?? ''));
    return form;
  }
  return item.data?.value;
};

const getPeriodFromDate = (dateValue) => {
  const date = dateValue ? new Date(dateValue) : new Date();
  return { month: date.getMonth() + 1, year: date.getFullYear() };
};

const makeLocalId = () => `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const numberValue = (value) => {
  const next = Number(String(value ?? '0').replace(/,/g, ''));
  return Number.isFinite(next) ? next : 0;
};

const makeOfflineData = (config) => {
  const method = String(config.method || 'get').toLowerCase();
  const url = normalizeUrl(config);
  const serialized = serializeData(config.data);
  const body = serialized.value || {};
  const id = makeLocalId();
  const period = getPeriodFromDate(body.date);

  if (method === 'post' && url === '/income') {
    const income = { ...body, ...period, _id: id, amount: numberValue(body.amount), offlinePending: true, createdAt: new Date().toISOString() };
    return { success: true, offline: true, queued: true, income };
  }

  if (method === 'post' && url === '/expenses') {
    const expense = { ...body, ...period, _id: id, amount: numberValue(body.amount), offlinePending: true, createdAt: new Date().toISOString() };
    return { success: true, offline: true, queued: true, expense };
  }

  if (method === 'post' && url === '/goals') {
    const goal = { ...body, _id: id, currentAmount: 0, isCompleted: false, offlinePending: true, createdAt: new Date().toISOString() };
    return { success: true, offline: true, queued: true, goal };
  }

  if (method === 'post' && url === '/strategies') {
    const now = new Date();
    const strategy = {
      ...body,
      _id: id,
      month: Number(body.month) || now.getMonth() + 1,
      year: Number(body.year) || now.getFullYear(),
      isActive: true,
      offlinePending: true,
    };
    return { success: true, offline: true, queued: true, strategy };
  }

  if (method === 'post' && url === '/strategies/templates') {
    const template = { ...body, _id: id, offlinePending: true, createdAt: new Date().toISOString() };
    return { success: true, offline: true, queued: true, template };
  }

  if (method === 'delete') {
    return { success: true, offline: true, queued: true };
  }

  return { success: true, offline: true, queued: true };
};

const enqueueRequest = (config) => {
  const queue = getQueue();
  const item = {
    id: makeLocalId(),
    method: config.method,
    url: normalizeUrl(config),
    params: config.params || null,
    data: serializeData(config.data),
    headers: { 'Content-Type': config.headers?.['Content-Type'] || config.headers?.['content-type'] },
    createdAt: new Date().toISOString(),
  };
  queue.push(item);
  setQueue(queue);
  emitOfflineEvent({ type: 'queued', count: queue.length });
  return item;
};

const shouldQueue = (config = {}) => {
  const method = String(config.method || 'get').toLowerCase();
  if (method === 'get' || config._replaying) return false;
  const url = normalizeUrl(config);
  if (url.includes('/auth/')) return false;
  return true;
};

const itemBody = (item) => item.data?.value || {};

const itemPeriod = (item) => {
  const body = itemBody(item);
  if (body.month && body.year) return { month: Number(body.month), year: Number(body.year) };
  return getPeriodFromDate(body.date);
};

const periodMatches = (params = {}, item) => {
  if (!params?.month && !params?.year) return true;
  const period = itemPeriod(item);
  return (!params.month || Number(params.month) === period.month) && (!params.year || Number(params.year) === period.year);
};

const pendingIncomeFrom = (item) => {
  const body = itemBody(item);
  return {
    ...body,
    ...itemPeriod(item),
    _id: `pending-${item.id}`,
    amount: numberValue(body.amount),
    offlinePending: true,
    createdAt: item.createdAt,
  };
};

const pendingExpenseFrom = (item) => {
  const body = itemBody(item);
  return {
    ...body,
    ...itemPeriod(item),
    _id: `pending-${item.id}`,
    amount: numberValue(body.amount),
    offlinePending: true,
    createdAt: item.createdAt,
  };
};

const pendingGoalFrom = (item) => {
  const body = itemBody(item);
  return {
    ...body,
    _id: `pending-${item.id}`,
    currentAmount: numberValue(body.currentAmount),
    offlinePending: true,
    createdAt: item.createdAt,
  };
};

const mergePendingQueue = (config = {}, data) => {
  const method = String(config.method || 'get').toLowerCase();
  if (method !== 'get' || !data) return data;

  const url = normalizeUrl(config);
  const queue = getQueue();
  if (queue.length === 0) return data;

  if (url === '/income' && Array.isArray(data.incomes)) {
    const pending = queue
      .filter((item) => String(item.method || '').toLowerCase() === 'post' && item.url === '/income' && periodMatches(config.params, item))
      .map(pendingIncomeFrom);
    if (!pending.length) return data;
    return {
      ...data,
      incomes: [...pending, ...data.incomes.filter((income) => !pending.some((item) => item._id === income._id))],
      total: Number(data.total || 0) + pending.reduce((sum, item) => sum + numberValue(item.amount), 0),
    };
  }

  if (url === '/expenses' && Array.isArray(data.expenses)) {
    const pending = queue
      .filter((item) => String(item.method || '').toLowerCase() === 'post' && item.url === '/expenses' && periodMatches(config.params, item))
      .map(pendingExpenseFrom);
    if (!pending.length) return data;
    return {
      ...data,
      expenses: [...pending, ...data.expenses.filter((expense) => !pending.some((item) => item._id === expense._id))],
      total: Number(data.total || 0) + pending.reduce((sum, item) => sum + numberValue(item.amount), 0),
    };
  }

  if (url === '/goals' && Array.isArray(data.goals)) {
    const pending = queue
      .filter((item) => String(item.method || '').toLowerCase() === 'post' && item.url === '/goals')
      .map(pendingGoalFrom);
    if (!pending.length) return data;
    return {
      ...data,
      goals: [...pending, ...data.goals.filter((goal) => !pending.some((item) => item._id === goal._id))],
    };
  }

  return data;
};

export const syncOfflineQueue = async () => {
  if (!navigator.onLine) return { synced: 0, remaining: getQueue().length };
  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  emitOfflineEvent({ type: 'syncing', count: queue.length });
  const remaining = [];
  let synced = 0;

  for (const item of queue) {
    try {
      await api.request({
        method: item.method,
        url: item.url,
        params: item.params,
        data: restoreData(item),
        headers: item.data?.kind === 'form' ? {} : (item.headers || {}),
        _replaying: true,
      });
      synced += 1;
    } catch {
      remaining.push(item);
    }
  }

  setQueue(remaining);
  if (remaining.length > 0) markOffline();
  emitOfflineEvent({ type: 'synced', synced, remaining: remaining.length });
  return { synced, remaining: remaining.length };
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    markOnline();
    response.data = mergePendingQueue(response.config, response.data);
    if (String(response.config?.method || 'get').toLowerCase() === 'get') {
      writeJson(cacheKeyFor(response.config), {
        data: response.data,
        cachedAt: new Date().toISOString(),
      });
    }
    return response;
  },
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        return Promise.reject(error);
      }
    }

    if (original && isNetworkOfflineError(error)) {
      const method = String(original.method || 'get').toLowerCase();
      markOffline();
      if (method === 'get') {
        const cached = readJson(cacheKeyFor(original), null);
        if (cached?.data) {
          const mergedData = mergePendingQueue(original, cached.data);
          return {
            data: mergedData,
            status: 200,
            statusText: 'Offline Cache',
            headers: {},
            config: original,
            request: error.request,
            offlineCache: true,
          };
        }
      }

      if (shouldQueue(original)) {
        enqueueRequest(original);
        return {
          data: makeOfflineData(original),
          status: 202,
          statusText: 'Queued Offline',
          headers: {},
          config: original,
          request: error.request,
        };
      }
    }
    return Promise.reject(error);
  }
);

export default api;
