import { ApplicationStatus, PERMISSIONS } from '@siperbun/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { applicationsApi } from '../../services/applications';
import { usersApi } from '../../services/users';
import { useAuthStore } from '../../stores/authStore';

export function ApplicationDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [notes, setNotes] = useState('');
  const [assignForm, setAssignForm] = useState({
    inspectorId: '',
    scheduledDate: '',
    scheduledTime: '',
    instructions: '',
    locationNotes: '',
  });

  const query = useQuery({
    queryKey: ['applications', id],
    queryFn: async () => (await applicationsApi.get(id!)).data.data,
    enabled: !!id,
  });

  const inspectorsQuery = useQuery({
    queryKey: ['users', 'inspectors'],
    queryFn: async () => (await usersApi.inspectors()).data.data,
    enabled:
      !!id &&
      hasPermission(PERMISSIONS.APPLICATION_ASSIGN) &&
      query.data?.status === ApplicationStatus.WAITING_ASSIGNMENT,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['applications', id] });
    qc.invalidateQueries({ queryKey: ['applications'] });
    qc.invalidateQueries({ queryKey: ['assignments'] });
  };

  const onError = (err: unknown) => {
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? 'Gagal memproses';
    toast.error(message);
  };

  const submitMutation = useMutation({
    mutationFn: () => applicationsApi.submit(id!, { notes: notes || null }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setNotes('');
      invalidate();
    },
    onError,
  });

  const verifyMutation = useMutation({
    mutationFn: () => applicationsApi.verify(id!, { notes: notes || null }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setNotes('');
      invalidate();
    },
    onError,
  });

  const revisionMutation = useMutation({
    mutationFn: () =>
      applicationsApi.requestRevision(id!, { notes: notes || null }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setNotes('');
      invalidate();
    },
    onError,
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      applicationsApi.assignInspector(id!, {
        inspectorId: assignForm.inspectorId,
        scheduledDate: assignForm.scheduledDate,
        scheduledTime: assignForm.scheduledTime || null,
        instructions: assignForm.instructions || null,
        locationNotes: assignForm.locationNotes || null,
      }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setAssignForm({
        inspectorId: '',
        scheduledDate: '',
        scheduledTime: '',
        instructions: '',
        locationNotes: '',
      });
      invalidate();
    },
    onError,
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const a = query.data;
  const canSubmit =
    (a.status === ApplicationStatus.DRAFT ||
      a.status === ApplicationStatus.ADMIN_REVISION_REQUIRED) &&
    (hasPermission(PERMISSIONS.APPLICATION_CREATE) ||
      hasPermission(PERMISSIONS.APPLICATION_VERIFY));
  const canVerify =
    (a.status === ApplicationStatus.ADMIN_REVIEW ||
      a.status === ApplicationStatus.SUBMITTED) &&
    hasPermission(PERMISSIONS.APPLICATION_VERIFY);
  const canRequestRevision =
    a.status === ApplicationStatus.ADMIN_REVIEW &&
    hasPermission(PERMISSIONS.APPLICATION_VERIFY);
  const canAssign =
    a.status === ApplicationStatus.WAITING_ASSIGNMENT &&
    hasPermission(PERMISSIONS.APPLICATION_ASSIGN);
  const canCreateCertificate =
    a.status === ApplicationStatus.INSPECTION_PASSED &&
    !a.certificate &&
    (hasPermission(PERMISSIONS.CERTIFICATE_UPLOAD) ||
      hasPermission(PERMISSIONS.APPLICATION_VERIFY));

  const row = (label: string, value?: ReactNode) => (
    <div className="border-b border-border py-2.5 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
      <dd className="mt-0.5 text-sm sm:col-span-2 sm:mt-0">{value ?? '—'}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={a.applicationNumber}
        subtitle={a.producer?.businessName}
        actions={
          <div className="flex flex-wrap gap-2">
            {canCreateCertificate ? (
              <Link
                to="/sertifikat/tambah"
                className="h-10 rounded-lg bg-primary px-4 text-sm font-medium leading-10 text-white"
              >
                Buat Sertifikat
              </Link>
            ) : null}
            {a.certificate ? (
              <Link
                to={`/sertifikat/${a.certificate.id}`}
                className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
              >
                Lihat Sertifikat
              </Link>
            ) : null}
            <Link
              to="/pengajuan"
              className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
            >
              Kembali
            </Link>
          </div>
        }
      />

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <div className="mb-3">
          <StatusBadge status={a.status} />
        </div>
        <dl>
          {row(
            'Penangkar',
            a.producer ? (
              <Link
                to={`/penangkar/${a.producer.id}`}
                className="text-primary hover:underline"
              >
                {a.producer.businessName}
              </Link>
            ) : null,
          )}
          {row(
            'Batch Produksi',
            a.batch ? (
              <Link
                to={`/produksi/${a.batch.id}`}
                className="text-primary hover:underline"
              >
                {a.batch.batchNumber}
              </Link>
            ) : null,
          )}
          {row('Komoditas', a.commodity?.name)}
          {row('Varietas', a.variety?.name)}
          {row('Lokasi', a.nursery?.name)}
          {row('Jumlah Bibit', a.seedlingCount.toLocaleString('id-ID'))}
          {row(
            'Tanggal Siap',
            a.readyAt ? String(a.readyAt).slice(0, 10) : null,
          )}
          {row(
            'Diajukan',
            a.submittedAt
              ? new Date(a.submittedAt).toLocaleString('id-ID')
              : null,
          )}
          {row('Catatan', a.notes)}
        </dl>
      </div>

      {(canSubmit || canVerify || canRequestRevision) && (
        <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
          <h3 className="mb-3 text-sm font-semibold">Aksi Workflow</h3>
          <textarea
            rows={2}
            placeholder="Catatan aksi (opsional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mb-3 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {canSubmit ? (
              <button
                type="button"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                Ajukan
              </button>
            ) : null}
            {canVerify ? (
              <PermissionGuard permission={PERMISSIONS.APPLICATION_VERIFY}>
                <button
                  type="button"
                  onClick={() => verifyMutation.mutate()}
                  disabled={verifyMutation.isPending}
                  className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-60"
                >
                  Verifikasi Lolos
                </button>
              </PermissionGuard>
            ) : null}
            {canRequestRevision ? (
              <PermissionGuard permission={PERMISSIONS.APPLICATION_VERIFY}>
                <button
                  type="button"
                  onClick={() => revisionMutation.mutate()}
                  disabled={revisionMutation.isPending}
                  className="h-10 rounded-lg border border-orange-300 bg-orange-50 px-4 text-sm font-medium text-orange-700 disabled:opacity-60"
                >
                  Minta Perbaikan
                </button>
              </PermissionGuard>
            ) : null}
          </div>
        </div>
      )}

      {canAssign ? (
        <PermissionGuard permission={PERMISSIONS.APPLICATION_ASSIGN}>
          <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold">Tugaskan PBT</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                  PBT
                </span>
                <select
                  value={assignForm.inspectorId}
                  onChange={(e) =>
                    setAssignForm((f) => ({
                      ...f,
                      inspectorId: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                >
                  <option value="">Pilih PBT</option>
                  {(inspectorsQuery.data ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                  Tanggal
                </span>
                <input
                  type="date"
                  value={assignForm.scheduledDate}
                  onChange={(e) =>
                    setAssignForm((f) => ({
                      ...f,
                      scheduledDate: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                  Jam
                </span>
                <input
                  type="time"
                  value={assignForm.scheduledTime}
                  onChange={(e) =>
                    setAssignForm((f) => ({
                      ...f,
                      scheduledTime: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                  Instruksi
                </span>
                <textarea
                  rows={2}
                  value={assignForm.instructions}
                  onChange={(e) =>
                    setAssignForm((f) => ({
                      ...f,
                      instructions: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                  Catatan Lokasi
                </span>
                <input
                  value={assignForm.locationNotes}
                  onChange={(e) =>
                    setAssignForm((f) => ({
                      ...f,
                      locationNotes: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => assignMutation.mutate()}
              disabled={
                assignMutation.isPending ||
                !assignForm.inspectorId ||
                !assignForm.scheduledDate
              }
              className="mt-3 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              Jadwalkan Pemeriksaan
            </button>
          </div>
        </PermissionGuard>
      ) : null}

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold">Riwayat Status</h3>
        {(a.statusHistory ?? []).length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Belum ada riwayat.
          </p>
        ) : (
          <ul className="space-y-3">
            {(a.statusHistory ?? []).map((h) => (
              <li
                key={h.id}
                className="border-l-2 border-primary/40 pl-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {h.fromStatus ? (
                    <StatusBadge status={h.fromStatus} />
                  ) : (
                    <span className="text-xs text-[var(--text-secondary)]">
                      —
                    </span>
                  )}
                  <span className="text-xs text-[var(--text-secondary)]">→</span>
                  <StatusBadge status={h.toStatus} />
                </div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                  {new Date(h.createdAt).toLocaleString('id-ID')}
                  {h.changedBy?.name ? ` · ${h.changedBy.name}` : ''}
                </div>
                {h.notes ? (
                  <div className="mt-0.5 text-xs text-slate-600">{h.notes}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {(a.assignments ?? []).length > 0 ? (
        <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
          <h3 className="mb-3 text-sm font-semibold">Penugasan PBT</h3>
          <ul className="space-y-2 text-sm">
            {(a.assignments ?? []).map((asg) => (
              <li
                key={asg.id}
                className="flex flex-wrap gap-2 border-b border-border py-2"
              >
                <Link
                  to={`/penugasan/${asg.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {asg.assignmentNumber}
                </Link>
                <span>{asg.inspector?.name}</span>
                <span className="text-[var(--text-secondary)]">
                  {String(asg.scheduledDate).slice(0, 10)}
                  {asg.scheduledTime ? ` ${asg.scheduledTime}` : ''}
                </span>
                <StatusBadge status={asg.status} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
