import axios from 'axios';

// A URL da API vem de uma variável de ambiente do build (VITE_API_URL).
// Em desenvolvimento, cai no localhost. Em produção (Vercel), defina
// VITE_API_URL com a URL pública do backend no Render.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

// Injeta o token JWT em todas as requisições.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Se o token expirar/for inválido (401), limpa a sessão e volta ao login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('login');
      localStorage.removeItem('name');
      localStorage.removeItem('role');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
