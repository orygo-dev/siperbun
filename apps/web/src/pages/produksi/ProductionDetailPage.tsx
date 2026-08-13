import {
  PERMISSIONS,
  ProductionStatus,
  PRODUCTION_STATUS_LABELS,
} from '@siperbun/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { productionApi } from '../../services/production';

export function ProductionDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [logForm, setLogForm] = useState({
    stage: '',
    activity: '',
    condition: '',
    notes: '',
    activeCount: '',
    grownCount: '',
    deadCount: '',
    readyCount: '',
  });
  const [newStatus, setNewStatus] = useState('');

  const query = useQuery({
    queryKey: ['production-batches', id],
    queryFn: async () => (await productionApi.get(id!)).data.data,
    enabled: !!id,
  });

  const logMutation = useMutation({
    mutationFn: () =>
      productionApi.addLog(id!, {
        stage: logForm.stage,
        activity: logForm.activity,
        condition: logForm.condition || null,
        notes: logForm.notes || null,
        ...(logForm.activeCount
          ? { activeCount: Number(logForm.activeCount) }
          : {}),
        ...(logForm.grownCount
          ? { grownCount: Number(logForm.grownCount) }
          : {}),
        ...(logForm.deadCount ? { deadCount: Number(logForm.deadCount) } : {}),
        ...(logForm.readyCount
          ? { readyCount: Number(logForm.readyCount) }
          : {}),
      }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setLogForm({
        stage: '',
        activity: '',
        condition: '',
        notes: '',
        activeCount: '',
        grownCount: '',
        deadCount: '',
        readyCount: '',
      });
      qc.invalidateQueries({ queryKey: ['production-batches', id] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal menambah log';
      toast.error(message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: () => productionApi.changeStatus(id!, { status: newStatus }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setNewStatus('');
      qc.invalidateQueries({ queryKey: ['production-batches', id] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal mengubah status';
      toast.error(message);
    },
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const b = query.data;
  const countCard = (label: string, value: number) => (
    <div className="rounded-lg border border-border bg-slate-50 px-4 py-3">
      <div className="text-xs text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-800">
        {value.toLocaleString('id-ID')}
      </div>
    </div>
  );

  const row = (label: string, value?: string | number | null) => (
    <div className="border-b border-border py-2.5 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
      <dd className="mt-0.5 text-sm sm:col-span-2 sm:mt-0">{value ?? '—'}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={b.batchNumber}
        subtitle={b.producer?.businessName}
        actions={
          <>
            <Link
              to="/produksi"
              className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
            >
              Kembali
            </Link>
            <PermissionGuard permission={PERMISSIONS.PRODUCTION_UPDATE}>
              <Link
                to={`/produksi/${b.id}/edit`}
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
          <StatusBadge status={b.status} />
        </div>
        <dl>
          {row('Penangkar', b.producer?.businessName)}
          {row('Komoditas', b.commodity?.name)}
          {row('Varietas', b.variety?.name)}
          {row('Lokasi', b.nursery?.name)}
          {row('Sumber Benih', b.seedSource?.lotNumber)}
          {row(
            'Tanggal Mulai',
            b.startedAt ? String(b.startedAt).slice(0, 10) : null,
          )}
          {row('Catatan', b.notes)}
        </dl>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {countCard('Awal', b.initialCount)}
        {countCard('Tumbuh', b.grownCount)}
        {countCard('Mati', b.deadCount)}
        {countCard('Ditolak', b.rejectedCount)}
        {countCard('Aktif', b.activeCount)}
        {countCard('Siap', b.readyCount)}
      </div>

      <PermissionGuard permission={PERMISSIONS.PRODUCTION_UPDATE}>
        <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
          <h3 className="mb-3 text-sm font-semibold">Ubah Status</h3>
          <div className="flex flex-wrap gap-2">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="h-10 rounded-lg border border-border px-3 text-sm"
            >
              <option value="">Pilih status...</option>
              {Object.values(ProductionStatus).map((s) => (
                <option key={s} value={s}>
                  {PRODUCTION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!newStatus || statusMutation.isPending}
              onClick={() => statusMutation.mutate()}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              Simpan Status
            </button>
          </div>
        </div>
      </PermissionGuard>

      <PermissionGuard permission={PERMISSIONS.PRODUCTION_UPDATE}>
        <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
          <h3 className="mb-3 text-sm font-semibold">Tambah Log Produksi</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Tahap *"
              value={logForm.stage}
              onChange={(e) =>
                setLogForm((f) => ({ ...f, stage: e.target.value }))
              }
              className="h-10 rounded-lg border border-border px-3 text-sm"
            />
            <input
              placeholder="Aktivitas *"
              value={logForm.activity}
              onChange={(e) =>
                setLogForm((f) => ({ ...f, activity: e.target.value }))
              }
              className="h-10 rounded-lg border border-border px-3 text-sm"
            />
            <input
              placeholder="Kondisi"
              value={logForm.condition}
              onChange={(e) =>
                setLogForm((f) => ({ ...f, condition: e.target.value }))
              }
              className="h-10 rounded-lg border border-border px-3 text-sm"
            />
            <input
              placeholder="Catatan"
              value={logForm.notes}
              onChange={(e) =>
                setLogForm((f) => ({ ...f, notes: e.target.value }))
              }
              className="h-10 rounded-lg border border-border px-3 text-sm"
            />
            <input
              type="number"
              placeholder="Update jumlah aktif"
              value={logForm.activeCount}
              onChange={(e) =>
                setLogForm((f) => ({ ...f, activeCount: e.target.value }))
              }
              className="h-10 rounded-lg border border-border px-3 text-sm"
            />
            <input
              type="number"
              placeholder="Update jumlah tumbuh"
              value={logForm.grownCount}
              onChange={(e) =>
                setLogForm((f) => ({ ...f, grownCount: e.target.value }))
              }
              className="h-10 rounded-lg border border-border px-3 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={
              !logForm.stage || !logForm.activity || logMutation.isPending
            }
            onClick={() => logMutation.mutate()}
            className="mt-3 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            Simpan Log
          </button>
        </div>
      </PermissionGuard>

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold">Timeline Log</h3>
        {(b.logs ?? []).length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Belum ada log.</p>
        ) : (
          <ul className="space-y-3">
            {(b.logs ?? []).map((log) => (
              <li
                key={log.id}
                className="border-l-2 border-primary/40 pl-3 text-sm"
              >
                <div className="font-medium text-slate-800">
                  {log.stage} — {log.activity}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {new Date(log.loggedAt).toLocaleString('id-ID')}
                  {log.user?.name ? ` · ${log.user.name}` : ''}
                  {log.condition ? ` · ${log.condition}` : ''}
                </div>
                {log.notes ? (
                  <div className="mt-0.5 text-xs text-slate-600">{log.notes}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
