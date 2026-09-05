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

export type PushDevice = {
  id: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  deviceId?: string | null;
  appVersion?: string | null;
  lastSeenAt: string;
  createdAt: string;
};

export const notificationsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<NotificationItem[]>>('/notifications', { params }),
  markRead: (id: string) =>
    api.post<ApiResponse<NotificationItem>>(`/notifications/${id}/read`),
  markAllRead: () =>
    api.post<ApiResponse<{ updated: number }>>('/notifications/read-all'),
  registerDevice: (payload: {
    token: string;
    platform: 'ANDROID' | 'IOS' | 'WEB';
    deviceId?: string | null;
    appVersion?: string | null;
  }) => api.post<ApiResponse<PushDevice>>('/notifications/devices', payload),
  unregisterDevice: (token: string) =>
    api.delete<ApiResponse<{ removed: boolean }>>('/notifications/devices', {
      data: { token },
    }),
  listDevices: () => api.get<ApiResponse<PushDevice[]>>('/notifications/devices'),
};
