import { api, type ApiResponse } from '../lib/api';

export type SeedGarden = {
  id: string;
  producerId?: string | null;
  commodityId: string;
  varietyId?: string | null;
  regionId?: string | null;
  name: string;
  ownerName?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  areaHa?: number | null;
  clone?: string | null;
  plantingYear?: number | null;
  motherTreeCount?: number | null;
  estimatedYield?: number | null;
  decreeNumber?: string | null;
  decreeDate?: string | null;
  validUntil?: string | null;
  status: string;
  producer?: {
    id: string;
    businessName: string;
    registrationNumber: string;
  } | null;
  commodity?: { id: string; name: string; code: string } | null;
  variety?: { id: string; name: string; code: string } | null;
  region?: { id: string; name: string; code: string } | null;
};

export const seedGardensApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<SeedGarden[]>>('/seed-gardens', { params }),
  get: (id: string) => api.get<ApiResponse<SeedGarden>>(`/seed-gardens/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<SeedGarden>>('/seed-gardens', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<SeedGarden>>(`/seed-gardens/${id}`, data),
  remove: (id: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/seed-gardens/${id}`),
};
