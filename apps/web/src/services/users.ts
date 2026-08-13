import { api, type ApiResponse } from '../lib/api';

export type Role = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
};

export type AppUser = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  isActive: boolean;
  regionId?: string | null;
  officeId?: string | null;
  producerId?: string | null;
  roles: Role[];
  region?: { id: string; name: string; code: string } | null;
  office?: { id: string; name: string } | null;
  lastLoginAt?: string | null;
};

export const usersApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<AppUser[]>>('/users', { params }),
  inspectors: () => api.get<ApiResponse<AppUser[]>>('/users/inspectors'),
  get: (id: string) => api.get<ApiResponse<AppUser>>(`/users/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<AppUser>>('/users', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<AppUser>>(`/users/${id}`, data),
  toggleActive: (id: string) =>
    api.post<ApiResponse<AppUser>>(`/users/${id}/toggle-active`),
  remove: (id: string) => api.delete<ApiResponse<{ id: string }>>(`/users/${id}`),
  roles: () => api.get<ApiResponse<Role[]>>('/roles'),
};
