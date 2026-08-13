import { api, type ApiResponse } from '../lib/api';

export type CirculationFinding = {
  id: string;
  category: string;
  description: string;
  severity: string;
  createdAt: string;
};

export type CirculationInspection = {
  id: string;
  inspectionNumber: string;
  inspectorName?: string | null;
  inspectedAt: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  businessName?: string | null;
  ownerName?: string | null;
  commodityName?: string | null;
  seedlingCount?: number | null;
  certificateNumber?: string | null;
  certificateStatus?: string | null;
  labelStatus?: string | null;
  actionTaken?: string | null;
  recommendation?: string | null;
  followUp?: string | null;
  findings?: CirculationFinding[];
  _count?: { findings: number };
};

export const circulationApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<CirculationInspection[]>>('/circulation-inspections', {
      params,
    }),
  get: (id: string) =>
    api.get<ApiResponse<CirculationInspection>>(
      `/circulation-inspections/${id}`,
    ),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<CirculationInspection>>(
      '/circulation-inspections',
      data,
    ),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<CirculationInspection>>(
      `/circulation-inspections/${id}`,
      data,
    ),
  remove: (id: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/circulation-inspections/${id}`),
  addFinding: (id: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<CirculationFinding>>(
      `/circulation-inspections/${id}/findings`,
      data,
    ),
};
