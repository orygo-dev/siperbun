import { api, type ApiResponse } from '../lib/api';

export type ProductionLog = {
  id: string;
  batchId: string;
  userId?: string | null;
  loggedAt: string;
  stage: string;
  activity: string;
  countChange?: number | null;
  condition?: string | null;
  notes?: string | null;
  user?: { id: string; name: string; email: string } | null;
};

export type ProductionBatch = {
  id: string;
  batchNumber: string;
  producerId: string;
  nurseryId?: string | null;
  seedSourceId?: string | null;
  commodityId: string;
  varietyId?: string | null;
  startedAt?: string | null;
  initialCount: number;
  grownCount: number;
  deadCount: number;
  rejectedCount: number;
  activeCount: number;
  readyCount: number;
  status: string;
  notes?: string | null;
  producer?: {
    id: string;
    businessName: string;
    registrationNumber: string;
  } | null;
  nursery?: { id: string; name: string } | null;
  seedSource?: { id: string; lotNumber: string } | null;
  commodity?: { id: string; name: string; code: string } | null;
  variety?: { id: string; name: string; code: string } | null;
  logs?: ProductionLog[];
};

export const productionApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<ProductionBatch[]>>('/production-batches', { params }),
  get: (id: string) =>
    api.get<ApiResponse<ProductionBatch>>(`/production-batches/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<ProductionBatch>>('/production-batches', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<ProductionBatch>>(`/production-batches/${id}`, data),
  remove: (id: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/production-batches/${id}`),
  addLog: (id: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<ProductionBatch>>(
      `/production-batches/${id}/logs`,
      data,
    ),
  changeStatus: (id: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<ProductionBatch>>(
      `/production-batches/${id}/change-status`,
      data,
    ),
};
