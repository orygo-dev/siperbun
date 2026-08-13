import { PERMISSIONS } from '@siperbun/shared';
import { useQuery } from '@tanstack/react-query';
import { Eye, Plus, Tags, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { DataTable, type DataTableColumn } from '../../components/tables/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import { cn } from '../../lib/utils';
import {
  seedDistributionsApi,
  type SeedDistribution,
} from '../../services/seedDistributions';
import { seedLabelsApi, type SeedLabel } from '../../services/seedLabels';

export function LabelsHubPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'distribusi' ? 'distribusi' : 'label';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);

  const labelsQuery = useQuery({
    queryKey: ['seed-labels', page, debounced],
    enabled: tab === 'label',
    queryFn: async () => {
      const res = await seedLabelsApi.list({
        page,
        limit: 10,
        search: debounced || undefined,
      });
      return res.data;
    },
  });

  const distQuery = useQuery({
    queryKey: ['seed-distributions', page, debounced],
    enabled: tab === 'distribusi',
    queryFn: async () => {
      const res = await seedDistributionsApi.list({
        page,
        limit: 10,
        search: debounced || undefined,
      });
      return res.data;
    },
  });

  const labelColumns = useMemo<DataTableColumn<SeedLabel>[]>(
    () => [
      {
        key: 'serial',
        header: 'Serial',
        render: (row) => (
          <span className="font-medium text-slate-800">
            {row.serialStart} — {row.serialEnd}
          </span>
        ),
      },
      {
        key: 'certificate',
        header: 'Sertifikat',
        render: (row) => row.certificate?.certificateNumber ?? '—',
      },
      {
        key: 'quantity',
        header: 'Jumlah',
        render: (row) => row.quantity.toLocaleString('id-ID'),
      },
      {
        key: 'remaining',
        header: 'Sisa',
        render: (row) => row.remainingCount.toLocaleString('id-ID'),
      },
      {
        key: 'recipient',
        header: 'Penerima',
        render: (row) => row.recipient ?? '—',
      },
    ],
    [],
  );

  const distColumns = useMemo<DataTableColumn<SeedDistribution>[]>(
    () => [
      {
        key: 'buyer',
        header: 'Pembeli',
        render: (row) => (
          <span className="font-medium text-slate-800">{row.buyerName}</span>
        ),
      },
      {
        key: 'producer',
        header: 'Penangkar',
        render: (row) => row.producer?.businessName ?? '—',
      },
      {
        key: 'destination',
        header: 'Tujuan',
        render: (row) => row.destinationKab ?? '—',
      },
      {
        key: 'quantity',
        header: 'Jumlah',
        render: (row) => row.quantity.toLocaleString('id-ID'),
      },
      {
        key: 'date',
        header: 'Tanggal',
        render: (row) => String(row.distributedAt).slice(0, 10),
      },
    ],
    [],
  );

  function setTab(next: 'label' | 'distribusi') {
    setPage(1);
    setSearch('');
    setParams(next === 'distribusi' ? { tab: 'distribusi' } : {});
  }

  return (
    <div>
      <PageHeader
        title="Label & Distribusi"
        subtitle="Kelola label sertifikat dan distribusi bibit"
        actions={
          <PermissionGuard permission={PERMISSIONS.CERTIFICATE_UPLOAD}>
            <Link
              to={
                tab === 'distribusi'
                  ? '/label-distribusi/distribusi/tambah'
                  : '/label-distribusi/label/tambah'
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Tambah
            </Link>
          </PermissionGuard>
        }
      />

      <div className="mb-4 flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setTab('label')}
          className={cn(
            'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium',
            tab === 'label'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--text-secondary)]',
          )}
        >
          <Tags size={16} /> Label
        </button>
        <button
          type="button"
          onClick={() => setTab('distribusi')}
          className={cn(
            'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium',
            tab === 'distribusi'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--text-secondary)]',
          )}
        >
          <Truck size={16} /> Distribusi Bibit
        </button>
      </div>

      {tab === 'label' ? (
        <DataTable
          columns={labelColumns}
          data={labelsQuery.data?.data ?? []}
          page={page}
          limit={10}
          total={(labelsQuery.data?.meta?.total as number) ?? 0}
          onPageChange={setPage}
          search={search}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          loading={labelsQuery.isLoading}
          emptyTitle="Belum ada label"
          emptyDescription="Tambah label untuk sertifikat aktif."
          rowActions={(row) => (
            <Link
              to={`/label-distribusi/label/${row.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs hover:bg-slate-50"
            >
              <Eye className="h-3.5 w-3.5" /> Detail
            </Link>
          )}
        />
      ) : (
        <DataTable
          columns={distColumns}
          data={distQuery.data?.data ?? []}
          page={page}
          limit={10}
          total={(distQuery.data?.meta?.total as number) ?? 0}
          onPageChange={setPage}
          search={search}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          loading={distQuery.isLoading}
          emptyTitle="Belum ada distribusi"
          emptyDescription="Catat distribusi bibit ke pembeli."
          rowActions={(row) => (
            <Link
              to={`/label-distribusi/distribusi/${row.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs hover:bg-slate-50"
            >
              <Eye className="h-3.5 w-3.5" /> Detail
            </Link>
          )}
        />
      )}
    </div>
  );
}
