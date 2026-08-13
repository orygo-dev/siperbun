import { api, type ApiResponse } from '../lib/api';

export type Nursery = {
  id: string;
  producerId: string;
  commodityId?: string | null;
  regionId?: string | null;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  areaHa?: number | null;
  capacity?: number | null;
  waterSource?: string | null;
  facilities?: string | null;
  status: string;
  notes?: string | null;
  producer?: {
    id: string;
    businessName: string;
    registrationNumber: string;
  } | null;
  commodity?: { id: string; name: string; code: string } | null;
  region?: { id: string; name: string; code: string } | null;
};

export const nurseriesApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<Nursery[]>>('/nursery-locations', { params }),
  get: (id: string) =>
    api.get<ApiResponse<Nursery>>(`/nursery-locations/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Nursery>>('/nursery-locations', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Nursery>>(`/nursery-locations/${id}`, data),
  remove: (id: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/nursery-locations/${id}`),
};
