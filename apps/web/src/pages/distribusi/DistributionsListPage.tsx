import { PERMISSIONS } from '@siperbun/shared';
import { useQuery } from '@tanstack/react-query';
import { Eye, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { DataTable, type DataTableColumn } from '../../components/tables/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import {
  seedDistributionsApi,
  type SeedDistribution,
} from '../../services/seedDistributions';

export function DistributionsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);

  const query = useQuery({
    queryKey: ['seed-distributions', page, debounced, 'own'],
    queryFn: async () => {
      const res = await seedDistributionsApi.list({
        page,
        limit: 10,
        search: debounced || undefined,
      });
      return res.data;
    },
  });

  const columns = useMemo<DataTableColumn<SeedDistribution>[]>(
    () => [
      {
        key: 'buyer',
        header: 'Pembeli',
        render: (row) => (
          <span className="font-medium text-slate-800">{row.buyerName}</span>
        ),
      },
      {
        key: 'destination',
        header: 'Kabupaten tujuan',
        render: (row) => row.destinationKab ?? '—',
      },
      {
        key: 'quantity',
        header: 'Jumlah',
        render: (row) => `${row.quantity.toLocaleString('id-ID')} batang`,
      },
      {
        key: 'date',
        header: 'Tanggal',
        render: (row) => String(row.distributedAt).slice(0, 10),
      },
    ],
    [],
  );

  return (
    <PermissionGuard
      permission={PERMISSIONS.DISTRIBUTION_VIEW}
      fallback={
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Anda tidak memiliki akses ke distribusi bibit.
        </div>
      }
    >
    <div>
      <PageHeader
        title="Distribusi Bibit"
        subtitle="Catat penjualan atau penyaluran bibit ke pembeli"
        actions={
          <PermissionGuard permission={PERMISSIONS.DISTRIBUTION_CREATE}>
            <Link
              to="/distribusi/tambah"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Catat distribusi
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
        emptyTitle="Belum ada distribusi"
        emptyDescription="Catat penjualan atau penyaluran bibit ke pembeli di kabupaten tujuan."
        rowActions={(row) => (
          <Link
            to={`/distribusi/${row.id}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" /> Detail
          </Link>
        )}
      />
    </div>
    </PermissionGuard>
  );
}
