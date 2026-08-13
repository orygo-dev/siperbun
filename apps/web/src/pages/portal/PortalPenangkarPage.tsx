import { useQuery } from '@tanstack/react-query';
import { ChevronRight, LocateFixed, MapPin, Phone, Search, Sprout } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../../services/public';
import { cn } from '../../lib/utils';

export function PortalPenangkarPage() {
  const [search, setSearch] = useState('');
  const [kabupatenId, setKabupatenId] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const kabupatenQ = useQuery({
    queryKey: ['public', 'kabupaten'],
    queryFn: async () => (await publicApi.kabupaten()).data.data,
  });

  const params = useMemo(
    () => ({
      search: search || undefined,
      kabupatenId: kabupatenId || undefined,
      lat: coords?.lat,
      lng: coords?.lng,
      limit: 40,
    }),
    [search, kabupatenId, coords],
  );

  const producersQ = useQuery({
    queryKey: ['public', 'producers', params],
    queryFn: async () => (await publicApi.producers(params)).data.data,
  });

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }

  const items = producersQ.data ?? [];

  return (
    <div>
      {/* Mobile */}
      <div className="md:hidden">
        <div className="px-4 pt-3">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
            Penangkar
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Temukan penangkar terverifikasi di dekat Anda
          </p>
        </div>

        <div className="sticky top-[3.25rem] z-30 mt-3 space-y-2 border-b border-black/[0.04] bg-[#f2f4f3]/95 px-4 py-2.5 backdrop-blur-xl">
          <div className="flex h-11 items-center gap-2 rounded-2xl bg-white px-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama usaha…"
              className="h-full w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={kabupatenId}
              onChange={(e) => setKabupatenId(e.target.value)}
              className="h-10 flex-1 rounded-2xl bg-white px-3 text-[12px] font-medium outline-none ring-1 ring-black/[0.04]"
            >
              <option value="">Semua kabupaten</option>
              {(kabupatenQ.data ?? []).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={useMyLocation}
              className={cn(
                'flex h-10 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-[12px] font-semibold active:scale-95',
                coords
                  ? 'bg-emerald-800 text-white'
                  : 'bg-white text-emerald-800 ring-1 ring-black/[0.04]',
              )}
            >
              <LocateFixed size={14} />
              {coords ? 'Terdekat' : 'Lokasi'}
            </button>
          </div>
        </div>

        <div className="px-4 pt-3">
          {producersQ.isLoading ? (
            <p className="py-16 text-center text-[13px] text-slate-400">Memuat…</p>
          ) : items.length === 0 ? (
            <div className="rounded-[18px] bg-white py-16 text-center text-[13px] text-slate-400 ring-1 ring-black/[0.04]">
              Belum ada penangkar
            </div>
          ) : (
            <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]">
              {items.map((p, i) => (
                <Link
                  key={p.id}
                  to={`/portal/penangkar/${p.id}`}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-3.5 active:bg-slate-50',
                    i > 0 && 'border-t border-slate-100',
                  )}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Sprout size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-slate-900">
                      {p.businessName}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[12px] text-slate-500">
                      <MapPin size={11} className="shrink-0" />
                      <span className="truncate">
                        {[p.kecamatan, p.kabupaten].filter(Boolean).join(', ') ||
                          'Lokasi belum lengkap'}
                        {p.distanceKm != null ? ` · ${p.distanceKm} km` : ''}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-emerald-700">
                      {p.listingCount} bibit tersedia
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-300" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-6xl px-4 py-10 sm:px-6 md:block">
        <h1 className="text-3xl font-semibold text-emerald-950 sm:text-4xl">
          Penangkar Terdekat
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Daftar penangkar aktif yang terverifikasi. Aktifkan lokasi untuk mengurutkan
          berdasarkan jarak.
        </p>

        <div className="mt-8 grid gap-3 rounded-2xl border border-emerald-900/10 bg-white p-4 sm:grid-cols-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama usaha / pemilik..."
            className="h-11 rounded-xl border border-emerald-900/10 bg-[#f7faf8] px-3 text-sm outline-none focus:border-emerald-700 sm:col-span-2"
          />
          <select
            value={kabupatenId}
            onChange={(e) => setKabupatenId(e.target.value)}
            className="h-11 rounded-xl border border-emerald-900/10 bg-[#f7faf8] px-3 text-sm"
          >
            <option value="">Semua kabupaten</option>
            {(kabupatenQ.data ?? []).map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={useMyLocation}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-900 text-sm font-semibold text-white sm:col-span-3"
          >
            <LocateFixed size={16} />
            {coords ? 'Lokasi aktif — diurutkan terdekat' : 'Gunakan lokasi saya'}
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {producersQ.isLoading ? (
            <p className="py-12 text-center text-sm text-slate-500">Memuat penangkar...</p>
          ) : items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-emerald-900/15 bg-white py-12 text-center text-sm text-slate-500">
              Belum ada penangkar aktif yang dapat ditampilkan.
            </p>
          ) : (
            items.map((p) => (
              <Link
                key={p.id}
                to={`/portal/penangkar/${p.id}`}
                className="flex flex-col gap-3 rounded-2xl border border-emerald-900/10 bg-white p-5 transition hover:border-emerald-700/25 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="text-base font-semibold text-emerald-950">
                    {p.businessName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{p.ownerName}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin size={12} />
                    {[p.kecamatan, p.kabupaten].filter(Boolean).join(', ') ||
                      'Lokasi belum lengkap'}
                    {p.distanceKm != null ? ` · ${p.distanceKm} km` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">
                    <Sprout size={12} /> {p.listingCount} bibit
                  </span>
                  {p.phone && (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Phone size={12} /> {p.phone}
                    </span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
