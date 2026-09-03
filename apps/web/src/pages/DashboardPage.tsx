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
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { InspectorPerformance } from '../components/dashboard/InspectorPerformance';
import { MapCard } from '../components/dashboard/MapCard';
import { PenangkarNativeHome } from '../components/dashboard/PenangkarNativeHome';
import { PriorityTaskCard } from '../components/dashboard/PriorityTaskCard';
import { ProductionChart } from '../components/dashboard/ProductionChart';
import { RecentApplicationsTable } from '../components/dashboard/RecentApplicationsTable';
import { ScheduleList } from '../components/dashboard/ScheduleList';
import { SeedDistributionCard } from '../components/dashboard/SeedDistributionCard';
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

function greetingForHour(hour: number) {
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] ?? '';
}

function DashboardIntro({ name }: { name?: string }) {
  const greet = greetingForHour(new Date().getHours());
  const person = firstName(name);
  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-lg font-semibold tracking-tight text-slate-900">
          {greet}
          {person ? `, ${person}` : ''}
        </p>
        <p className="text-sm capitalize text-slate-500">{today}</p>
      </div>
    </div>
  );
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
  const distQ = useQuery({
    queryKey: ['dash', 'seed-distributions', variant],
    queryFn: async () => (await dashboardApi.seedDistributions()).data.data,
    enabled: variant === 'executive',
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
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
            {status && (
              <div className="min-w-0">
                <CertificationStatusChart
                  total={status.total}
                  items={status.items}
                />
              </div>
            )}
            <div className="min-w-0">
              <PriorityTaskCard items={priorities} />
            </div>
          </div>
          <ErrorBoundary>
            <MapCard markers={map} />
          </ErrorBoundary>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
            <div className="min-w-0">
              <ProductionChart data={production} />
            </div>
            <div className="min-w-0">
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
    <div className="space-y-5">
      <DashboardIntro name={user?.name} />
      <ErrorBoundary>
        <DashboardBannerCarousel items={banners} />
      </ErrorBoundary>

      <div
        className={cn(
          'grid gap-4',
          variant === 'pbt'
            ? 'grid-cols-2 xl:grid-cols-4'
            : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
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
              title={labels.activeProducers ?? 'Penangkar aktif'}
              value={formatNumber(summary.activeProducers)}
              icon={Users}
              tone="emerald"
            />
            <StatCard
              title={labels.nurseryLocations ?? 'Lokasi pembibitan'}
              value={formatNumber(summary.nurseryLocations)}
              icon={MapPin}
              tone="teal"
            />
            <StatCard
              title={labels.activeBatches ?? 'Batch aktif'}
              value={formatNumber(summary.activeBatches)}
              icon={Sprout}
              tone="lime"
            />
            <StatCard
              title={labels.activeSeedlings ?? 'Bibit aktif'}
              value={formatNumber(summary.activeSeedlings)}
              icon={Leaf}
              tone="green"
            />
            <StatCard
              title={labels.applicationsThisMonth ?? 'Pengajuan bulan ini'}
              value={formatNumber(summary.applicationsThisMonth)}
              icon={FileText}
              tone="sky"
            />
            <StatCard
              title={labels.scannedCertificates ?? 'Scan sertifikat'}
              value={formatNumber(summary.scannedCertificates)}
              icon={Award}
              tone="violet"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
        {variant !== 'pbt' && status && (
          <div className="min-w-0">
            <CertificationStatusChart total={status.total} items={status.items} />
          </div>
        )}
        <div className="min-w-0">
          <PriorityTaskCard items={priorities} />
        </div>
        {variant === 'pbt' ? (
          <div className="min-w-0">
            <ScheduleList items={today} />
          </div>
        ) : null}
      </div>

      {variant === 'executive' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
          <div className="min-w-0">
            <ErrorBoundary>
              <MapCard markers={map} compact />
            </ErrorBoundary>
          </div>
          <div className="min-w-0">
            <ErrorBoundary>
              {distQ.isLoading ? (
                <div className="flex h-full min-h-[28rem] items-center justify-center rounded-xl border border-border bg-card p-8 text-sm text-[var(--text-secondary)] shadow-soft">
                  Memuat data distribusi bibit...
                </div>
              ) : distQ.data ? (
                <SeedDistributionCard data={distQ.data} />
              ) : (
                <div className="flex h-full min-h-[28rem] items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Data distribusi bibit belum dapat dimuat.
                </div>
              )}
            </ErrorBoundary>
          </div>
        </div>
      )}

      {variant !== 'pbt' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
          <div className="min-w-0">
            <ProductionChart data={production} />
          </div>
          <div className="min-w-0">
            <ScheduleList items={today} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
        {(variant === 'executive' || variant === 'pbt') && (
          <div className="min-w-0 lg:col-span-5">
            <InspectorPerformance items={pbt} />
          </div>
        )}
        <div
          className={cn(
            'min-w-0',
            variant === 'executive' || variant === 'pbt'
              ? 'lg:col-span-7'
              : 'lg:col-span-12',
          )}
        >
          <RecentApplicationsTable items={apps} />
        </div>
      </div>

      <div className={cn(
        'grid grid-cols-1 gap-4 lg:items-stretch',
        variant === 'executive' && scans ? 'lg:grid-cols-2' : 'lg:grid-cols-1',
      )}>
        {variant === 'executive' && scans && (
          <div className="min-w-0">
            <CertificateScanCard data={scans} />
          </div>
        )}
        <div className="min-w-0">
          <ActivityTimeline items={activities} />
        </div>
      </div>
    </div>
  );
}
