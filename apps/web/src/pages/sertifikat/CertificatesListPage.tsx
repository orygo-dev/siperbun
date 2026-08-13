import {
  CERTIFICATE_STATUS_LABELS,
  CertificateStatus,
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
  certificatesApi,
  type Certificate,
} from '../../services/certificates';

export function CertificatesListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const query = useQuery({
    queryKey: ['certificates', page, debouncedSearch, status],
    queryFn: async () => {
      const res = await certificatesApi.list({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: status || undefined,
      });
      return res.data;
    },
  });

  const columns = useMemo<DataTableColumn<Certificate>[]>(
    () => [
      {
        key: 'certificateNumber',
        header: 'No Sertifikat',
        render: (row) => (
          <span className="font-medium text-slate-800">
            {row.certificateNumber}
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
        render: (row) => row.application?.commodity?.name ?? '—',
      },
      {
        key: 'certifiedCount',
        header: 'Jumlah',
        render: (row) => row.certifiedCount.toLocaleString('id-ID'),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'issuedAt',
        header: 'Terbit',
        render: (row) =>
          row.issuedAt ? String(row.issuedAt).slice(0, 10) : '—',
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Sertifikat"
        subtitle="Penerbitan dan scan sertifikat"
        actions={
          <PermissionGuard permission={PERMISSIONS.CERTIFICATE_UPLOAD}>
            <Link
              to="/sertifikat/tambah"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Tambah
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
        searchPlaceholder="Cari no sertifikat / penangkar..."
        loading={query.isLoading}
        emptyTitle="Belum ada sertifikat"
        emptyDescription="Buat sertifikat dari pengajuan yang lulus pemeriksaan."
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
            {Object.values(CertificateStatus).map((s) => (
              <option key={s} value={s}>
                {CERTIFICATE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        }
        rowActions={(row) => (
          <div className="flex justify-end gap-2">
            <Link
              to={`/sertifikat/${row.id}`}
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
