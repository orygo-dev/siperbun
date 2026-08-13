import { api, type ApiResponse } from '../lib/api';

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Region = {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  parent?: { id: string; name: string; code: string } | null;
};

export const regionsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<Region[]>>('/regions', { params }),
  tree: () => api.get<ApiResponse<Region[]>>('/regions/tree'),
  get: (id: string) => api.get<ApiResponse<Region>>(`/regions/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Region>>('/regions', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Region>>(`/regions/${id}`, data),
  remove: (id: string) => api.delete<ApiResponse<{ id: string }>>(`/regions/${id}`),
};
