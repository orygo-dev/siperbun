import { api, type ApiResponse } from '../lib/api';

export type Branding = {
  appName: string;
  fullName: string;
  officeName: string;
  logoFileId: string | null;
  logoUrl: string | null;
};

export type BannerPlacement = 'DASHBOARD' | 'MOBILE';

export type DashboardBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  linkUrl: string | null;
  placement: BannerPlacement;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  imageFileId: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, '') ||
  'http://localhost:3000';

/** Absolute URL for logo (works on login without auth) */
export function brandingLogoSrc(logoUrl: string | null | undefined) {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('http')) return logoUrl;
  return `${API_BASE}${logoUrl}`;
}

export function bannerImageSrc(imageUrl: string | null | undefined) {
  return brandingLogoSrc(imageUrl);
}

export const settingsApi = {
  getBranding: () =>
    api.get<ApiResponse<Branding>>('/settings/branding'),
  updateBranding: (payload: {
    appName: string;
    fullName: string;
    officeName: string;
  }) => api.put<ApiResponse<Branding>>('/settings/branding', payload),
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ApiResponse<Branding>>('/settings/branding/logo', form);
  },
  clearLogo: () =>
    api.delete<ApiResponse<Branding>>('/settings/branding/logo'),

  listBanners: (placement?: BannerPlacement) =>
    api.get<ApiResponse<DashboardBanner[]>>('/settings/banners', {
      params: placement ? { placement } : undefined,
    }),
  createBanner: (payload: Record<string, unknown>) =>
    api.post<ApiResponse<DashboardBanner>>('/settings/banners', payload),
  updateBanner: (id: string, payload: Record<string, unknown>) =>
    api.put<ApiResponse<DashboardBanner>>(`/settings/banners/${id}`, payload),
  deleteBanner: (id: string) =>
    api.delete<ApiResponse<null>>(`/settings/banners/${id}`),
  uploadBannerImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ApiResponse<DashboardBanner>>(
      `/settings/banners/${id}/image`,
      form,
    );
  },
  clearBannerImage: (id: string) =>
    api.delete<ApiResponse<DashboardBanner>>(`/settings/banners/${id}/image`),
};
