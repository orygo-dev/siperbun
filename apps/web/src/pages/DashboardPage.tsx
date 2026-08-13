import { useQuery } from '@tanstack/react-query';
import {
  Award,
  ClipboardCheck,
  FileText,
  Leaf,
  MapPin,
  Sprout,
  Users,
} from 'lucide-react';
import { ROLES } from '@siperbun/shared';
import { ActivityTimeline } from '../components/dashboard/ActivityTimeline';
import { CertificateScanCard } from '../components/dashboard/CertificateScanCard';
import { CertificationStatusChart } from '../components/dashboard/CertificationStatusChart';
import { DashboardBannerCarousel } from '../components/dashboard/DashboardBannerCarousel';
import { InspectorPerformance } from '../components/dashboard/InspectorPerformance';
import { MapCard } from '../components/dashboard/MapCard';
import { PenangkarNativeHome } from '../components/dashboard/PenangkarNativeHome';
import { PriorityTaskCard } from '../components/dashboard/PriorityTaskCard';
import { ProductionChart } from '../components/dashboard/ProductionChart';
import { RecentApplicationsTable } from '../components/dashboard/RecentApplicationsTable';
import { ScheduleList } from '../components/dashboard/ScheduleList';
import { StatCard } from '../components/dashboard/StatCard';
import { cn, formatNumber } from '../lib/utils';
import { dashboardApi } from '../services/dashboard';
import { useAuthStore } from '../stores/authStore';

type DashVariant = 'executive' | 'pbt' | 'penangkar';

