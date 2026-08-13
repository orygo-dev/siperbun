import { api, type ApiResponse } from '../lib/api';

export type ReportColumn = { key: string; label: string };
export type ReportSummary = Record<string, number>;

export const reportsApi = {
  summary: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<ReportSummary>>('/reports/summary', { params }),
  get: (type: string, params?: Record<string, unknown>) =>
    api.get<
      ApiResponse<{ items: Array<Record<string, unknown>>; columns: ReportColumn[] }>
    >(`/reports/${type}`, { params }),
  exportCsv: async (type: string, params?: Record<string, unknown>) => {
    const res = await api.get(`/reports/${type}/export`, {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });
    return res;
  },
};
