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
  (response) => response,
  (error) => {
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