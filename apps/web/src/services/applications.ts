import { api, type ApiResponse } from '../lib/api';

export type ApplicationStatusHistory = {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  notes?: string | null;
  createdAt: string;
  changedBy?: { id: string; name: string; email: string } | null;
};

export type FieldAssignmentSummary = {
  id: string;
  assignmentNumber: string;
  scheduledDate: string;
  scheduledTime?: string | null;
  status: string;
  inspector?: { id: string; name: string; email: string } | null;
};

export type CertificationApplication = {
  id: string;
  applicationNumber: string;
  producerId: string;
  batchId?: string | null;
  commodityId: string;
  varietyId?: string | null;
  nurseryId?: string | null;
  seedlingCount: number;
  submittedAt?: string | null;
  readyAt?: string | null;
  inspectionType?: string | null;
  status: string;
  notes?: string | null;
  producer?: {
    id: string;
    businessName: string;
    registrationNumber: string;
  } | null;
  commodity?: { id: string; name: string; code: string } | null;
  variety?: { id: string; name: string; code: string } | null;
  nursery?: { id: string; name: string } | null;
  batch?: {
    id: string;
    batchNumber: string;
    status: string;
    activeCount?: number;
  } | null;
  statusHistory?: ApplicationStatusHistory[];
  assignments?: FieldAssignmentSummary[];
  certificate?: {
    id: string;
    certificateNumber: string;
    status: string;
  } | null;
};

export const applicationsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<CertificationApplication[]>>(
      '/certification-applications',
      { params },
    ),
  get: (id: string) =>
    api.get<ApiResponse<CertificationApplication>>(
      `/certification-applications/${id}`,
    ),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<CertificationApplication>>(
      '/certification-applications',
      data,
    ),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<CertificationApplication>>(
      `/certification-applications/${id}`,
      data,
    ),
  submit: (id: string, data?: Record<string, unknown>) =>
    api.post<ApiResponse<CertificationApplication>>(
      `/certification-applications/${id}/submit`,
      data ?? {},
    ),
  verify: (id: string, data?: Record<string, unknown>) =>
    api.post<ApiResponse<CertificationApplication>>(
      `/certification-applications/${id}/verify`,
      data ?? {},
    ),
  requestRevision: (id: string, data?: Record<string, unknown>) =>
    api.post<ApiResponse<CertificationApplication>>(
      `/certification-applications/${id}/request-revision`,
      data ?? {},
    ),
  assignInspector: (id: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<CertificationApplication>>(
      `/certification-applications/${id}/assign-inspector`,
      data,
    ),
  changeStatus: (id: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<CertificationApplication>>(
      `/certification-applications/${id}/change-status`,
      data,
    ),
};
