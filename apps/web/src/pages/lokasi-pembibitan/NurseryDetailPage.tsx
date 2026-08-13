import { PERMISSIONS } from '@siperbun/shared';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { nurseriesApi } from '../../services/nurseries';

export function NurseryDetailPage() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ['nurseries', id],
    queryFn: async () => (await nurseriesApi.get(id!)).data.data,
    enabled: !!id,
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const n = query.data;
  const row = (label: string, value?: string | number | null) => (
    <div className="border-b border-border py-2.5 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
      <dd className="mt-0.5 text-sm sm:col-span-2 sm:mt-0">{value ?? '—'}</dd>
    </div>
  );

  return (
    <div>
      <PageHeader
        title={n.name}
        subtitle={n.producer?.businessName}
        actions={
          <>
            <Link
              to="/lokasi-pembibitan"
              className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
            >
              Kembali
            </Link>
            <PermissionGuard permission={PERMISSIONS.NURSERY_UPDATE}>
              <Link
                to={`/lokasi-pembibitan/${n.id}/edit`}
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
          <StatusBadge status={n.status} />
        </div>
        <dl>
          {row('Penangkar', n.producer?.businessName)}
          {row('Komoditas', n.commodity?.name)}
          {row('Wilayah', n.region?.name)}
          {row('Alamat', n.address)}
          {row('Luas (Ha)', n.areaHa)}
          {row(
            'Kapasitas',
            n.capacity != null ? n.capacity.toLocaleString('id-ID') : null,
          )}
          {row('Sumber Air', n.waterSource)}
          {row('Fasilitas', n.facilities)}
          {row('Latitude', n.latitude)}
          {row('Longitude', n.longitude)}
          {row('Catatan', n.notes)}
        </dl>
      </div>
    </div>
  );
}
