import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('textil_user') || 'null'),
  token: localStorage.getItem('textil_token') || null,
  isAuthenticated: !!localStorage.getItem('textil_token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user } = response.data;

      localStorage.setItem('textil_token', access_token);
      localStorage.setItem('textil_user', JSON.stringify(user));

      set({
        token: access_token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true, user };
    } catch (err) {
      const message =
        err.response?.data?.detail || 'Error al iniciar sesión. Compruebe sus credenciales.';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  logout: () => {
    localStorage.removeItem('textil_token');
    localStorage.removeItem('textil_user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  fetchCurrentUser: async () => {
    if (!get().token) return;
    try {
      const response = await api.get('/auth/me');
      const user = response.data;
      localStorage.setItem('textil_user', JSON.stringify(user));
      set({ user });
    } catch (err) {
      get().logout();
    }
  },

  hasRole: (allowedRoles) => {
    const { user } = get();
    if (!user) return false;
    if (user.rol === 'superusuario') return true;
    return allowedRoles.includes(user.rol);
  },
}));
