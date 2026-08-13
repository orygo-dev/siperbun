import { api, type ApiResponse } from '../lib/api';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
};

export const notificationsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<NotificationItem[]>>('/notifications', { params }),
  markRead: (id: string) =>
    api.post<ApiResponse<NotificationItem>>(`/notifications/${id}/read`),
  markAllRead: () =>
    api.post<ApiResponse<{ updated: number }>>('/notifications/read-all'),
};
