import {
  ApplicationStatus,
  APPLICATION_STATUS_LABELS,
  PERMISSIONS,
} from '@siperbun/shared';
import { useQuery } from '@tanstack/react-query';
import { Eye, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable, type DataTableColumn } from '../../components/tables/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import {
  applicationsApi,
  type CertificationApplication,
} from '../../services/applications';

export function ApplicationsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const query = useQuery({
    queryKey: ['applications', page, debouncedSearch, status],
    queryFn: async () => {
      const res = await applicationsApi.list({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: status || undefined,
      });
      return res.data;
    },
  });

  const columns = useMemo<DataTableColumn<CertificationApplication>[]>(
    () => [
      {
        key: 'applicationNumber',
        header: 'No Pengajuan',
        render: (row) => (
          <span className="font-medium text-slate-800">
            {row.applicationNumber}
          </span>
        ),
      },
      {
        key: 'producer',
        header: 'Penangkar',
        render: (row) => row.producer?.businessName ?? '—',
      },
      {
        key: 'commodity',
        header: 'Komoditas',
        render: (row) => row.commodity?.name ?? '—',
      },
      {
        key: 'seedlingCount',
        header: 'Jumlah Bibit',
        render: (row) => row.seedlingCount.toLocaleString('id-ID'),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <StatusBadge status={row.status} kind="application" />,
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Pengajuan Sertifikasi"
        subtitle="Permohonan sertifikasi bibit perkebunan"
        actions={
          <PermissionGuard permission={PERMISSIONS.APPLICATION_CREATE}>
            <Link
              to="/pengajuan/tambah"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Tambah Pengajuan
            </Link>
          </PermissionGuard>
        }
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
        searchPlaceholder="Cari nomor pengajuan / penangkar..."
        loading={query.isLoading}
        emptyTitle="Belum ada pengajuan"
        emptyDescription="Buat pengajuan sertifikasi untuk memulai."
        filters={
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-border px-3 text-sm"
          >
            <option value="">Semua status</option>
            {Object.values(ApplicationStatus).map((s) => (
              <option key={s} value={s}>
                {APPLICATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        }
        rowActions={(row) => (
          <div className="flex justify-end gap-2">
            <Link
              to={`/pengajuan/${row.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs hover:bg-slate-50"
            >
              <Eye className="h-3.5 w-3.5" /> Detail
            </Link>
          </div>
        )}
      />
    </div>
  );
}
