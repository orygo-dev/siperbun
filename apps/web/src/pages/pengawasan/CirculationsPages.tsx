import {
  CIRCULATION_FINDING_CATEGORY_LABELS,
  PERMISSIONS,
  type CirculationFindingCategory,
} from '@siperbun/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { DataTable, type DataTableColumn } from '../../components/tables/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import {
  circulationApi,
  type CirculationInspection,
} from '../../services/circulation';

export function CirculationsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);

  const query = useQuery({
    queryKey: ['circulation-inspections', page, debounced],
    queryFn: async () => {
      const res = await circulationApi.list({
        page,
        limit: 10,
        search: debounced || undefined,
      });
      return res.data;
    },
  });

  const columns = useMemo<DataTableColumn<CirculationInspection>[]>(
    () => [
      {
        key: 'number',
        header: 'No. Pengawasan',
        render: (row) => (
          <span className="font-medium text-slate-800">
            {row.inspectionNumber}
          </span>
        ),
      },
      {
        key: 'business',
        header: 'Usaha',
        render: (row) => row.businessName ?? '—',
      },
      {
        key: 'location',
        header: 'Lokasi',
        render: (row) => row.location ?? '—',
      },
      {
        key: 'commodity',
        header: 'Komoditas',
        render: (row) => row.commodityName ?? '—',
      },
      {
        key: 'findings',
        header: 'Temuan',
        render: (row) => row._count?.findings ?? 0,
      },
      {
        key: 'date',
        header: 'Tanggal',
        render: (row) => String(row.inspectedAt).slice(0, 10),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Pengawasan Peredaran"
        subtitle="Pemeriksaan peredaran bibit di lapangan"
        actions={
          <PermissionGuard permission={PERMISSIONS.INSPECTION_EXECUTE}>
            <Link
              to="/pengawasan/tambah"
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
        loading={query.isLoading}
        emptyTitle="Belum ada pengawasan"
        emptyDescription="Catat hasil pengawasan peredaran bibit."
        rowActions={(row) => (
          <Link
            to={`/pengawasan/${row.id}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" /> Detail
          </Link>
        )}
      />
    </div>
  );
}

export function CirculationFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    inspectorName: '',
    inspectedAt: new Date().toISOString().slice(0, 10),
    location: '',
    latitude: '',
    longitude: '',
    businessName: '',
    ownerName: '',
    commodityName: '',
    seedlingCount: '',
    certificateNumber: '',
    actionTaken: '',
    recommendation: '',
    findingCategory: 'OTHER' as CirculationFindingCategory,
    findingDescription: '',
  });

  const mutation = useMutation({
    mutationFn: () =>
      circulationApi.create({
        inspectorName: form.inspectorName || null,
        inspectedAt: form.inspectedAt,
        location: form.location || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        businessName: form.businessName || null,
        ownerName: form.ownerName || null,
        commodityName: form.commodityName || null,
        seedlingCount: form.seedlingCount ? Number(form.seedlingCount) : null,
        certificateNumber: form.certificateNumber || null,
        actionTaken: form.actionTaken || null,
        recommendation: form.recommendation || null,
        findings: form.findingDescription
          ? [
              {
                category: form.findingCategory,
                description: form.findingDescription,
                severity: 'MEDIUM',
              },
            ]
          : [],
      }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      navigate(`/pengawasan/${res.data.data.id}`);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal menyimpan pengawasan';
      toast.error(message);
    },
  });

  return (
    <PermissionGuard permission={PERMISSIONS.INSPECTION_EXECUTE}>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Tambah Pengawasan"
          subtitle="Catat hasil pengawasan peredaran"
          actions={
            <Link to="/pengawasan" className="text-sm text-primary hover:underline">
              Kembali
            </Link>
          }
        />
        <form
          className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Petugas
              </span>
              <input
                value={form.inspectorName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, inspectorName: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Tanggal *
              </span>
              <input
                required
                type="date"
                value={form.inspectedAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, inspectedAt: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Nama usaha
            </span>
            <input
              value={form.businessName}
              onChange={(e) =>
                setForm((f) => ({ ...f, businessName: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Lokasi
            </span>
            <input
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Latitude
              </span>
              <input
                value={form.latitude}
                onChange={(e) =>
                  setForm((f) => ({ ...f, latitude: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Longitude
              </span>
              <input
                value={form.longitude}
                onChange={(e) =>
                  setForm((f) => ({ ...f, longitude: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Komoditas
              </span>
              <input
                value={form.commodityName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, commodityName: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Jumlah bibit
              </span>
              <input
                type="number"
                value={form.seedlingCount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seedlingCount: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
            </label>
          </div>
          <div className="border-t border-border pt-4">
            <h4 className="mb-2 text-sm font-semibold">Temuan (opsional)</h4>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Kategori
              </span>
              <select
                value={form.findingCategory}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    findingCategory: e.target
                      .value as CirculationFindingCategory,
                  }))
                }
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              >
                {Object.entries(CIRCULATION_FINDING_CATEGORY_LABELS).map(
                  ([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Deskripsi temuan
              </span>
              <textarea
                value={form.findingDescription}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    findingDescription: e.target.value,
                  }))
                }
                className="min-h-[80px] w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      </div>
    </PermissionGuard>
  );
}

export function CirculationDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [finding, setFinding] = useState({
    category: 'OTHER' as CirculationFindingCategory,
    description: '',
  });

  const query = useQuery({
    queryKey: ['circulation-inspection', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await circulationApi.get(id);
      return res.data.data;
    },
  });

  const findingMutation = useMutation({
    mutationFn: () =>
      circulationApi.addFinding(id, {
        category: finding.category,
        description: finding.description,
        severity: 'MEDIUM',
      }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setFinding({ category: 'OTHER', description: '' });
      qc.invalidateQueries({ queryKey: ['circulation-inspection', id] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal menambah temuan';
      toast.error(message);
    },
  });

  if (query.isLoading) return <LoadingState />;
  const item = query.data;
  if (!item) {
    return (
      <div className="text-sm text-danger">Pengawasan tidak ditemukan</div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.inspectionNumber}
        subtitle={item.businessName ?? 'Detail pengawasan peredaran'}
        actions={
          <Link to="/pengawasan" className="text-sm text-primary hover:underline">
            Kembali
          </Link>
        }
      />

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {[
            ['Petugas', item.inspectorName ?? '—'],
            ['Tanggal', String(item.inspectedAt).slice(0, 10)],
            ['Lokasi', item.location ?? '—'],
            ['Usaha', item.businessName ?? '—'],
            ['Pemilik', item.ownerName ?? '—'],
            ['Komoditas', item.commodityName ?? '—'],
            [
              'Jumlah bibit',
              item.seedlingCount != null
                ? item.seedlingCount.toLocaleString('id-ID')
                : '—',
            ],
            ['No. sertifikat', item.certificateNumber ?? '—'],
            ['Tindakan', item.actionTaken ?? '—'],
            ['Rekomendasi', item.recommendation ?? '—'],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <dt className="text-xs text-[var(--text-secondary)]">{k}</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold">Temuan</h3>
        {(item.findings ?? []).length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Belum ada temuan</p>
        ) : (
          <ul className="space-y-3">
            {(item.findings ?? []).map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-border bg-slate-50 p-3 text-sm"
              >
                <div className="font-medium">
                  {CIRCULATION_FINDING_CATEGORY_LABELS[
                    f.category as CirculationFindingCategory
                  ] ?? f.category}
                </div>
                <div className="mt-1 text-[var(--text-secondary)]">
                  {f.description}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Severity: {f.severity}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PermissionGuard permission={PERMISSIONS.INSPECTION_EXECUTE}>
        <form
          className="space-y-3 rounded-xl border border-border bg-white p-5 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault();
            findingMutation.mutate();
          }}
        >
          <h3 className="text-sm font-semibold">Tambah Temuan</h3>
          <select
            value={finding.category}
            onChange={(e) =>
              setFinding((f) => ({
                ...f,
                category: e.target.value as CirculationFindingCategory,
              }))
            }
            className="h-10 w-full rounded-lg border border-border px-3 text-sm"
          >
            {Object.entries(CIRCULATION_FINDING_CATEGORY_LABELS).map(
              ([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ),
            )}
          </select>
          <textarea
            required
            value={finding.description}
            onChange={(e) =>
              setFinding((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Deskripsi temuan"
            className="min-h-[80px] w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={findingMutation.isPending}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            Simpan Temuan
          </button>
        </form>
      </PermissionGuard>
    </div>
  );
}
