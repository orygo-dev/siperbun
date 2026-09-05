import { api, resolveApiOrigin, type ApiResponse } from '../lib/api';

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

export type PortalContent = {
  hero: {
    enabled: boolean;
    title: string;
    description: string;
    primaryLabel: string;
    primaryLink: string;
    secondaryLabel: string;
    secondaryLink: string;
  };
  profile: {
    enabled: boolean;
    title: string;
    body: string;
    secondaryBody: string;
    responsibilities: string[];
  };
  services: {
    enabled: boolean;
    title: string;
    intro: string;
    items: Array<{ title: string; description: string; link: string }>;
  };
  visionMission: {
    enabled: boolean;
    vision: string;
    missions: string[];
  };
  map: { enabled: boolean; title: string; description: string };
  contact: {
    enabled: boolean;
    title: string;
    primaryLabel: string;
    primaryLink: string;
    secondaryLabel: string;
    secondaryLink: string;
    address: string;
    hours: string;
    phone: string;
    email: string;
  };
};

export type PortalContentResponse = {
  content: PortalContent;
  media: {
    heroImageUrl: string | null;
    serviceImageUrl: string | null;
  };
};

export type PortalMediaSlot = 'hero' | 'service';

const API_BASE = resolveApiOrigin();

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

  getPortalContent: () =>
    api.get<ApiResponse<PortalContentResponse>>('/settings/portal-content'),
  updatePortalContent: (payload: PortalContent) =>
    api.put<ApiResponse<PortalContentResponse>>(
      '/settings/portal-content',
      payload,
    ),
  uploadPortalMedia: (slot: PortalMediaSlot, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ApiResponse<PortalContentResponse>>(
      `/settings/portal-content/media/${slot}`,
      form,
    );
  },
  clearPortalMedia: (slot: PortalMediaSlot) =>
    api.delete<ApiResponse<PortalContentResponse>>(
      `/settings/portal-content/media/${slot}`,
    ),

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
