import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('erp_token') || sessionStorage.getItem('erp_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear storage and reload to trigger login redirect
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
      sessionStorage.removeItem('erp_token');
      sessionStorage.removeItem('erp_user');
      
      // We don't want to infinite loop on the login page itself
      if (window.location.hash !== '#/login') {
        window.location.href = '/#/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
