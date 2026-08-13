import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Phone } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { publicApi, publicAssetUrl } from '../../services/public';

export function PortalBibitDetailPage() {
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['public', 'listing', id],
    queryFn: async () => (await publicApi.listing(id)).data.data,
    enabled: !!id,
  });

  if (query.isLoading) {
    return <div className="py-20 text-center text-sm text-slate-500">Memuat detail...</div>;
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-slate-600">Bibit tidak ditemukan atau belum dipublikasikan.</p>
        <Link to="/portal" className="mt-4 inline-block text-sm font-semibold text-emerald-800">
          Kembali ke katalog
        </Link>
      </div>
    );
  }

  const item = query.data;
  const cover = publicAssetUrl(item.coverUrl);
  const photos = item.photos.length
    ? item.photos
    : cover
      ? [{ id: 'cover', url: item.coverUrl!, caption: null, isCover: true }]
      : [];

  return (
    <div>
      {/* Mobile native detail */}
      <div className="md:hidden">
        <div className="relative">
          <div className="aspect-[4/3] bg-slate-100">
            {cover ? (
              <img src={cover} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-300">
                Tidak ada foto
              </div>
            )}
          </div>
          <Link
            to="/portal"
            className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md active:scale-95"
            style={{ marginTop: 'env(safe-area-inset-top)' }}
            aria-label="Kembali"
          >
            <ArrowLeft size={18} />
          </Link>
        </div>

        <div className="px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4">
          <p className="text-[12px] font-semibold text-emerald-700">
            {item.commodity.name}
            {item.variety ? ` · ${item.variety.name}` : ''}
          </p>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-slate-900">
            {item.title}
          </h1>
          {item.description && (
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              {item.description}
            </p>
          )}

          <div className="mt-4 overflow-hidden rounded-[18px] bg-white ring-1 ring-black/[0.04]">
            {item.availableQty != null && (
              <Row label="Ketersediaan" value={`${item.availableQty.toLocaleString('id-ID')} ${item.unit}`} />
            )}
            {item.ageMonths != null && (
              <Row label="Usia bibit" value={`${item.ageMonths} bulan`} bordered />
            )}
            {item.priceHint && (
              <Row label="Harga" value={item.priceHint} bordered />
            )}
            <Row
              label="Lokasi"
              value={
                [item.producer.desa, item.producer.kecamatan, item.producer.kabupaten]
                  .filter(Boolean)
                  .join(', ') || '—'
              }
              bordered
            />
          </div>

          {photos.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100"
                >
                  <img
                    src={publicAssetUrl(p.url) ?? undefined}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          <Link
            to={`/portal/penangkar/${item.producer.id}`}
            className="mt-4 flex items-center gap-3 rounded-[18px] bg-white p-3.5 ring-1 ring-black/[0.04] active:bg-slate-50"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <MapPin size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold text-slate-900">
                {item.producer.businessName}
              </div>
              <div className="truncate text-[12px] text-slate-500">
                {item.producer.ownerName}
              </div>
            </div>
          </Link>
        </div>

        {item.producer.phone && (
          <div
            className="fixed inset-x-0 bottom-0 z-50 border-t border-black/[0.06] bg-white/95 px-4 pt-3 backdrop-blur-xl"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <a
              href={`tel:${item.producer.phone}`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-800 text-sm font-semibold text-white active:scale-[0.99]"
            >
              <Phone size={16} /> Hubungi penangkar
            </a>
          </div>
        )}
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-6xl px-4 py-10 sm:px-6 md:block">
        <Link
          to="/portal"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-800"
        >
          <ArrowLeft size={16} /> Kembali ke katalog
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50">
              {cover ? (
                <img src={cover} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-emerald-800/40">
                  Tidak ada foto
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {photos.map((p) => (
                  <div
                    key={p.id}
                    className="aspect-square overflow-hidden rounded-xl bg-emerald-50"
                  >
                    <img
                      src={publicAssetUrl(p.url) ?? undefined}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {item.commodity.name}
              {item.variety ? ` · ${item.variety.name}` : ''}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-emerald-950">{item.title}</h1>
            {item.description && (
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{item.description}</p>
            )}

            <div className="mt-6 grid gap-3 rounded-2xl border border-emerald-900/10 bg-white p-5">
              {item.availableQty != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Ketersediaan</span>
                  <span className="font-semibold text-emerald-950">
                    {item.availableQty.toLocaleString('id-ID')} {item.unit}
                  </span>
                </div>
              )}
              {item.ageMonths != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Usia bibit</span>
                  <span className="font-semibold text-emerald-950">
                    {item.ageMonths} bulan
                  </span>
                </div>
              )}
              {item.priceHint && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Keterangan harga</span>
                  <span className="font-semibold text-emerald-950">{item.priceHint}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Lokasi</span>
                <span className="text-right font-medium text-emerald-950">
                  {[item.producer.desa, item.producer.kecamatan, item.producer.kabupaten]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-900/10 bg-emerald-950 p-5 text-white">
              <p className="text-xs uppercase tracking-wide text-emerald-100/70">Penangkar</p>
              <h2 className="mt-1 text-lg font-semibold">{item.producer.businessName}</h2>
              <p className="mt-1 text-sm text-emerald-100/80">{item.producer.ownerName}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {item.producer.phone && (
                  <a
                    href={`tel:${item.producer.phone}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm"
                  >
                    <Phone size={14} /> {item.producer.phone}
                  </a>
                )}
                <Link
                  to={`/portal/penangkar/${item.producer.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-emerald-950"
                >
                  <MapPin size={14} /> Profil penangkar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bordered,
}: {
  label: string;
  value: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-3 px-3.5 py-3 text-[13px] ${
        bordered ? 'border-t border-slate-100' : ''
      }`}
    >
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}
