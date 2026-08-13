import { api, type ApiResponse } from '../lib/api';

export type CorrectiveAction = {
  id: string;
  description: string;
  evidenceNotes?: string | null;
  status: string;
  verifiedAt?: string | null;
  createdAt: string;
  file?: {
    id: string;
    originalName: string;
    mimeType: string;
    url: string;
  } | null;
};

export type InspectionFinding = {
  id: string;
  applicationId?: string | null;
  inspectionId?: string | null;
  findingType: string;
  description: string;
  severity: string;
  recommendation?: string | null;
  dueDate?: string | null;
  status: string;
  createdAt: string;
  application?: {
    id: string;
    applicationNumber: string;
    status: string;
    producer?: { id: string; businessName: string } | null;
  } | null;
  inspection?: {
    id: string;
    assignmentId: string;
    isFinalized: boolean;
  } | null;
  correctiveActions?: CorrectiveAction[];
};

export const findingsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<InspectionFinding[]>>('/findings', { params }),
  get: (id: string) =>
    api.get<ApiResponse<InspectionFinding>>(`/findings/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<InspectionFinding>>(`/findings/${id}`, data),
  addCorrectiveAction: (id: string, formData: FormData) =>
    api.post<ApiResponse<CorrectiveAction>>(
      `/findings/${id}/corrective-actions`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),
  verifyCorrectiveAction: (
    id: string,
    actionId: string,
    data: Record<string, unknown>,
  ) =>
    api.post<ApiResponse<CorrectiveAction>>(
      `/findings/${id}/corrective-actions/${actionId}/verify`,
      data,
    ),
};
