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
  documents?: ApplicationDocument[];
  inspectionReport?: {
    id: string;
    reportNumber: string;
    issuedAt: string;
    notes?: string | null;
    file?: ApplicationFile | null;
  } | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    amount: number;
    dueDate: string;
    issuedAt: string;
    paymentInstructions?: string | null;
    status: string;
    paidAt?: string | null;
    paymentProofs?: Array<{
      id: string;
      status: string;
      notes?: string | null;
      verificationNotes?: string | null;
      submittedAt: string;
      verifiedAt?: string | null;
      file?: ApplicationFile | null;
    }>;
  } | null;
  documentCompliance?: {
    required: string[];
    missing: string[];
    complete: boolean;
    legacyVerified?: boolean;
  };
};

export type ApplicationFile = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export type ApplicationDocument = {
  id: string;
  title: string;
  kind: string;
  file?: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
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
  uploadDocument: (id: string, title: string, file: File) => {
    const form = new FormData();
    form.append('title', title);
    form.append('file', file);
    return api.post<ApiResponse<CertificationApplication>>(
      `/certification-applications/${id}/documents`,
      form,
    );
  },
  removeDocument: (id: string, documentId: string) =>
    api.delete<ApiResponse<CertificationApplication>>(
      `/certification-applications/${id}/documents/${documentId}`,
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
  createLhpAndInvoice: (
    id: string,
    data: {
      reportNumber: string;
      invoiceNumber: string;
      amount: number;
      dueDate: string;
      paymentInstructions?: string | null;
      notes?: string | null;
      file: File;
    },
  ) => {
    const form = new FormData();
    form.append('reportNumber', data.reportNumber);
    form.append('invoiceNumber', data.invoiceNumber);
    form.append('amount', String(data.amount));
    form.append('dueDate', data.dueDate);
    if (data.paymentInstructions) form.append('paymentInstructions', data.paymentInstructions);
    if (data.notes) form.append('notes', data.notes);
    form.append('file', data.file);
    return api.post<ApiResponse<CertificationApplication>>(
      `/certification-applications/${id}/lhp-invoice`,
      form,
    );
  },
  uploadPaymentProof: (id: string, file: File, notes?: string | null) => {
    const form = new FormData();
    form.append('file', file);
    if (notes) form.append('notes', notes);
    return api.post<ApiResponse<CertificationApplication>>(
      `/certification-applications/${id}/payment-proof`,
      form,
    );
  },
  verifyPayment: (
    id: string,
    data: { decision: 'ACCEPTED' | 'REJECTED'; notes?: string | null },
  ) => api.post<ApiResponse<CertificationApplication>>(
    `/certification-applications/${id}/verify-payment`,
    data,
  ),
  downloadFile: async (fileId: string, filename?: string) => {
    const response = await api.get<Blob>(`/files/${fileId}`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || 'dokumen';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  },
  downloadInvoice: async (id: string, invoiceNumber: string) => {
    const response = await api.get<Blob>(`/certification-applications/${id}/invoice`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `invoice-${invoiceNumber.replace(/[^a-zA-Z0-9._-]+/g, '-')}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  },
};
