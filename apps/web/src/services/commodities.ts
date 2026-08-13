import { api, type ApiResponse } from '../lib/api';

export type Commodity = {
  id: string;
  code: string;
  name: string;
  scientificName?: string | null;
  unit: string;
  isActive: boolean;
  varietiesCount?: number;
};

export const commoditiesApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<Commodity[]>>('/commodities', { params }),
  get: (id: string) => api.get<ApiResponse<Commodity>>(`/commodities/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Commodity>>('/commodities', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Commodity>>(`/commodities/${id}`, data),
  remove: (id: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/commodities/${id}`),
};
