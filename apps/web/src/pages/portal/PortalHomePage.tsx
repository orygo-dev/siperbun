import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DashboardBannerCarousel } from '../../components/dashboard/DashboardBannerCarousel';
import { ListingCard } from '../../components/portal/ListingCard';
import { publicApi } from '../../services/public';
import type { DashboardBanner } from '../../services/settings';
import { cn } from '../../lib/utils';

const AGE_OPTIONS = [
  { value: '', label: 'Semua usia' },
  { value: '0-3', label: '0–3 bln', ageMin: 0, ageMax: 3 },
  { value: '4-6', label: '4–6 bln', ageMin: 4, ageMax: 6 },
  { value: '7-12', label: '7–12 bln', ageMin: 7, ageMax: 12 },
  { value: '13+', label: '>12 bln', ageMin: 13 },
] as const;

const FALLBACK_BANNERS: DashboardBanner[] = [
  {
    id: 'fallback-1',
    title: 'Bibit Bersertifikat',
    subtitle: 'Temukan bibit berkualitas dari penangkar terverifikasi',
    linkUrl: null,
    placement: 'MOBILE',
    sortOrder: 0,
    isActive: true,
    startsAt: null,
    endsAt: null,
    imageFileId: null,
    imageUrl: null,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'fallback-2',
    title: 'Portal Perbenihan',
    subtitle: 'Informasi katalog dan penangkar di Kalimantan Selatan',
    linkUrl: '/portal/penangkar',
    placement: 'MOBILE',
    sortOrder: 1,
    isActive: true,
    startsAt: null,
    endsAt: null,
    imageFileId: null,
    imageUrl: null,
    createdAt: '',
    updatedAt: '',
  },
];

