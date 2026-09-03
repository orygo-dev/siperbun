import { api, type ApiResponse } from '../lib/api';
import type { DashboardBanner } from './settings';

export type DashboardSummary = {
  activeProducers: number;
  nurseryLocations: number;
  activeBatches: number;
  activeSeedlings: number;
  applicationsThisMonth: number;
  scannedCertificates: number;
};

export type StatusItem = { label: string; count: number };
export type PriorityItem = {
  key: string;
  title: string;
  count: number;
  urgency: string;
  href: string;
  color: string;
};
export type ProductionItem = { name: string; value: number };
export type MapMarker = {
  id: string;
  type: string;
  color: string;
  lat: number;
  lng: number;
  name: string;
  locationType: string;
  locationName: string;
  commodity: string;
  kabupaten: string;
  status: string;
  href: string;
};
export type ScheduleItem = {
  id: string;
  time: string;
  commodity: string;
  producer: string;
  kabupaten: string;
  inspector: string;
  status: string;
  href: string;
};
export type InspectorItem = {
  id: string;
  name: string;
  inspectionCount: number;
  completedCount: number;
  completionRate: number;
};
export type RecentApplication = {
  id: string;
  applicationNumber: string;
  producer: string;
  commodity: string;
  seedlingCount: number;
  status: string;
  submittedAt: string;
  href: string;
};
export type CertificateScans = {
  issued: number;
  uploaded: number;
  pendingUpload: number;
  verified: number;
  verifiedPercent: number;
};
export type ActivityItem = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  user?: string;
  createdAt: string;
  relative: string;
};

export type SeedDistributionSummary = {
  totalQuantity: number;
  totalTransactions: number;
  thisYearQuantity: number;
  producerCount: number;
  districts: Array<{ name: string; quantity: number; count: number }>;
  recent: Array<{
    id: string;
    buyerName: string;
    producer: string;
    destinationKab: string | null;
    quantity: number;
    distributedAt: string;
  }>;
};

export const dashboardApi = {
  summary: () => api.get<ApiResponse<DashboardSummary>>('/dashboard/summary'),
  certificationStatus: () =>
    api.get<ApiResponse<{ total: number; items: StatusItem[] }>>(
      '/dashboard/certification-status',
    ),
  priorities: () => api.get<ApiResponse<PriorityItem[]>>('/dashboard/priorities'),
  productionByCommodity: () =>
    api.get<ApiResponse<ProductionItem[]>>('/dashboard/production-by-commodity'),
  distributionMap: () =>
    api.get<ApiResponse<MapMarker[]>>('/dashboard/distribution-map'),
  todayInspections: () =>
    api.get<ApiResponse<ScheduleItem[]>>('/dashboard/today-inspections'),
  inspectorPerformance: () =>
    api.get<ApiResponse<InspectorItem[]>>('/dashboard/inspector-performance'),
  recentApplications: () =>
    api.get<ApiResponse<RecentApplication[]>>('/dashboard/recent-applications'),
  certificateScans: () =>
    api.get<ApiResponse<CertificateScans>>('/dashboard/certificate-scans'),
  recentActivities: () =>
    api.get<ApiResponse<ActivityItem[]>>('/dashboard/recent-activities'),
  banners: (placement?: 'DASHBOARD' | 'MOBILE') =>
    api.get<ApiResponse<DashboardBanner[]>>('/dashboard/banners', {
      params: placement ? { placement } : undefined,
    }),
  seedDistributions: () =>
    api.get<ApiResponse<SeedDistributionSummary>>(
      '/dashboard/seed-distributions',
    ),
};
