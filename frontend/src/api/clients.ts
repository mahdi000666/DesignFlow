import axios from 'axios';

// All API requests go through this instance.
// baseURL comes from .env so it works in both dev (:8000) and production.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
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

    // _retry flag prevents an infinite loop if the refresh call itself returns 401
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await apiClient.post('/auth/token/refresh/', { refresh });
        localStorage.setItem('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(original); // retry the original request with the new token
      } catch {
        // Refresh also failed — clear storage so the app redirects to /login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;