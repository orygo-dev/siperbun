import { api, type ApiResponse } from '../lib/api';

export type InspectionChecklist = {
  id: string;
  code: string;
  label: string;
  description?: string | null;
  sortOrder: number;
  commodityId?: string | null;
};

export type InspectionResult = {
  id: string;
  checklistId: string;
  value?: string | null;
  isPassed?: boolean | null;
  notes?: string | null;
  checklist?: InspectionChecklist;
};

export type InspectionPhoto = {
  id: string;
  caption?: string | null;
  takenAt?: string | null;
  file?: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  } | null;
};

export type FieldInspection = {
  id: string;
  assignmentId: string;
  inspectorId: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  gpsAccuracy?: number | null;
  populationCount?: number | null;
  sampleCount?: number | null;
  passedCount?: number | null;
  failedCount?: number | null;
  rejectedCount?: number | null;
  conclusion?: string | null;
  recommendation?: string | null;
  notes?: string | null;
  isFinalized: boolean;
  finalizedAt?: string | null;
  inspector?: { id: string; name: string; email: string } | null;
  assignment?: {
    id: string;
    assignmentNumber: string;
    status: string;
    application?: {
      id: string;
      applicationNumber: string;
      status: string;
      seedlingCount?: number;
      producer?: { id: string; businessName: string } | null;
      commodity?: { id: string; name: string; code: string } | null;
    } | null;
  } | null;
  photos?: InspectionPhoto[];
  findings?: Array<{
    id: string;
    findingType: string;
    description: string;
    severity: string;
    status: string;
  }>;
  results?: InspectionResult[];
};

export const inspectionsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<FieldInspection[]>>('/field-inspections', { params }),
  get: (id: string) =>
    api.get<ApiResponse<FieldInspection>>(`/field-inspections/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<FieldInspection>>('/field-inspections', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<FieldInspection>>(`/field-inspections/${id}`, data),
  upsertResults: (id: string, data: { results: unknown[] }) =>
    api.post<ApiResponse<FieldInspection>>(
      `/field-inspections/${id}/results`,
      data,
    ),
  addPhoto: (id: string, formData: FormData) =>
    api.post<ApiResponse<InspectionPhoto>>(
      `/field-inspections/${id}/photos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),
  addFinding: (id: string, data: Record<string, unknown>) =>
    api.post(`/field-inspections/${id}/findings`, data),
  finalize: (id: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<FieldInspection>>(
      `/field-inspections/${id}/finalize`,
      data,
    ),
  validate: (id: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<FieldInspection>>(
      `/field-inspections/${id}/validate`,
      data,
    ),
  checklists: (commodityId?: string) =>
    api.get<ApiResponse<InspectionChecklist[]>>('/inspection-checklists', {
      params: commodityId ? { commodityId } : undefined,
    }),
};
