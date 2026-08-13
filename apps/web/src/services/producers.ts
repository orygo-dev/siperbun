import { api, type ApiResponse } from '../lib/api';

export type Producer = {
  id: string;
  registrationNumber: string;
  businessName: string;
  businessType?: string | null;
  ownerName: string;
  nik?: string | null;
  nib?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  kabupatenId?: string | null;
  kecamatan?: string | null;
  desa?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  productionCapacity?: number | null;
  status: string;
  isActive: boolean;
  notes?: string | null;
  verifiedAt?: string | null;
  kabupaten?: { id: string; name: string; code: string } | null;
  nurseries?: Array<{
    id: string;
    name: string;
    status: string;
    capacity?: number | null;
    areaHa?: number | null;
  }>;
  seedGardens?: Array<{
    id: string;
    name: string;
    status: string;
    areaHa?: number | null;
  }>;
};

export const producersApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<Producer[]>>('/producers', { params }),
  get: (id: string) => api.get<ApiResponse<Producer>>(`/producers/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Producer>>('/producers', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Producer>>(`/producers/${id}`, data),
  remove: (id: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/producers/${id}`),
  verify: (id: string) =>
    api.post<ApiResponse<Producer>>(`/producers/${id}/verify`),
  activate: (id: string) =>
    api.post<ApiResponse<Producer>>(`/producers/${id}/activate`),
  deactivate: (id: string) =>
    api.post<ApiResponse<Producer>>(`/producers/${id}/deactivate`),
};
