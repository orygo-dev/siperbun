import { api, type ApiResponse } from '../lib/api';

export type SeedLabel = {
  id: string;
  certificateId: string;
  serialStart: string;
  serialEnd: string;
  quantity: number;
  receivedAt?: string | null;
  handedOverAt?: string | null;
  recipient?: string | null;
  usedCount: number;
  damagedCount: number;
  cancelledCount: number;
  remainingCount: number;
  notes?: string | null;
  createdAt: string;
  certificate?: {
    id: string;
    certificateNumber: string;
    status: string;
    producer?: { id: string; businessName: string } | null;
  } | null;
  distributions?: Array<{
    id: string;
    quantity: number;
    notes?: string | null;
    createdAt: string;
    producer?: { id: string; businessName: string } | null;
  }>;
  _count?: { distributions: number };
};

export const seedLabelsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<SeedLabel[]>>('/seed-labels', { params }),
  get: (id: string) => api.get<ApiResponse<SeedLabel>>(`/seed-labels/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<SeedLabel>>('/seed-labels', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<SeedLabel>>(`/seed-labels/${id}`, data),
  remove: (id: string) => api.delete<ApiResponse<{ id: string }>>(`/seed-labels/${id}`),
  addDistribution: (id: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<unknown>>(`/seed-labels/${id}/distributions`, data),
};
