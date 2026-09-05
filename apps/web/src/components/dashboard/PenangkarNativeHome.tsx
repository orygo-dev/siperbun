import {
  Award,
  ChevronRight,
  FilePlus2,
  FileText,
  Leaf,
  Map,
  MapPin,
  Sprout,
  Truck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn, formatNumber } from '../../lib/utils';
import type {
  PriorityItem,
  RecentApplication,
} from '../../services/dashboard';
import type { DashboardBanner } from '../../services/settings';
import { StatusBadge } from '../common/StatusBadge';
import { DashboardBannerCarousel } from './DashboardBannerCarousel';

type Props = {
  userName?: string;
  summary: {
    nurseryLocations: number;
    activeBatches: number;
    activeSeedlings: number;
    applicationsThisMonth: number;
    scannedCertificates: number;
  };
  priorities: PriorityItem[];
  apps: RecentApplication[];
  banners: DashboardBanner[];
};

const metrics = [
  {
    key: 'lokasi',
    label: 'Lokasi',
    icon: MapPin,
    card: 'bg-gradient-to-br from-teal-50 to-cyan-50/80 ring-teal-100/80',
    tone: 'bg-teal-500 text-white',
    value: 'text-teal-950',
    labelCls: 'text-teal-700/80',
    get: (s: Props['summary']) => formatNumber(s.nurseryLocations),
  },
  {
    key: 'batch',
    label: 'Batch',
    icon: Sprout,
    card: 'bg-gradient-to-br from-lime-50 to-green-50/80 ring-lime-100/80',
    tone: 'bg-lime-600 text-white',
    value: 'text-lime-950',
    labelCls: 'text-lime-800/80',
    get: (s: Props['summary']) => formatNumber(s.activeBatches),
  },
  {
    key: 'ajuan',
    label: 'Pengajuan',
    icon: FileText,
    card: 'bg-gradient-to-br from-sky-50 to-blue-50/80 ring-sky-100/80',
    tone: 'bg-sky-500 text-white',
    value: 'text-sky-950',
    labelCls: 'text-sky-700/80',
    get: (s: Props['summary']) => formatNumber(s.applicationsThisMonth),
  },
  {
    key: 'sertifikat',
    label: 'Sertifikat',
    icon: Award,
    card: 'bg-gradient-to-br from-violet-50 to-fuchsia-50/70 ring-violet-100/80',
    tone: 'bg-violet-500 text-white',
    value: 'text-violet-950',
    labelCls: 'text-violet-700/80',
    get: (s: Props['summary']) => formatNumber(s.scannedCertificates),
  },
] as const;

const shortcuts = [
  { to: '/produksi/tambah', label: 'Tambah produksi', icon: Leaf },
  { to: '/pengajuan/tambah', label: 'Ajukan sertifikasi', icon: FilePlus2 },
  { to: '/distribusi/tambah', label: 'Catat distribusi', icon: Truck },
  { to: '/sertifikat', label: 'Sertifikat', icon: Award },
  { to: '/peta', label: 'Peta', icon: Map },
  { to: '/sumber-benih', label: 'Sumber benih', icon: Sprout },
] as const;

export function PenangkarNativeHome({
  userName,
  summary,
  priorities,
  apps,
  banners,
}: Props) {
  const displayName = userName?.trim() || 'Penangkar';
  const attention = priorities.filter((p) => p.count > 0);

  return (
    <div className="lg:hidden">
      {/* Greeting */}
      <div className="px-1 pb-3 pt-1">
        <p className="text-[13px] font-medium text-slate-500">Halo,</p>
        <h2 className="text-[22px] font-bold tracking-tight text-slate-900">
          {displayName}
        </h2>
        <p className="mt-0.5 text-[13px] text-slate-500">
          {formatNumber(summary.activeSeedlings)} bibit aktif di kebun Anda
        </p>
      </div>

      {/* Banner — gaya sama dengan portal publik */}
      {banners.length > 0 && (
        <div className="mb-4">
          <DashboardBannerCarousel items={banners} native />
        </div>
      )}

      {/* Metric tiles 2×2 */}
      <div className="grid grid-cols-2 gap-2.5">
        {metrics.map((m) => (
          <div
            key={m.key}
            className={cn(
              'rounded-[18px] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1',
              m.card,
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl shadow-sm',
                  m.tone,
                )}
              >
                <m.icon size={16} strokeWidth={2.2} />
              </span>
            </div>
            <div
              className={cn(
                'mt-3 text-[22px] font-bold leading-none tracking-tight',
                m.value,
              )}
            >
              {m.get(summary)}
            </div>
            <div className={cn('mt-1.5 text-[12px] font-medium', m.labelCls)}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions — horizontal */}
      <div className="mt-5">
        <div className="mb-2.5 px-0.5 text-[13px] font-semibold text-slate-800">
          Aksi cepat
        </div>
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {shortcuts.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 active:scale-95"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white text-primary shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.03]">
                <s.icon size={22} strokeWidth={2} />
              </span>
              <span className="text-center text-[11px] font-medium leading-tight text-slate-600">
                {s.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Attention list */}
      {attention.length > 0 && (
        <section className="mt-5">
          <div className="mb-2.5 px-0.5 text-[13px] font-semibold text-slate-800">
            Perlu perhatian
          </div>
          <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]">
            {attention.map((item, i) => (
              <Link
                key={item.key}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-3.5 active:bg-slate-50',
                  i > 0 && 'border-t border-slate-100',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                    item.color === 'danger'
                      ? 'bg-red-500'
                      : item.color === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-sky-500',
                  )}
                >
                  {item.count}
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-slate-800">
                  {item.title}
                </span>
                <ChevronRight size={16} className="shrink-0 text-slate-300" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent applications */}
      <section className="mt-5">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <div className="text-[13px] font-semibold text-slate-800">
            Pengajuan terbaru
          </div>
          <Link
            to="/pengajuan"
            className="text-[12px] font-semibold text-primary"
          >
            Semua
          </Link>
        </div>
        <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]">
          {apps.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-slate-400">
              Belum ada pengajuan
            </div>
          ) : (
            apps.slice(0, 5).map((row, i) => (
              <Link
                key={row.id}
                to={row.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-3 active:bg-slate-50',
                  i > 0 && 'border-t border-slate-100',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-slate-900">
                    {row.applicationNumber}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-slate-500">
                    {row.commodity} · {formatNumber(row.seedlingCount)} bibit
                  </div>
                </div>
                <StatusBadge status={row.status} kind="application" />
                <ChevronRight size={16} className="shrink-0 text-slate-300" />
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
