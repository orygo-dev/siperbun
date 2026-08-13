import { api, type ApiResponse } from '../lib/api';

export type Variety = {
  id: string;
  commodityId: string;
  code: string;
  name: string;
  clone?: string | null;
  description?: string | null;
  isActive: boolean;
  commodity?: { id: string; name: string; code: string };
};

export const varietiesApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<Variety[]>>('/varieties', { params }),
  get: (id: string) => api.get<ApiResponse<Variety>>(`/varieties/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Variety>>('/varieties', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Variety>>(`/varieties/${id}`, data),
  remove: (id: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/varieties/${id}`),
};
