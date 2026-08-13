import { api, type ApiResponse } from '../lib/api';

export type SeedDistribution = {
  id: string;
  producerId: string;
  certificateId?: string | null;
  batchId?: string | null;
  buyerName: string;
  buyerAddress?: string | null;
  destinationKab?: string | null;
  quantity: number;
  distributedAt: string;
  deliveryNoteNo?: string | null;
  notes?: string | null;
  producer?: { id: string; businessName: string; registrationNumber?: string | null };
  certificate?: { id: string; certificateNumber: string; status: string } | null;
  batch?: { id: string; batchNumber: string; status: string } | null;
};

export const seedDistributionsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<SeedDistribution[]>>('/seed-distributions', { params }),
  get: (id: string) =>
    api.get<ApiResponse<SeedDistribution>>(`/seed-distributions/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<SeedDistribution>>('/seed-distributions', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<SeedDistribution>>(`/seed-distributions/${id}`, data),
  remove: (id: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/seed-distributions/${id}`),
};
