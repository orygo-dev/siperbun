import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { seedDistributionsApi } from '../../services/seedDistributions';

export function DistributionDetailPage() {
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['seed-distribution', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await seedDistributionsApi.get(id);
      return res.data.data;
    },
  });

  if (query.isLoading) return <LoadingState />;
  const item = query.data;
  if (!item) {
    return <div className="text-sm text-danger">Distribusi tidak ditemukan</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.buyerName}
        subtitle="Detail distribusi bibit"
        actions={
          <Link
            to="/label-distribusi?tab=distribusi"
            className="text-sm text-primary hover:underline"
          >
            Kembali
          </Link>
        }
      />
      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {[
            ['Penangkar', item.producer?.businessName ?? '—'],
            ['Sertifikat', item.certificate?.certificateNumber ?? '—'],
            ['Batch', item.batch?.batchNumber ?? '—'],
            ['Jumlah', item.quantity.toLocaleString('id-ID')],
            ['Tujuan', item.destinationKab ?? '—'],
            ['Tanggal', String(item.distributedAt).slice(0, 10)],
            ['No. surat jalan', item.deliveryNoteNo ?? '—'],
            ['Alamat pembeli', item.buyerAddress ?? '—'],
            ['Catatan', item.notes ?? '—'],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <dt className="text-xs text-[var(--text-secondary)]">{k}</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
