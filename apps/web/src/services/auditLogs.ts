import { api, type ApiResponse } from '../lib/api';

export type AuditLog = {
  id: string;
  userId?: string | null;
  action: string;
  module: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
};

export const auditLogsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<AuditLog[]>>('/audit-logs', { params }),
  get: (id: string) => api.get<ApiResponse<AuditLog>>(`/audit-logs/${id}`),
};
