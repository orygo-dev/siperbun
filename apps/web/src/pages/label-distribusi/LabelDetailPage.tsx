import { PERMISSIONS } from '@siperbun/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { producersApi } from '../../services/producers';
import { seedLabelsApi } from '../../services/seedLabels';

export function LabelDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [distForm, setDistForm] = useState({
    producerId: '',
    quantity: '10',
    notes: '',
  });

  const query = useQuery({
    queryKey: ['seed-label', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await seedLabelsApi.get(id);
      return res.data.data;
    },
  });

  const producersQuery = useQuery({
    queryKey: ['producers', 'options'],
    queryFn: async () => {
      const res = await producersApi.list({ page: 1, limit: 100 });
      return res.data.data ?? [];
    },
  });

  const distMutation = useMutation({
    mutationFn: () =>
      seedLabelsApi.addDistribution(id, {
        producerId: distForm.producerId || null,
        quantity: Number(distForm.quantity),
        notes: distForm.notes || null,
      }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setDistForm({ producerId: '', quantity: '10', notes: '' });
      qc.invalidateQueries({ queryKey: ['seed-label', id] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal mencatat distribusi label';
      toast.error(message);
    },
  });

  if (query.isLoading) return <LoadingState />;
  const item = query.data;
  if (!item) {
    return <div className="text-sm text-danger">Label tidak ditemukan</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Label ${item.serialStart}`}
        subtitle={item.certificate?.certificateNumber ?? 'Detail label'}
        actions={
          <Link to="/label-distribusi" className="text-sm text-primary hover:underline">
            Kembali
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Jumlah', item.quantity],
          ['Terpakai', item.usedCount],
          ['Rusak', item.damagedCount],
          ['Sisa', item.remainingCount],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-border bg-white p-4 shadow-soft"
          >
            <div className="text-xs text-[var(--text-secondary)]">{label}</div>
            <div className="mt-1 text-xl font-semibold">
              {Number(value).toLocaleString('id-ID')}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold">Informasi</h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Serial</dt>
            <dd>
              {item.serialStart} — {item.serialEnd}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Penerima</dt>
            <dd>{item.recipient ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Sertifikat</dt>
            <dd>{item.certificate?.certificateNumber ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Penangkar</dt>
            <dd>{item.certificate?.producer?.businessName ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold">Riwayat Distribusi Label</h3>
        {(item.distributions ?? []).length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Belum ada distribusi</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(item.distributions ?? []).map((d) => (
              <li key={d.id} className="flex justify-between gap-3 py-2">
                <div>
                  <div className="font-medium">
                    {d.producer?.businessName ?? 'Tanpa penangkar'}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {String(d.createdAt).slice(0, 10)}
                  </div>
                </div>
                <div className="font-medium">
                  {d.quantity.toLocaleString('id-ID')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PermissionGuard permission={PERMISSIONS.CERTIFICATE_UPLOAD}>
        <form
          className="space-y-3 rounded-xl border border-border bg-white p-5 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault();
            distMutation.mutate();
          }}
        >
          <h3 className="text-sm font-semibold">Catat Distribusi Label</h3>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Penangkar
            </span>
            <select
              value={distForm.producerId}
              onChange={(e) =>
                setDistForm((f) => ({ ...f, producerId: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            >
              <option value="">Opsional</option>
              {(producersQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.businessName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Jumlah *
            </span>
            <input
              required
              type="number"
              min={1}
              value={distForm.quantity}
              onChange={(e) =>
                setDistForm((f) => ({ ...f, quantity: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={distMutation.isPending}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            Simpan Distribusi
          </button>
        </form>
      </PermissionGuard>
    </div>
  );
}
