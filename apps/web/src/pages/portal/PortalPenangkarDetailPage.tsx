import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Phone } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ListingCard } from '../../components/portal/ListingCard';
import { publicApi } from '../../services/public';

export function PortalPenangkarDetailPage() {
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['public', 'producer', id],
    queryFn: async () => (await publicApi.producer(id)).data.data,
    enabled: !!id,
  });

  if (query.isLoading) {
    return <div className="py-20 text-center text-sm text-slate-500">Memuat profil...</div>;
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-600">
        Penangkar tidak ditemukan.
      </div>
    );
  }

  const p = query.data;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-4 pt-3 md:py-10 sm:px-6">
      <Link
        to="/portal/penangkar"
        className="mb-4 inline-flex items-center gap-2 text-[13px] font-semibold text-emerald-800 md:mb-6 md:text-sm md:font-medium"
      >
        <ArrowLeft size={16} /> Kembali
      </Link>

      <div className="rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03] md:rounded-2xl md:border md:border-emerald-900/10 md:p-8 md:shadow-sm md:ring-0">
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 md:text-3xl md:font-semibold md:text-emerald-950">
          {p.businessName}
        </h1>
        <p className="mt-2 text-sm text-slate-600">Pemilik: {p.ownerName}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} />
            {[p.desa, p.kecamatan, p.kabupaten].filter(Boolean).join(', ') || p.address || '—'}
          </span>
          {p.phone && (
            <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
              <Phone size={14} /> {p.phone}
            </a>
          )}
        </div>
        {p.nurseries.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-emerald-950">Lokasi pembibitan</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {p.nurseries.map((n) => (
                <li key={n.id}>
                  {n.name}
                  {n.address ? ` — ${n.address}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <h2 className="portal-display mt-10 text-2xl font-semibold text-emerald-950">
        Bibit tersedia
      </h2>
      {p.listings.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Belum ada bibit yang dipublikasikan.</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {p.listings.map((item) => (
            <ListingCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
