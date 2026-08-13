import { PERMISSIONS, ProductionStatus, PRODUCTION_STATUS_LABELS } from '@siperbun/shared';
import { useQuery } from '@tanstack/react-query';
import { Eye, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable, type DataTableColumn } from '../../components/tables/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import { commoditiesApi } from '../../services/commodities';
import { productionApi, type ProductionBatch } from '../../services/production';

export function ProductionListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [commodityId, setCommodityId] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const commoditiesQuery = useQuery({
    queryKey: ['commodities', 'options'],
    queryFn: async () => (await commoditiesApi.list({ limit: 100 })).data.data,
  });

  const query = useQuery({
    queryKey: ['production-batches', page, debouncedSearch, commodityId, status],
    queryFn: async () => {
      const res = await productionApi.list({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        commodityId: commodityId || undefined,
        status: status || undefined,
      });
      return res.data;
    },
  });

  const columns = useMemo<DataTableColumn<ProductionBatch>[]>(
    () => [
      {
        key: 'batchNumber',
        header: 'No Batch',
        render: (row) => (
          <span className="font-medium text-slate-800">{row.batchNumber}</span>
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
        key: 'activeCount',
        header: 'Jumlah Aktif',
        render: (row) => row.activeCount.toLocaleString('id-ID'),
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
        title="Produksi Bibit"
        subtitle="Kelola batch produksi bibit"
        actions={
          <PermissionGuard permission={PERMISSIONS.PRODUCTION_CREATE}>
            <Link
              to="/produksi/tambah"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Tambah Batch
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
        searchPlaceholder="Cari nomor batch / penangkar..."
        loading={query.isLoading}
        emptyTitle="Belum ada batch produksi"
        emptyDescription="Tambahkan batch produksi untuk memulai."
        filters={
          <>
            <select
              value={commodityId}
              onChange={(e) => {
                setCommodityId(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-border px-3 text-sm"
            >
              <option value="">Semua komoditas</option>
              {(commoditiesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-border px-3 text-sm"
            >
              <option value="">Semua status</option>
              {Object.values(ProductionStatus).map((s) => (
                <option key={s} value={s}>
                  {PRODUCTION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </>
        }
        rowActions={(row) => (
          <div className="flex justify-end gap-2">
            <Link
              to={`/produksi/${row.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs hover:bg-slate-50"
            >
              <Eye className="h-3.5 w-3.5" /> Detail
            </Link>
            <PermissionGuard permission={PERMISSIONS.PRODUCTION_UPDATE}>
              <Link
                to={`/produksi/${row.id}/edit`}
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
