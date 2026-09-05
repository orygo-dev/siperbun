import {
  FINDING_STATUS_LABELS,
  FindingStatus,
  PERMISSIONS,
  SEVERITY_LABELS,
  Severity,
} from '@siperbun/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable, type DataTableColumn } from '../../components/tables/DataTable';
import { resolveApiV1 } from '../../lib/api';
import { useDebounce } from '../../hooks/useDebounce';
import {
  findingsApi,
  type InspectionFinding,
} from '../../services/findings';

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-slate-50 text-slate-700 border-slate-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
    CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${colors[severity] ?? colors.MEDIUM}`}
    >
      {SEVERITY_LABELS[severity as keyof typeof SEVERITY_LABELS] ?? severity}
    </span>
  );
}

export function FindingsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const query = useQuery({
    queryKey: ['findings', page, debouncedSearch, status, severity],
    queryFn: async () => {
      const res = await findingsApi.list({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: status || undefined,
        severity: severity || undefined,
      });
      return res.data;
    },
  });

  const columns = useMemo<DataTableColumn<InspectionFinding>[]>(
    () => [
      {
        key: 'findingType',
        header: 'Jenis',
        render: (row) => (
          <span className="font-medium text-slate-800">{row.findingType}</span>
        ),
      },
      {
        key: 'application',
        header: 'Pengajuan',
        render: (row) => row.application?.applicationNumber ?? '—',
      },
      {
        key: 'producer',
        header: 'Penangkar',
        render: (row) => row.application?.producer?.businessName ?? '—',
      },
      {
        key: 'severity',
        header: 'Severity',
        render: (row) => <SeverityBadge severity={row.severity} />,
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'dueDate',
        header: 'Batas',
        render: (row) =>
          row.dueDate ? String(row.dueDate).slice(0, 10) : '—',
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Temuan"
        subtitle="Temuan pemeriksaan dan tindakan perbaikan"
      />
      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        page={page}
        limit={10}
        total={(query.data?.meta?.total as number) ?? 0}
        onPageChange={setPage}
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Cari temuan / pengajuan..."
        loading={query.isLoading}
        emptyTitle="Belum ada temuan"
        emptyDescription="Temuan ditambahkan saat pemeriksaan lapangan."
        filters={
          <>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-border px-3 text-sm"
            >
              <option value="">Semua status</option>
              {Object.values(FindingStatus).map((s) => (
                <option key={s} value={s}>
                  {FINDING_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-border px-3 text-sm"
            >
              <option value="">Semua severity</option>
              {Object.values(Severity).map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABELS[s]}
                </option>
              ))}
            </select>
          </>
        }
        rowActions={(row) => (
          <Link
            to={`/temuan/${row.id}`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Eye className="h-4 w-4" /> Detail
          </Link>
        )}
      />
    </div>
  );
}

export function FindingDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [description, setDescription] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');

  const query = useQuery({
    queryKey: ['findings', id],
    queryFn: async () => (await findingsApi.get(id!)).data.data,
    enabled: !!id,
  });

  const onError = (err: unknown) => {
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? 'Gagal memproses';
    toast.error(message);
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['findings', id] });
    qc.invalidateQueries({ queryKey: ['findings'] });
  };

  const uploadMutation = useMutation({
    mutationFn: (file?: File) => {
      const fd = new FormData();
      fd.append('description', description);
      if (evidenceNotes) fd.append('evidenceNotes', evidenceNotes);
      if (file) fd.append('file', file);
      return findingsApi.addCorrectiveAction(id!, fd);
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      setDescription('');
      setEvidenceNotes('');
      invalidate();
    },
    onError,
  });

  const verifyMutation = useMutation({
    mutationFn: ({
      actionId,
      decision,
    }: {
      actionId: string;
      decision: 'ACCEPTED' | 'REJECTED';
    }) =>
      findingsApi.verifyCorrectiveAction(id!, actionId, {
        decision,
        notes: verifyNotes || null,
      }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setVerifyNotes('');
      invalidate();
    },
    onError,
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const f = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={f.findingType}
        subtitle={f.application?.applicationNumber}
        actions={
          <Link
            to="/temuan"
            className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
          >
            Kembali
          </Link>
        }
      />

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <div className="mb-3 flex flex-wrap gap-2">
          <SeverityBadge severity={f.severity} />
          <StatusBadge status={f.status} />
        </div>
        <p className="text-sm">{f.description}</p>
        {f.recommendation ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Rekomendasi: {f.recommendation}
          </p>
        ) : null}
        {f.application ? (
          <p className="mt-2 text-sm">
            Pengajuan:{' '}
            <Link
              to={`/pengajuan/${f.application.id}`}
              className="text-primary hover:underline"
            >
              {f.application.applicationNumber}
            </Link>
          </p>
        ) : null}
        {f.inspection ? (
          <p className="mt-1 text-sm">
            Pemeriksaan:{' '}
            <Link
              to={`/pemeriksaan/${f.inspection.id}`}
              className="text-primary hover:underline"
            >
              Buka
            </Link>
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold">Tindakan Perbaikan</h3>
        <ul className="mb-4 space-y-3">
          {(f.correctiveActions ?? []).map((ca) => (
            <li
              key={ca.id}
              className="rounded-lg border border-border p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={ca.status} />
                <span className="text-xs text-[var(--text-secondary)]">
                  {new Date(ca.createdAt).toLocaleString('id-ID')}
                </span>
              </div>
              <p className="mt-1">{ca.description}</p>
              {ca.evidenceNotes ? (
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {ca.evidenceNotes}
                </p>
              ) : null}
              {ca.file ? (
                <a
                  href={`${resolveApiV1()}/files/${ca.file.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-primary hover:underline"
                >
                  {ca.file.originalName}
                </a>
              ) : null}
              {ca.status === FindingStatus.WAITING_VERIFICATION ? (
                <PermissionGuard
                  permission={[
                    PERMISSIONS.INSPECTION_EXECUTE,
                    PERMISSIONS.APPLICATION_VERIFY,
                  ]}
                  mode="any"
                >
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        verifyMutation.mutate({
                          actionId: ca.id,
                          decision: 'ACCEPTED',
                        })
                      }
                      disabled={verifyMutation.isPending}
                      className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white disabled:opacity-60"
                    >
                      Terima
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        verifyMutation.mutate({
                          actionId: ca.id,
                          decision: 'REJECTED',
                        })
                      }
                      disabled={verifyMutation.isPending}
                      className="h-9 rounded-lg bg-red-600 px-3 text-xs font-medium text-white disabled:opacity-60"
                    >
                      Tolak
                    </button>
                  </div>
                </PermissionGuard>
              ) : null}
            </li>
          ))}
        </ul>

        <PermissionGuard
          permission={[
            PERMISSIONS.INSPECTION_EXECUTE,
            PERMISSIONS.APPLICATION_CREATE,
            PERMISSIONS.APPLICATION_VERIFY,
          ]}
          mode="any"
        >
          <div className="space-y-2 border-t border-border pt-4">
            <h4 className="text-sm font-medium">Unggah Bukti Perbaikan</h4>
            <textarea
              rows={2}
              placeholder="Deskripsi perbaikan"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <textarea
              rows={2}
              placeholder="Catatan bukti (opsional)"
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <textarea
              rows={1}
              placeholder="Catatan verifikasi (untuk aksi verifikasi)"
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                id="corrective-file"
                className="text-sm"
              />
              <button
                type="button"
                disabled={uploadMutation.isPending || !description}
                onClick={() => {
                  const input = document.getElementById(
                    'corrective-file',
                  ) as HTMLInputElement | null;
                  const file = input?.files?.[0];
                  uploadMutation.mutate(file);
                }}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                Kirim Bukti
              </button>
            </div>
          </div>
        </PermissionGuard>
      </div>
    </div>
  );
}
