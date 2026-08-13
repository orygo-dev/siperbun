import { PERMISSIONS } from '@siperbun/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { seedSourcesApi } from '../../services/seedSources';
import { useAuthStore } from '../../stores/authStore';

export function SeedSourceDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const query = useQuery({
    queryKey: ['seed-sources', id],
    queryFn: async () => (await seedSourcesApi.get(id!)).data.data,
    enabled: !!id,
  });

  const verifyMutation = useMutation({
    mutationFn: () => seedSourcesApi.verify(id!),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['seed-sources', id] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal verifikasi';
      toast.error(message);
    },
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const s = query.data;
  const canVerify =
    s.verificationStatus !== 'VERIFIED' &&
    (hasPermission(PERMISSIONS.PRODUCTION_UPDATE) ||
      hasPermission(PERMISSIONS.APPLICATION_VERIFY));

  const row = (label: string, value?: string | number | null) => (
    <div className="border-b border-border py-2.5 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
      <dd className="mt-0.5 text-sm sm:col-span-2 sm:mt-0">{value ?? '—'}</dd>
    </div>
  );

  return (
    <div>
      <PageHeader
        title={s.lotNumber}
        subtitle={s.producer?.businessName}
        actions={
          <>
            <Link
              to="/sumber-benih"
              className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
            >
              Kembali
            </Link>
            {canVerify ? (
              <button
                type="button"
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
                className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                Verifikasi
              </button>
            ) : null}
            <PermissionGuard permission={PERMISSIONS.PRODUCTION_UPDATE}>
              <Link
                to={`/sumber-benih/${s.id}/edit`}
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
          <StatusBadge status={s.verificationStatus} />
        </div>
        <dl>
          {row('Penangkar', s.producer?.businessName)}
          {row('Komoditas', s.commodity?.name)}
          {row('Varietas', s.variety?.name)}
          {row('Kebun Sumber', s.seedGarden?.name)}
          {row(
            'Jumlah',
            `${s.quantity.toLocaleString('id-ID')} ${s.unit}`,
          )}
          {row(
            'Terpakai',
            `${s.usedQuantity.toLocaleString('id-ID')} ${s.unit}`,
          )}
          {row(
            'Sisa Stok',
            `${s.remainingStock.toLocaleString('id-ID')} ${s.unit}`,
          )}
          {row('Pemasok', s.supplier)}
          {row('No Dokumen Asal', s.originDocumentNumber)}
          {row('No Sertifikat Sumber', s.sourceCertificateNo)}
          {row(
            'Tanggal Diterima',
            s.receivedAt ? String(s.receivedAt).slice(0, 10) : null,
          )}
          {row('Catatan', s.notes)}
        </dl>
      </div>
    </div>
  );
}
