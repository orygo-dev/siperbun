import { PERMISSIONS, ProducerStatus } from '@siperbun/shared';
import { useQuery } from '@tanstack/react-query';
import { Eye, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable, type DataTableColumn } from '../../components/tables/DataTable';
import { producersApi, type Producer } from '../../services/producers';
import { regionsApi } from '../../services/regions';
import { useDebounce } from '../../hooks/useDebounce';

export function ProducersListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [kabupatenId, setKabupatenId] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const regionsQuery = useQuery({
    queryKey: ['regions', 'kabupaten'],
    queryFn: async () => {
      const res = await regionsApi.list({ type: 'KABUPATEN', limit: 50 });
      return res.data.data;
    },
  });

  const query = useQuery({
    queryKey: ['producers', page, debouncedSearch, status, kabupatenId],
    queryFn: async () => {
      const res = await producersApi.list({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: status || undefined,
        kabupatenId: kabupatenId || undefined,
      });
      return res.data;
    },
  });

  const columns = useMemo<DataTableColumn<Producer>[]>(
    () => [
      {
        key: 'registrationNumber',
        header: 'No Registrasi',
        render: (row) => (
          <span className="font-medium text-slate-800">{row.registrationNumber}</span>
        ),
      },
      {
        key: 'businessName',
        header: 'Nama Usaha',
        render: (row) => row.businessName,
      },
      {
        key: 'ownerName',
        header: 'Penanggung Jawab',
        render: (row) => row.ownerName,
      },
      {
        key: 'kabupaten',
        header: 'Kabupaten',
        render: (row) => row.kabupaten?.name ?? '—',
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'isActive',
        header: 'Aktif',
        render: (row) => (
          <span
            className={`text-xs font-medium ${row.isActive ? 'text-emerald-700' : 'text-slate-500'}`}
          >
            {row.isActive ? 'Ya' : 'Tidak'}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Penangkar"
        subtitle="Kelola data penangkar bibit perkebunan"
        actions={
          <PermissionGuard permission={PERMISSIONS.PRODUCER_CREATE}>
            <Link
              to="/penangkar/tambah"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Tambah Penangkar
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
        searchPlaceholder="Cari nama / nomor registrasi..."
        loading={query.isLoading}
        emptyTitle="Belum ada penangkar"
        emptyDescription="Tambahkan data penangkar untuk memulai."
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
              {Object.values(ProducerStatus).map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
            <select
              value={kabupatenId}
              onChange={(e) => {
                setKabupatenId(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-border px-3 text-sm"
            >
              <option value="">Semua kabupaten</option>
              {(regionsQuery.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </>
        }
        rowActions={(row) => (
          <div className="flex justify-end gap-2">
            <Link
              to={`/penangkar/${row.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs hover:bg-slate-50"
            >
              <Eye className="h-3.5 w-3.5" /> Detail
            </Link>
            <PermissionGuard permission={PERMISSIONS.PRODUCER_UPDATE}>
              <Link
                to={`/penangkar/${row.id}/edit`}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs hover:bg-slate-50"
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
