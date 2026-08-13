import { PERMISSIONS } from '@siperbun/shared';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { seedGardensApi } from '../../services/seedGardens';

export function SeedGardenDetailPage() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ['seed-gardens', id],
    queryFn: async () => (await seedGardensApi.get(id!)).data.data,
    enabled: !!id,
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const g = query.data;
  const row = (label: string, value?: string | number | null) => (
    <div className="border-b border-border py-2.5 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
      <dd className="mt-0.5 text-sm sm:col-span-2 sm:mt-0">{value ?? '—'}</dd>
    </div>
  );

  return (
    <div>
      <PageHeader
        title={g.name}
        subtitle={g.commodity?.name}
        actions={
          <>
            <Link
              to="/kebun-sumber"
              className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
            >
              Kembali
            </Link>
            <PermissionGuard permission={PERMISSIONS.SEED_GARDEN_UPDATE}>
              <Link
                to={`/kebun-sumber/${g.id}/edit`}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-medium leading-10 text-white"
              >
                Edit
              </Link>
            </PermissionGuard>
          </>
        }
      />
      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <div className="mb-3">
          <StatusBadge status={g.status} />
        </div>
        <dl>
          {row('Penangkar', g.producer?.businessName)}
          {row('Komoditas', g.commodity?.name)}
          {row('Varietas', g.variety?.name)}
          {row('Wilayah', g.region?.name)}
          {row('Pemilik', g.ownerName)}
          {row('Alamat', g.address)}
          {row('Luas (Ha)', g.areaHa)}
          {row('Tahun Tanam', g.plantingYear)}
          {row('Pohon Induk', g.motherTreeCount)}
          {row(
            'Perkiraan Hasil',
            g.estimatedYield != null
              ? g.estimatedYield.toLocaleString('id-ID')
              : null,
          )}
          {row('No. SK', g.decreeNumber)}
          {row('Tanggal SK', g.decreeDate?.slice(0, 10))}
          {row('Berlaku Hingga', g.validUntil?.slice(0, 10))}
        </dl>
      </div>
    </div>
  );
}
