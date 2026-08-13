import { api, type ApiResponse } from '../lib/api';

export type StoredFileMeta = {
  id: string;
  originalName: string;
  storageName: string;
  mimeType: string;
  size: number;
  sha256: string;
  path: string;
  url: string;
  uploadedById?: string | null;
  createdAt?: string;
};

export type CertificateVersion = {
  id: string;
  version: number;
  reason?: string | null;
  createdAt: string;
  fileId?: string | null;
  file?: StoredFileMeta | null;
};

export type Certificate = {
  id: string;
  applicationId: string;
  producerId: string;
  batchId?: string | null;
  certificateNumber: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
  certifiedCount: number;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  status: string;
  currentFileId?: string | null;
  uploadedById?: string | null;
  verifiedById?: string | null;
  uploadedAt?: string | null;
  verifiedAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  producer?: {
    id: string;
    businessName: string;
    registrationNumber?: string;
  } | null;
  application?: {
    id: string;
    applicationNumber: string;
    status: string;
    seedlingCount?: number;
    commodity?: { id: string; name: string; code: string } | null;
    variety?: { id: string; name: string; code: string } | null;
  } | null;
  batch?: { id: string; batchNumber: string; status: string } | null;
  currentFile?: StoredFileMeta | null;
  versions?: CertificateVersion[];
  uploadedBy?: { id: string; name: string; email: string } | null;
  verifiedBy?: { id: string; name: string; email: string } | null;
};

export const certificatesApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<Certificate[]>>('/certificates', { params }),
  get: (id: string) =>
    api.get<ApiResponse<Certificate>>(`/certificates/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Certificate>>('/certificates', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Certificate>>(`/certificates/${id}`, data),
  uploadScan: (id: string, formData: FormData) =>
    api.post<ApiResponse<Certificate>>(
      `/certificates/${id}/upload-scan`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),
  verifyScan: (id: string, data: { approved: boolean; notes?: string | null }) =>
    api.post<ApiResponse<Certificate>>(
      `/certificates/${id}/verify-scan`,
      data,
    ),
  replaceScan: (id: string, formData: FormData) =>
    api.post<ApiResponse<Certificate>>(
      `/certificates/${id}/replace-scan`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),
  cancel: (id: string, data?: { reason?: string | null }) =>
    api.post<ApiResponse<Certificate>>(
      `/certificates/${id}/cancel`,
      data ?? {},
    ),
  downloadUrl: (id: string) =>
    `${api.defaults.baseURL}/certificates/${id}/download`,
};