function resolveVariant(roles: string[]): DashVariant {
  if (
    roles.includes(ROLES.SUPER_ADMIN) ||
    roles.includes(ROLES.ADMIN) ||
    roles.includes(ROLES.PIMPINAN)
  ) {
    return 'executive';
  }
  if (roles.includes(ROLES.PBT)) return 'pbt';
  if (roles.includes(ROLES.PENANGKAR)) return 'penangkar';
  return 'executive';
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const variant = resolveVariant(user?.roles ?? []);

  const summaryQ = useQuery({
    queryKey: ['dash', 'summary', variant],
    queryFn: async () => (await dashboardApi.summary()).data.data,
  });
  const statusQ = useQuery({
    queryKey: ['dash', 'status', variant],
    queryFn: async () => (await dashboardApi.certificationStatus()).data.data,
    enabled: variant !== 'pbt',
  });
  const prioritiesQ = useQuery({
    queryKey: ['dash', 'priorities', variant],
    queryFn: async () => (await dashboardApi.priorities()).data.data,
  });
  const productionQ = useQuery({
    queryKey: ['dash', 'production', variant],
    queryFn: async () => (await dashboardApi.productionByCommodity()).data.data,
    enabled: variant !== 'pbt',
  });
  const mapQ = useQuery({
    queryKey: ['dash', 'map', variant],
    queryFn: async () => (await dashboardApi.distributionMap()).data.data,
    enabled: variant !== 'pbt',
  });
  const todayQ = useQuery({
    queryKey: ['dash', 'today', variant],
    queryFn: async () => (await dashboardApi.todayInspections()).data.data,
  });
  const pbtQ = useQuery({
    queryKey: ['dash', 'pbt', variant],
    queryFn: async () => (await dashboardApi.inspectorPerformance()).data.data,
    enabled: variant === 'executive' || variant === 'pbt',
  });
  const appsQ = useQuery({
    queryKey: ['dash', 'apps', variant],
    queryFn: async () => (await dashboardApi.recentApplications()).data.data,
  });
  const scansQ = useQuery({
    queryKey: ['dash', 'scans', variant],
    queryFn: async () => (await dashboardApi.certificateScans()).data.data,
    enabled: variant === 'executive',
  });
  const activitiesQ = useQuery({
    queryKey: ['dash', 'activities', variant],
    queryFn: async () => (await dashboardApi.recentActivities()).data.data,
  });
  const bannersQ = useQuery({
    queryKey: ['dash', 'banners', variant === 'penangkar' ? 'MOBILE' : 'DASHBOARD'],
    queryFn: async () =>
      (
        await dashboardApi.banners(
          variant === 'penangkar' ? 'MOBILE' : 'DASHBOARD',
        )
      ).data.data,
  });

  const requiredLoading = [
    summaryQ.isLoading,
    prioritiesQ.isLoading,
    todayQ.isLoading,
    appsQ.isLoading,
    activitiesQ.isLoading,
    variant !== 'pbt' && statusQ.isLoading,
    variant !== 'pbt' && productionQ.isLoading,
    variant !== 'pbt' && mapQ.isLoading,
    (variant === 'executive' || variant === 'pbt') && pbtQ.isLoading,
    variant === 'executive' && scansQ.isLoading,
  ].some(Boolean);

  if (requiredLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-[var(--text-secondary)] shadow-soft">
        Memuat dashboard...
      </div>
    );
  }

  if (!summaryQ.data || !prioritiesQ.data || !todayQ.data || !appsQ.data || !activitiesQ.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-danger">
        Gagal memuat data dashboard. Pastikan API berjalan dan database tersambung.
      </div>
    );
  }

  const summary = summaryQ.data as {
    activeProducers: number;
    nurseryLocations: number;
    activeBatches: number;
    activeSeedlings: number;
    applicationsThisMonth: number;
    scannedCertificates: number;
    labels?: Record<string, string>;
  };
  const labels = summary.labels ?? {};
  const priorities = prioritiesQ.data;
  const today = todayQ.data;
  const apps = appsQ.data;
  const activities = activitiesQ.data;
  const banners = bannersQ.data ?? [];
  const status = statusQ.data;
  const production = productionQ.data ?? [];
  const map = mapQ.data ?? [];
  const pbt = pbtQ.data ?? [];
  const scans = scansQ.data;

  if (variant === 'penangkar') {
    return (
      <>
        <PenangkarNativeHome
          userName={user?.name}
          summary={summary}
          priorities={priorities}
          apps={apps}
          banners={banners}
        />

        {/* Desktop / tablet web layout — tanpa banner mobile */}
        <div className="hidden space-y-4 lg:block">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              title={labels.nurseryLocations ?? 'Lokasi saya'}
              value={formatNumber(summary.nurseryLocations)}
              icon={MapPin}
              tone="teal"
            />
            <StatCard
              title={labels.activeBatches ?? 'Batch aktif saya'}
              value={formatNumber(summary.activeBatches)}
              icon={Sprout}
              tone="lime"
            />
            <StatCard
              title={labels.applicationsThisMonth ?? 'Pengajuan bulan ini'}
              value={formatNumber(summary.applicationsThisMonth)}
              icon={FileText}
              tone="sky"
            />
            <StatCard
              title={labels.scannedCertificates ?? 'Sertifikat saya'}
              value={formatNumber(summary.scannedCertificates)}
              icon={Award}
              tone="violet"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            {status && (
              <div className="xl:col-span-3">
                <CertificationStatusChart
                  total={status.total}
                  items={status.items}
                />
              </div>
            )}
            <div className="xl:col-span-3">
              <PriorityTaskCard items={priorities} />
            </div>
            <div className="xl:col-span-6">
              <MapCard markers={map} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <ProductionChart data={production} />
            </div>
            <div className="xl:col-span-5">
              <ScheduleList items={today} />
            </div>
          </div>
          <RecentApplicationsTable items={apps} />
          <ActivityTimeline items={activities} />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <DashboardBannerCarousel items={banners} />

      <div
        className={cn(
          'grid gap-3 sm:gap-4',
          variant === 'pbt'
            ? 'grid-cols-2 xl:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6',
        )}
      >
        {variant === 'pbt' ? (
          <>
            <StatCard
              title={labels.nurseryLocations ?? 'Jadwal hari ini'}
              value={formatNumber(summary.nurseryLocations)}
              icon={ClipboardCheck}
              tone="teal"
            />
            <StatCard
              title={labels.activeBatches ?? 'Lewat jadwal'}
              value={formatNumber(summary.activeBatches)}
              icon={FileText}
              tone="sky"
            />
            <StatCard
              title={labels.activeProducers ?? 'Tugas terbuka'}
              value={formatNumber(summary.activeProducers)}
              icon={Users}
              tone="emerald"
            />
            <StatCard
              title={labels.activeSeedlings ?? 'Selesai bulan ini'}
              value={formatNumber(summary.activeSeedlings)}
              icon={Award}
              tone="violet"
            />
          </>
        ) : (
          <>
            <StatCard
              title={labels.activeProducers ?? 'Penangkar Aktif'}
              value={formatNumber(summary.activeProducers)}
              icon={Users}
              tone="emerald"
            />
            <StatCard
              title={labels.nurseryLocations ?? 'Lokasi Pembibitan'}
              value={formatNumber(summary.nurseryLocations)}
              icon={MapPin}
              tone="teal"
            />
            <StatCard
              title={labels.activeBatches ?? 'Batch Produksi Aktif'}
              value={formatNumber(summary.activeBatches)}
              icon={Sprout}
              tone="lime"
            />
            <StatCard
              title={labels.activeSeedlings ?? 'Bibit Aktif'}
              value={`${formatNumber(summary.activeSeedlings)} batang`}
              icon={Leaf}
              tone="green"
            />
            <StatCard
              title={labels.applicationsThisMonth ?? 'Pengajuan Bulan Ini'}
              value={formatNumber(summary.applicationsThisMonth)}
              icon={FileText}
              tone="sky"
            />
            <StatCard
              title={labels.scannedCertificates ?? 'Sertifikat Scan Terunggah'}
              value={formatNumber(summary.scannedCertificates)}
              icon={Award}
              tone="violet"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {variant !== 'pbt' && status && (
          <div className="xl:col-span-3">
            <CertificationStatusChart total={status.total} items={status.items} />
          </div>
        )}
        <div className={variant === 'pbt' ? 'xl:col-span-5' : 'xl:col-span-3'}>
          <PriorityTaskCard items={priorities} />
        </div>
        {variant !== 'pbt' ? (
          <div className="xl:col-span-6">
            <MapCard markers={map} />
          </div>
        ) : (
          <div className="xl:col-span-7">
            <ScheduleList items={today} />
          </div>
        )}
      </div>

      {variant !== 'pbt' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <ProductionChart data={production} />
          </div>
          <div className="xl:col-span-5">
            <ScheduleList items={today} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {(variant === 'executive' || variant === 'pbt') && (
          <div className="xl:col-span-4">
            <InspectorPerformance items={pbt} />
          </div>
        )}
        <div className="xl:col-span-8">
          <RecentApplicationsTable items={apps} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {variant === 'executive' && scans && (
          <div className="xl:col-span-5">
            <CertificateScanCard data={scans} />
          </div>
        )}
        <div
          className={
            variant === 'executive' ? 'xl:col-span-7' : 'xl:col-span-12'
          }
        >
          <ActivityTimeline items={activities} />
        </div>
      </div>
    </div>
  );
}
