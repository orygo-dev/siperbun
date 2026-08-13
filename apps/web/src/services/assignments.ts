import { api, type ApiResponse } from '../lib/api';

export type FieldAssignment = {
  id: string;
  assignmentNumber: string;
  applicationId: string;
  inspectorId: string;
  scheduledDate: string;
  scheduledTime?: string | null;
  locationNotes?: string | null;
  instructions?: string | null;
  status: string;
  completedAt?: string | null;
  application?: {
    id: string;
    applicationNumber: string;
    status: string;
    seedlingCount?: number;
    producer?: {
      id: string;
      businessName: string;
      registrationNumber: string;
    } | null;
    commodity?: { id: string; name: string; code: string } | null;
    variety?: { id: string; name: string; code: string } | null;
    nursery?: { id: string; name: string } | null;
  } | null;
  inspector?: { id: string; name: string; email: string } | null;
  inspection?: {
    id: string;
    isFinalized: boolean;
    startedAt?: string | null;
    finishedAt?: string | null;
    conclusion?: string | null;
  } | null;
};

export const assignmentsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<FieldAssignment[]>>('/field-assignments', { params }),
  get: (id: string) =>
    api.get<ApiResponse<FieldAssignment>>(`/field-assignments/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<FieldAssignment>>(`/field-assignments/${id}`, data),
  confirm: (id: string) =>
    api.post<ApiResponse<FieldAssignment>>(
      `/field-assignments/${id}/confirm`,
      {},
    ),
  startInspection: (id: string, data?: Record<string, unknown>) =>
    api.post<ApiResponse<FieldAssignment>>(
      `/field-assignments/${id}/start-inspection`,
      data ?? {},
    ),
};
