import { PERMISSIONS } from '@siperbun/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { producersApi } from '../../services/producers';

export function ProducerDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['producers', id],
    queryFn: async () => {
      const res = await producersApi.get(id!);
      return res.data.data;
    },
    enabled: !!id,
  });

  const action = useMutation({
    mutationFn: async (type: 'verify' | 'activate' | 'deactivate') => {
      if (type === 'verify') return producersApi.verify(id!);
      if (type === 'activate') return producersApi.activate(id!);
      return producersApi.deactivate(id!);
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['producers', id] });
      qc.invalidateQueries({ queryKey: ['producers'] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Aksi gagal';
      toast.error(message);
    },
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const p = query.data;
  const ownershipLabel = p.landOwnershipStatus === 'RENTED'
    ? 'Sewa'
    : p.landOwnershipStatus === 'BORROWED'
      ? 'Pinjam pakai'
      : p.landOwnershipStatus === 'OWNED'
        ? 'Milik sendiri'
        : null;

  const downloadDocument = async (file: { id: string; originalName: string }) => {
    try {
      const response = await producersApi.downloadFile(file.id);
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = file.originalName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Dokumen gagal diunduh');
    }
  };

  const row = (label: string, value?: string | number | null) => (
    <div className="border-b border-border py-2.5 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800 sm:col-span-2 sm:mt-0">
        {value ?? '—'}
      </dd>
    </div>
  );

  return (
    <div>
      <PageHeader
        title={p.businessName}
        subtitle={p.registrationNumber}
        actions={
          <>
            <Link
              to="/penangkar"
              className="h-10 rounded-lg border border-border px-4 text-sm leading-10 hover:bg-slate-50"
            >
              Kembali
            </Link>
            <PermissionGuard permission={PERMISSIONS.PRODUCER_UPDATE}>
              <Link
                to={`/penangkar/${p.id}/edit`}
                className="h-10 rounded-lg border border-border px-4 text-sm leading-10 hover:bg-slate-50"
              >
                Edit
              </Link>
              {p.status !== 'ACTIVE' ? (
                <button
                  type="button"
                  onClick={() => action.mutate('verify')}
                  disabled={action.isPending}
                  className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white"
                >
                  Verifikasi
                </button>
              ) : null}
              {p.isActive ? (
                <button
                  type="button"
                  onClick={() => action.mutate('deactivate')}
                  disabled={action.isPending}
                  className="h-10 rounded-lg border border-border px-4 text-sm hover:bg-slate-50"
                >
                  Nonaktifkan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => action.mutate('activate')}
                  disabled={action.isPending}
                  className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white"
                >
                  Aktifkan
                </button>
              )}
            </PermissionGuard>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5 shadow-soft lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <StatusBadge status={p.status} />
            <span className="text-xs text-[var(--text-secondary)]">
              {p.isActive ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
          <dl>
            {row('Jenis Usaha', p.businessType)}
            {row('Penanggung Jawab', p.ownerName)}
            {row('NIK', p.nik)}
            {row('NIB', p.nib)}
            {row('Telepon', p.phone)}
            {row('Email', p.email)}
            {row('Kabupaten Kantor', p.kabupaten?.name)}
            {row('Kecamatan', p.kecamatan)}
            {row('Desa', p.desa)}
            {row('Alamat Kantor', p.address)}
            {row('Alamat Lokasi Pembibitan', p.nurseryAddress)}
            {row('Kabupaten Lokasi Pembibitan', p.nurseries?.[0]?.region?.name)}
            {row('Status Kepemilikan Lahan', ownershipLabel)}
            {row(
              'Kapasitas Produksi',
              p.productionCapacity != null
                ? p.productionCapacity.toLocaleString('id-ID')
                : null,
            )}
            {row('Catatan', p.notes)}
          </dl>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold">Lokasi Pembibitan</h3>
            {(p.nurseries ?? []).length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">Belum ada data</p>
            ) : (
              <ul className="space-y-2">
                {p.nurseries!.map((n) => (
                  <li key={n.id}>
                    <Link
                      to={`/lokasi-pembibitan/${n.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {n.name}
                    </Link>
                    {n.address ? <p className="mt-0.5 text-xs text-slate-500">{n.address}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold">Dokumen Penangkar</h3>
            {(p.documents ?? []).length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">Belum ada dokumen</p>
            ) : (
              <ul className="space-y-2">
                {p.documents!.map((document) => (
                  <li key={document.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-xs">{document.title}</span>
                    {document.file ? (
                      <button type="button" aria-label={`Unduh ${document.title}`} onClick={() => downloadDocument(document.file!)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
                        <Download size={14} />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold">Kebun Sumber</h3>
            {(p.seedGardens ?? []).length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">Belum ada data</p>
            ) : (
              <ul className="space-y-2">
                {p.seedGardens!.map((g) => (
                  <li key={g.id}>
                    <Link
                      to={`/kebun-sumber/${g.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {g.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
