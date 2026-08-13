import { PERMISSIONS } from '@siperbun/shared';
import { useQuery } from '@tanstack/react-query';
import { Eye, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable, type DataTableColumn } from '../../components/tables/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import { nurseriesApi, type Nursery } from '../../services/nurseries';

export function NurseriesListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const query = useQuery({
    queryKey: ['nurseries', page, debouncedSearch, status],
    queryFn: async () => {
      const res = await nurseriesApi.list({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: status || undefined,
      });
      return res.data;
    },
  });

  const columns = useMemo<DataTableColumn<Nursery>[]>(
    () => [
      {
        key: 'name',
        header: 'Nama Lokasi',
        render: (row) => <span className="font-medium">{row.name}</span>,
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
        key: 'region',
        header: 'Wilayah',
        render: (row) => row.region?.name ?? '—',
      },
      {
        key: 'capacity',
        header: 'Kapasitas',
        render: (row) =>
          row.capacity != null ? row.capacity.toLocaleString('id-ID') : '—',
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
        title="Lokasi Pembibitan"
        subtitle="Kelola lokasi pembibitan penangkar"
        actions={
          <PermissionGuard permission={PERMISSIONS.NURSERY_CREATE}>
            <Link
              to="/lokasi-pembibitan/tambah"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" /> Tambah Lokasi
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
        loading={query.isLoading}
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
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        }
        rowActions={(row) => (
          <div className="flex justify-end gap-2">
            <Link
              to={`/lokasi-pembibitan/${row.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs"
            >
              <Eye className="h-3.5 w-3.5" /> Detail
            </Link>
            <PermissionGuard permission={PERMISSIONS.NURSERY_UPDATE}>
              <Link
                to={`/lokasi-pembibitan/${row.id}/edit`}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Link>
            </PermissionGuard>
          </div>
        )}
      />
    </div>
  );
}