export function PortalHomePage() {
  const [commodityId, setCommodityId] = useState('');
  const [kabupatenId, setKabupatenId] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const commoditiesQ = useQuery({
    queryKey: ['public', 'commodities'],
    queryFn: async () => (await publicApi.commodities()).data.data,
  });
  const kabupatenQ = useQuery({
    queryKey: ['public', 'kabupaten'],
    queryFn: async () => (await publicApi.kabupaten()).data.data,
  });
  const bannersQ = useQuery({
    queryKey: ['public', 'banners', 'MOBILE'],
    queryFn: async () => (await publicApi.banners()).data.data,
  });

  const ageOpt = AGE_OPTIONS.find((o) => o.value === ageRange);

  const params = useMemo(
    () => ({
      commodityId: commodityId || undefined,
      kabupatenId: kabupatenId || undefined,
      ageMin: ageOpt && 'ageMin' in ageOpt ? ageOpt.ageMin : undefined,
      ageMax: ageOpt && 'ageMax' in ageOpt ? ageOpt.ageMax : undefined,
    }),
    [commodityId, kabupatenId, ageOpt],
  );

  const listingsQ = useQuery({
    queryKey: ['public', 'listings', params],
    queryFn: async () => (await publicApi.listings(params)).data.data,
  });

  const items = listingsQ.data ?? [];
  const banners =
    bannersQ.data && bannersQ.data.length > 0
      ? bannersQ.data
      : FALLBACK_BANNERS;
  const activeFilters =
    Number(Boolean(commodityId)) +
    Number(Boolean(kabupatenId)) +
    Number(Boolean(ageRange));

  const commodities = commoditiesQ.data ?? [];
  const kabupatens = kabupatenQ.data ?? [];

  return (
    <div>
      {/* ── Mobile native home ── */}
      <div className="md:hidden">
        <div className="px-4 pt-1">
          <DashboardBannerCarousel items={banners} native />
        </div>

        {/* Search-like filter trigger + chips */}
        <div className="sticky top-[3.25rem] z-30 border-b border-black/[0.04] bg-[#f2f4f3]/95 px-4 py-2.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="flex h-11 w-full items-center gap-2.5 rounded-2xl bg-white px-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04] active:scale-[0.99]"
          >
            <Search size={16} className="shrink-0 text-slate-400" />
            <span className="flex-1 truncate text-[13px] text-slate-500">
              Filter komoditas, wilayah, usia…
            </span>
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <SlidersHorizontal size={15} />
              {activeFilters > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-700 px-1 text-[9px] font-bold text-white">
                  {activeFilters}
                </span>
              )}
            </span>
          </button>

          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Chip
              active={!commodityId && !kabupatenId && !ageRange}
              onClick={() => {
                setCommodityId('');
                setKabupatenId('');
                setAgeRange('');
              }}
            >
              Semua
            </Chip>
            {commodities.slice(0, 8).map((c) => (
              <Chip
                key={c.id}
                active={commodityId === c.id}
                onClick={() =>
                  setCommodityId((v) => (v === c.id ? '' : c.id))
                }
              >
                {c.name}
              </Chip>
            ))}
          </div>
        </div>

        <div className="px-4 pt-3">
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-slate-800">
              {listingsQ.isLoading ? 'Memuat…' : `${items.length} bibit`}
            </span>
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCommodityId('');
                  setKabupatenId('');
                  setAgeRange('');
                }}
                className="text-[12px] font-semibold text-emerald-700"
              >
                Reset filter
              </button>
            )}
          </div>

          {listingsQ.isLoading ? (
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-[18px] bg-white/80"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[18px] bg-white py-16 text-center text-[13px] text-slate-400 ring-1 ring-black/[0.04]">
              Tidak ada bibit untuk filter ini
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {items.map((item) => (
                <ListingCard key={item.id} item={item} compact />
              ))}
            </div>
          )}
        </div>

        {/* Filter bottom sheet */}
        {filterOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Tutup filter"
              onClick={() => setFilterOpen(false)}
            />
            <div
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[24px] bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Filter</h2>
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <FilterSection title="Komoditas">
                <select
                  value={commodityId}
                  onChange={(e) => setCommodityId(e.target.value)}
                  className="h-12 w-full rounded-2xl bg-slate-50 px-3.5 text-sm outline-none ring-1 ring-black/[0.06]"
                >
                  <option value="">Semua komoditas</option>
                  {commodities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FilterSection>

              <FilterSection title="Kabupaten">
                <select
                  value={kabupatenId}
                  onChange={(e) => setKabupatenId(e.target.value)}
                  className="h-12 w-full rounded-2xl bg-slate-50 px-3.5 text-sm outline-none ring-1 ring-black/[0.06]"
                >
                  <option value="">Semua kabupaten</option>
                  {kabupatens.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </FilterSection>

              <FilterSection title="Usia bibit">
                <div className="flex flex-wrap gap-2">
                  {AGE_OPTIONS.map((o) => (
                    <Chip
                      key={o.value || 'all'}
                      active={ageRange === o.value}
                      onClick={() => setAgeRange(o.value)}
                    >
                      {o.label}
                    </Chip>
                  ))}
                </div>
              </FilterSection>

              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-800 text-sm font-semibold text-white active:scale-[0.99]"
              >
                Lihat {items.length} hasil
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop web layout ── */}
      <div className="mx-auto hidden max-w-6xl px-4 py-8 sm:px-6 sm:py-10 md:block">
        <p className="text-sm text-slate-500">Welcome — Portal Publik</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <select
            value={commodityId}
            onChange={(e) => setCommodityId(e.target.value)}
            className="h-10 w-full rounded-lg border-0 bg-white px-3 text-sm text-slate-800 ring-1 ring-black/[0.08] outline-none focus:ring-2 focus:ring-emerald-700/30"
            aria-label="Filter komoditas"
          >
            <option value="">Semua komoditas</option>
            {commodities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={kabupatenId}
            onChange={(e) => setKabupatenId(e.target.value)}
            className="h-10 w-full rounded-lg border-0 bg-white px-3 text-sm text-slate-800 ring-1 ring-black/[0.08] outline-none focus:ring-2 focus:ring-emerald-700/30"
            aria-label="Filter kabupaten"
          >
            <option value="">Semua kabupaten</option>
            {kabupatens.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <select
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            className="h-10 w-full rounded-lg border-0 bg-white px-3 text-sm text-slate-800 ring-1 ring-black/[0.08] outline-none focus:ring-2 focus:ring-emerald-700/30"
            aria-label="Filter usia bibit"
          >
            {AGE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label === '0–3 bln'
                  ? '0–3 bulan'
                  : o.label === '4–6 bln'
                    ? '4–6 bulan'
                    : o.label === '7–12 bln'
                      ? '7–12 bulan'
                      : o.label === '>12 bln'
                        ? '> 12 bulan'
                        : o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-8">
          {listingsQ.isLoading ? (
            <div className="py-20 text-center text-sm text-slate-400">
              Memuat katalog…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl bg-white py-20 text-center text-sm text-slate-400 ring-1 ring-black/[0.06]">
              Tidak ada bibit untuk filter ini.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {items.map((item) => (
                <ListingCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-95',
        active
          ? 'bg-emerald-800 text-white'
          : 'bg-white text-slate-600 ring-1 ring-black/[0.06]',
      )}
    >
      {children}
    </button>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-[13px] font-semibold text-slate-800">{title}</div>
      {children}
    </div>
  );
}
