import {
  PERMISSIONS,
  REPORT_TYPE_LABELS,
  REPORT_TYPES,
  type ReportType,
} from '@siperbun/shared';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { DataTable, type DataTableColumn } from '../../components/tables/DataTable';
import { reportsApi } from '../../services/reports';
import { useAuthStore } from '../../stores/authStore';

const SUMMARY_LABELS: Record<string, string> = {
  producers: 'Penangkar',
  productionBatches: 'Batch Produksi',
  applications: 'Pengajuan',
  fieldInspections: 'Pemeriksaan',
  certificates: 'Sertifikat',
  seedDistributions: 'Distribusi Bibit',
  circulationInspections: 'Pengawasan',
  seedLabels: 'Label',
};

export function ReportsHubPage() {
  const summaryQuery = useQuery({
    queryKey: ['reports-summary'],
    queryFn: async () => {
      const res = await reportsApi.summary();
      return res.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        subtitle="Ringkasan dan ekspor data operasional"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(summaryQuery.data ?? {}).map(([key, value]) => (
          <div
            key={key}
            className="rounded-xl border border-border bg-white p-4 shadow-soft"
          >
            <div className="text-xs text-[var(--text-secondary)]">
              {SUMMARY_LABELS[key] ?? key}
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {Number(value).toLocaleString('id-ID')}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map((type) => (
          <Link
            key={type}
            to={`/laporan/${type}`}
            className="rounded-xl border border-border bg-white p-5 shadow-soft transition hover:border-primary/40 hover:shadow-md"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              {REPORT_TYPE_LABELS[type]}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Lihat tabel dan ekspor CSV
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ReportDetailPage() {
  const { type = '' } = useParams();
  const hasExport = useAuthStore((s) =>
    s.hasPermission(PERMISSIONS.REPORT_EXPORT),
  );
  const [page, setPage] = useState(1);
  const [year, setYear] = useState('2026');
  const [exporting, setExporting] = useState(false);

  const validType = (REPORT_TYPES as readonly string[]).includes(type)
    ? (type as ReportType)
    : null;

  const query = useQuery({
    queryKey: ['report', type, page, year],
    enabled: !!validType,
    queryFn: async () => {
      const res = await reportsApi.get(type, {
        page,
        limit: 20,
        year: year || undefined,
      });
      return res.data;
    },
  });

  const columns = useMemo<DataTableColumn<Record<string, unknown> & { id: string }>[]>(
    () =>
      (query.data?.data.columns ?? []).map((col) => ({
        key: col.key,
        header: col.label,
        render: (row) => String(row[col.key] ?? '—'),
      })),
    [query.data?.data.columns],
  );

  const rows = useMemo(
    () =>
      (query.data?.data.items ?? []).map((item, idx) => ({
        id: String(item.id ?? idx),
        ...item,
      })),
    [query.data?.data.items],
  );

  async function handleExport() {
    if (!validType) return;
    try {
      setExporting(true);
      const res = await reportsApi.exportCsv(type, { year: year || undefined });
      const blob = new Blob([res.data], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV berhasil diunduh');
    } catch {
      toast.error('Gagal mengekspor CSV');
    } finally {
      setExporting(false);
    }
  }

  if (!validType) {
    return <div className="text-sm text-danger">Jenis laporan tidak dikenal</div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={REPORT_TYPE_LABELS[validType]}
        subtitle="Filter dan ekspor data laporan"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/laporan" className="text-sm text-primary hover:underline">
              Kembali
            </Link>
            {hasExport && (
              <PermissionGuard permission={PERMISSIONS.REPORT_EXPORT}>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {exporting ? 'Mengekspor...' : 'Ekspor CSV'}
                </button>
              </PermissionGuard>
            )}
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        page={page}
        limit={20}
        total={(query.data?.meta?.total as number) ?? 0}
        onPageChange={setPage}
        loading={query.isLoading}
        emptyTitle="Tidak ada data"
        emptyDescription="Tidak ada baris untuk filter ini."
        filters={
          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-border px-3 text-sm"
          >
            <option value="">Semua tahun</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        }
      />
    </div>
  );
}
