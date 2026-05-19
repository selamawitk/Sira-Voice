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
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // 🌐 LOW-DATA OFFLINE CACHING MANAGER
    // Intercept successful GET operations on primary payload views
    const cacheableEndpoints = [
      '/users/profile',
      '/contracts/worker/history',
      '/jobs/nearby',
      '/worker/profile'
    ];

    const matchesTarget = cacheableEndpoints.some((endpoint) => 
      response.config.url?.includes(endpoint)
    );

    if (response.config.method === 'get' && matchesTarget) {
      const cacheKey = `sira_cache_${response.config.url}`;
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: response.data,
          timestamp: Date.now()
        }));
      } catch (storageError) {
        console.warn('Local storage write limit reached. Caching bypassed.', storageError);
      }
    }

    return response;
  },
  (error) => {
    const originalRequest = error.config;

    // Detect if a network drop, timeout, or server failure has occurred
    const isOfflineOrNetworkFailure = 
      !error.response || 
      error.code === 'ECONNABORTED' || 
      error.response.status >= 500;

    // Fallback gracefully to Localized Cache if offline
    if (isOfflineOrNetworkFailure && originalRequest && originalRequest.method === 'get') {
      const cacheKey = `sira_cache_${originalRequest.url}`;
      const cachedString = localStorage.getItem(cacheKey);

      if (cachedString) {
        try {
          const cachePackage = JSON.parse(cachedString);
          console.warn(`🎯 serving offline fallback data cache payload for query: ${originalRequest.url}`);

          // Decorate payload markers to optionally alert the UI layers of offline state fallback
          if (cachePackage.data && typeof cachePackage.data === 'object') {
            cachePackage.data._isOfflineCachedFallback = true;
            cachePackage.data._cachedAt = cachePackage.timestamp;
          }

          // Force resolve response seamlessly down to the waiting view components
          return Promise.resolve({
            ...error,
            status: 200,
            statusText: 'OK (Offline Cache Fallback)',
            headers: originalRequest.headers,
            config: originalRequest,
            data: cachePackage.data
          });
        } catch (parseError) {
          console.error('Local backup string verification failed processing payload.', parseError);
        }
      }
    }

    // Retain original core edge logic parameters
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out');
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');

      delete api.defaults.headers.common.Authorization;

      const isVoiceActive =
        sessionStorage.getItem('sira_voice_active') === 'true';

      if (isVoiceActive) {
        window.dispatchEvent(
          new CustomEvent('auth_expired_during_voice')
        );
      } else {
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;