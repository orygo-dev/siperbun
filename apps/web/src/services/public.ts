import { api, type ApiResponse } from '../lib/api';
import type { DashboardBanner } from './settings';

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, '') ||
  'http://localhost:3000';

export function publicAssetUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export type PublicCommodity = { id: string; name: string; unit: string; code: string };
export type PublicKabupaten = { id: string; name: string; code: string };

export type PublicListingCard = {
  id: string;
  title: string;
  description: string | null;
  availableQty: number | null;
  ageMonths: number | null;
  unit: string;
  priceHint: string | null;
  status?: string;
  publishedAt: string | null;
  commodity: { id: string; name: string; unit: string };
  variety: { id: string; name: string; clone: string | null } | null;
  producer: {
    id: string;
    businessName: string;
    ownerName: string;
    phone: string | null;
    kabupaten: string | null;
    kecamatan: string | null;
    desa: string | null;
  };
  nursery: { id: string; name: string; address: string | null } | null;
  latitude: number | null;
  longitude: number | null;
  coverUrl: string | null;
  photos: { id: string; url: string; caption: string | null; isCover: boolean }[];
  distanceKm?: number | null;
  producerId?: string;
  commodityId?: string;
  varietyId?: string | null;
  nurseryId?: string | null;
};

export type PublicProducerCard = {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string | null;
  kabupaten: string | null;
  kecamatan: string | null;
  desa: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  nurseryName: string | null;
  listingCount: number;
  distanceKm: number | null;
};

export type PublicProducerDetail = {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  nurseryAddress: string | null;
  nurseryKabupaten: string | null;
  landOwnershipStatus: 'RENTED' | 'BORROWED' | 'OWNED' | null;
  kabupaten: string | null;
  kecamatan: string | null;
  desa: string | null;
  latitude: number | null;
  longitude: number | null;
  nurseries: {
    id: string;
    name: string;
    address: string | null;
    kabupaten: string | null;
    latitude: number | null;
    longitude: number | null;
  }[];
  listings: PublicListingCard[];
};

export type PublicMapSummary = {
  districts: Array<{
    id: string;
    name: string;
    code: string;
    producerCount: number;
  }>;
  markers: Array<{
    id: string;
    businessName: string;
    latitude: number;
    longitude: number;
    kabupaten: { id: string; name: string } | null;
    commodities: Array<{ id: string; name: string }>;
  }>;
};

export const publicApi = {
  commodities: () =>
    api.get<ApiResponse<PublicCommodity[]>>('/public/commodities'),
  kabupaten: () =>
    api.get<ApiResponse<PublicKabupaten[]>>('/public/regions/kabupaten'),
  map: (commodityId?: string) =>
    api.get<ApiResponse<PublicMapSummary>>('/public/map', {
      params: commodityId ? { commodityId } : undefined,
    }),
  banners: () =>
    api.get<ApiResponse<DashboardBanner[]>>('/settings/banners/active', {
      params: { placement: 'MOBILE' },
    }),
  listings: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<PublicListingCard[]>>('/public/listings', { params }),
  listing: (id: string) =>
    api.get<ApiResponse<PublicListingCard>>(`/public/listings/${id}`),
  producers: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiResponse<PublicProducerCard[]>>('/public/producers', { params }),
  producer: (id: string) =>
    api.get<ApiResponse<PublicProducerDetail>>(`/public/producers/${id}`),
  register: (payload: FormData) =>
    api.post<ApiResponse<{ id: string; message: string }>>(
      '/public/registrations',
      payload,
    ),
};

export const catalogApi = {
  list: () => api.get<ApiResponse<PublicListingCard[]>>('/catalog/listings'),
  create: (payload: Record<string, unknown>) =>
    api.post<ApiResponse<PublicListingCard>>('/catalog/listings', payload),
  update: (id: string, payload: Record<string, unknown>) =>
    api.put<ApiResponse<PublicListingCard>>(`/catalog/listings/${id}`, payload),
  remove: (id: string) =>
    api.delete<ApiResponse<null>>(`/catalog/listings/${id}`),
  uploadPhoto: (id: string, file: File, isCover = false) => {
    const form = new FormData();
    form.append('file', file);
    form.append('isCover', String(isCover));
    return api.post<ApiResponse<PublicListingCard>>(
      `/catalog/listings/${id}/photos`,
      form,
    );
  },
  deletePhoto: (id: string, photoId: string) =>
    api.delete<ApiResponse<PublicListingCard>>(
      `/catalog/listings/${id}/photos/${photoId}`,
    ),
  registrations: () =>
    api.get<ApiResponse<unknown[]>>('/catalog/registrations'),
  createRegistration: (payload: FormData) =>
    api.post<ApiResponse<{
      id: string;
      status: string;
      createdProducer?: { id: string; registrationNumber: string } | null;
    }>>('/catalog/registrations', payload),
  updateRegistration: (
    id: string,
    payload: { status: string; reviewNotes?: string | null },
  ) =>
    api.patch<ApiResponse<unknown>>(`/catalog/registrations/${id}/status`, payload),
  downloadRegistrationFile: (fileId: string) =>
    api.get<Blob>(`/files/${fileId}`, { responseType: 'blob' }),
};
