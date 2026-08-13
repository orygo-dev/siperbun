import { api, type ApiResponse } from '../lib/api';

export type SeedSource = {
  id: string;
  producerId: string;
  seedGardenId?: string | null;
  commodityId: string;
  varietyId?: string | null;
  lotNumber: string;
  receivedAt?: string | null;
  quantity: number;
  unit: string;
  supplier?: string | null;
  originDocumentNumber?: string | null;
  sourceCertificateNo?: string | null;
  usedQuantity: number;
  remainingStock: number;
  verificationStatus: string;
  notes?: string | null;
  producer?: {
    id: string;
    businessName: string;
    registrationNumber: string;
  } | null;
  seedGarden?: { id: string; name: string } | null;
  commodity?: { id: string; name: string; code: string } | null;
  variety?: { id: string; name: string; code: string } | null;
};

export const seedSourcesApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<SeedSource[]>>('/seed-sources', { params }),
  get: (id: string) =>
    api.get<ApiResponse<SeedSource>>(`/seed-sources/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<SeedSource>>('/seed-sources', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<SeedSource>>(`/seed-sources/${id}`, data),
  remove: (id: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/seed-sources/${id}`),
  verify: (id: string) =>
    api.post<ApiResponse<SeedSource>>(`/seed-sources/${id}/verify`),
};
