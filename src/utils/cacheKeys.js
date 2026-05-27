export const periodKey = (period = {}) => `${period.year || ''}-${period.month || ''}`;

export const queryKey = (params = {}) => JSON.stringify(params || {});

export const shouldFetchKey = (currentKey, nextKey) => currentKey !== nextKey;
