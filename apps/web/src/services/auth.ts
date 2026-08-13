import { api, type ApiResponse } from '../lib/api';
import type { AuthUser } from '../stores/authStore';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<{ accessToken: string; user: AuthUser }>>('/auth/login', {
      email,
      password,
    }),
  me: () => api.get<ApiResponse<AuthUser>>('/auth/me'),
  updateProfile: (data: { name: string; phone?: string | null }) =>
    api.patch<ApiResponse<AuthUser>>('/auth/profile', data),
  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => api.post<ApiResponse<{ ok: boolean }>>('/auth/change-password', data),
  refresh: () =>
    api.post<ApiResponse<{ accessToken: string; user: AuthUser }>>('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
};
