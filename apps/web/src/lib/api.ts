import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

export function resolveApiV1(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://localhost:3111/api/v1';
  return '/api/v1';
}

export function resolveApiOrigin(): string {
  return resolveApiV1().replace(/\/api\/v1\/?$/, '');
}

const API_URL = resolveApiV1();

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      if (original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = api
            .post('/auth/refresh')
            .then((r) => {
              const token = r.data.data.accessToken as string;
              useAuthStore.getState().setAccessToken(token);
              if (r.data.data.user) {
                useAuthStore.getState().setUser(r.data.data.user);
              }
              return token;
            })
            .catch(() => {
              useAuthStore.getState().logout();
              return null;
            })
            .finally(() => {
              refreshing = null;
            });
        }
        const token = await refreshing;
        if (!token) return Promise.reject(error);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  },
);

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
};
