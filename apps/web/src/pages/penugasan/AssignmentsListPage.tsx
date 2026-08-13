import {
  ASSIGNMENT_STATUS_LABELS,
  AssignmentStatus,
} from '@siperbun/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable, type DataTableColumn } from '../../components/tables/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import {
  assignmentsApi,
  type FieldAssignment,
} from '../../services/assignments';

export function AssignmentsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const query = useQuery({
    queryKey: ['assignments', page, debouncedSearch, status, dateFrom, dateTo],
    queryFn: async () => {
      const res = await assignmentsApi.list({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      return res.data;
    },
  });

  const columns = useMemo<DataTableColumn<FieldAssignment>[]>(
    () => [
      {
        key: 'assignmentNumber',
        header: 'Nomor',
        render: (row) => (
          <span className="font-medium text-slate-800">
            {row.assignmentNumber}
          </span>
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
        key: 'commodity',
        header: 'Komoditas',
        render: (row) => row.application?.commodity?.name ?? '—',
      },
      {
        key: 'inspector',
        header: 'PBT',
        render: (row) => row.inspector?.name ?? '—',
      },
      {
        key: 'scheduledDate',
        header: 'Jadwal',
        render: (row) => (
          <span>
            {String(row.scheduledDate).slice(0, 10)}
            {row.scheduledTime ? ` ${row.scheduledTime}` : ''}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Penugasan PBT"
        subtitle="Jadwal dan penugasan pemeriksaan lapangan"
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
        searchPlaceholder="Cari nomor penugasan / penangkar..."
        loading={query.isLoading}
        emptyTitle="Belum ada penugasan"
        emptyDescription="Penugasan muncul setelah PBT dijadwalkan pada pengajuan."
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
              {Object.values(AssignmentStatus).map((s) => (
                <option key={s} value={s}>
                  {ASSIGNMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-border px-3 text-sm"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-border px-3 text-sm"
            />
          </>
        }
        rowActions={(row) => (
          <Link
            to={`/penugasan/${row.id}`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Eye className="h-4 w-4" /> Detail
          </Link>
        )}
      />
    </div>
  );
}

export function AssignmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['assignments', id],
    queryFn: async () => (await assignmentsApi.get(id!)).data.data,
    enabled: !!id,
  });

  const onError = (err: unknown) => {
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? 'Gagal memproses';
    toast.error(message);
  };

  const confirmMutation = useMutation({
    mutationFn: () => assignmentsApi.confirm(id!),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['assignments', id] });
    },
    onError,
  });

  const startMutation = useMutation({
    mutationFn: () => assignmentsApi.startInspection(id!),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['assignments', id] });
      const inspectionId = res.data.data.inspection?.id;
      if (inspectionId) navigate(`/pemeriksaan/${inspectionId}`);
    },
    onError,
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const a = query.data;
  const canConfirm =
    a.status === AssignmentStatus.SCHEDULED ||
    a.status === AssignmentStatus.RESCHEDULED;
  const canStart = [
    AssignmentStatus.SCHEDULED,
    AssignmentStatus.CONFIRMED,
    AssignmentStatus.EN_ROUTE,
    AssignmentStatus.INSPECTING,
  ].includes(a.status as 'SCHEDULED' | 'CONFIRMED' | 'EN_ROUTE' | 'INSPECTING');

  return (
    <div className="space-y-6">
      <PageHeader
        title={a.assignmentNumber}
        subtitle={a.application?.producer?.businessName}
        actions={
          <Link
            to="/penugasan"
            className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
          >
            Kembali
          </Link>
        }
      />

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <div className="mb-3">
          <StatusBadge status={a.status} />
        </div>
        <dl className="space-y-2 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-[var(--text-secondary)]">Pengajuan</dt>
            <dd className="col-span-2">
              {a.application ? (
                <Link
                  to={`/pengajuan/${a.application.id}`}
                  className="text-primary hover:underline"
                >
                  {a.application.applicationNumber}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-[var(--text-secondary)]">Komoditas</dt>
            <dd className="col-span-2">
              {a.application?.commodity?.name ?? '—'}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-[var(--text-secondary)]">PBT</dt>
            <dd className="col-span-2">{a.inspector?.name ?? '—'}</dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-[var(--text-secondary)]">Jadwal</dt>
            <dd className="col-span-2">
              {String(a.scheduledDate).slice(0, 10)}
              {a.scheduledTime ? ` ${a.scheduledTime}` : ''}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-[var(--text-secondary)]">Lokasi</dt>
            <dd className="col-span-2">{a.locationNotes ?? '—'}</dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-[var(--text-secondary)]">Instruksi</dt>
            <dd className="col-span-2">{a.instructions ?? '—'}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          {canConfirm ? (
            <button
              type="button"
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="h-10 rounded-lg border border-border px-4 text-sm font-medium disabled:opacity-60"
            >
              Konfirmasi
            </button>
          ) : null}
          {canStart && !a.inspection?.isFinalized ? (
            <button
              type="button"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {a.inspection ? 'Lanjut Pemeriksaan' : 'Mulai Pemeriksaan'}
            </button>
          ) : null}
          {a.inspection ? (
            <Link
              to={`/pemeriksaan/${a.inspection.id}`}
              className="h-10 rounded-lg border border-primary px-4 text-sm leading-10 text-primary"
            >
              Lihat Pemeriksaan
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
