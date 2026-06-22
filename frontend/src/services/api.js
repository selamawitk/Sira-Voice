import axios from 'axios';

const getBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  url = url.trim();
  url = url.replace(/\/$/, '');
  url = url.replace(/\/api$/, '');

  return `${url}/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getCleanCacheKey = (url) => {
  if (!url) return '';
  const path = url.replace(/^.*\/\/.*?\//, '/');
  return `sira_cache_${path}`;
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const cacheableEndpoints = [
      '/users/profile',
      '/contracts/worker/history',
      '/jobs/nearby',
      '/worker/profile',
      '/ratings',
      '/notifications',
    ];

    const matchesTarget = cacheableEndpoints.some((endpoint) =>
      response.config.url?.includes(endpoint)
    );

    if (response.config.method === 'get' && matchesTarget) {
      const cacheKey = getCleanCacheKey(response.config.url);
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: response.data,
            timestamp: Date.now(),
          })
        );
      } catch  {
        // Fallback silently
      }
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest || originalRequest._retryCount === undefined) {
      if (originalRequest) originalRequest._retryCount = 0;
    }

    const isRetryable =
      originalRequest &&
      originalRequest.method === 'get' &&
      originalRequest._retryCount < 2 &&
      (!error.response || error.code === 'ECONNABORTED' || error.response.status >= 500);

    if (isRetryable) {
      originalRequest._retryCount += 1;
      const delay = Math.min(1000 * Math.pow(2, originalRequest._retryCount), 4000);
      await new Promise((r) => setTimeout(r, delay));
      return api(originalRequest);
    }

    const isOfflineOrNetworkFailure =
      !error.response ||
      error.code === 'ECONNABORTED' ||
      error.response.status >= 500;

    if (isOfflineOrNetworkFailure && originalRequest && originalRequest.method === 'get') {
      const cacheKey = getCleanCacheKey(originalRequest.url);
      const cachedString = localStorage.getItem(cacheKey);

      if (cachedString) {
        try {
          const cachePackage = JSON.parse(cachedString);

          if (cachePackage.data && typeof cachePackage.data === 'object') {
            cachePackage.data._isOfflineCachedFallback = true;
            cachePackage.data._cachedAt = cachePackage.timestamp;
          }

          return Promise.resolve({
            ...error,
            status: 200,
            statusText: 'OK (Offline Cache Fallback)',
            headers: originalRequest.headers,
            config: originalRequest,
            data: cachePackage.data,
          });
        } catch  {
          // Fallback silently
        }
      }
    }

    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/me') ||
      originalRequest?.url?.includes('/chat/conversations');

    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
      delete api.defaults.headers.common.Authorization;

      const isVoiceActive = sessionStorage.getItem('sira_voice_active') === 'true';

      if (isVoiceActive) {
        window.dispatchEvent(new CustomEvent('auth_expired_during_voice'));
      } else {
        window.dispatchEvent(new Event('auth_logout'));
      }
    }

    return Promise.reject(error);
  }
);

export default api;