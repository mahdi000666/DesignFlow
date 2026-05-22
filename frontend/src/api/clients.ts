import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// All API requests go through this instance.
// baseURL comes from .env so it works in both dev (:8000) and production.
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// REQUEST interceptor — attach the stored access token to every outgoing request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// RESPONSE interceptor — on a 401, attempt one silent token refresh before failing.
// This means the user only gets logged out when the refresh token itself expires (7 days).
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const refresh = localStorage.getItem('refresh_token');
    const isRefreshRequest = original?.url?.includes('/auth/token/refresh/');

    // _retry flag prevents an infinite loop if the refresh call itself returns 401
    if (error.response?.status === 401 && original && !original._retry && !isRefreshRequest && refresh) {
      original._retry = true;

      try {
        const { data } = await apiClient.post('/auth/token/refresh/', { refresh });
        localStorage.setItem('access_token', data.access);
        // SimpleJWT can rotate refresh tokens; keep storage aligned with the backend response.
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
        original.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(original); // retry the original request with the new token
      } catch {
        // Refresh also failed — clear storage so the app redirects to /login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
    if (error.response?.status === 401 && (!refresh || isRefreshRequest)) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
