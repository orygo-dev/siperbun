import { ApplicationStatus, PERMISSIONS, SEVERITY_LABELS } from '@siperbun/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable, type DataTableColumn } from '../../components/tables/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import {
  inspectionsApi,
  type FieldInspection,
  type InspectionChecklist,
} from '../../services/inspections';
import { useAuthStore } from '../../stores/authStore';

export function InspectionsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isFinalized, setIsFinalized] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const query = useQuery({
    queryKey: ['inspections', page, debouncedSearch, isFinalized],
    queryFn: async () => {
      const res = await inspectionsApi.list({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        isFinalized: isFinalized || undefined,
      });
      return res.data;
    },
  });

  const columns = useMemo<DataTableColumn<FieldInspection>[]>(
    () => [
      {
        key: 'assignment',
        header: 'Penugasan',
        render: (row) => row.assignment?.assignmentNumber ?? '—',
      },
      {
        key: 'application',
        header: 'Pengajuan',
        render: (row) =>
          row.assignment?.application?.applicationNumber ?? '—',
      },
      {
        key: 'producer',
        header: 'Penangkar',
        render: (row) =>
          row.assignment?.application?.producer?.businessName ?? '—',
      },
      {
        key: 'inspector',
        header: 'PBT',
        render: (row) => row.inspector?.name ?? '—',
      },
      {
        key: 'startedAt',
        header: 'Mulai',
        render: (row) =>
          row.startedAt
            ? new Date(row.startedAt).toLocaleString('id-ID')
            : '—',
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <StatusBadge
            status={row.isFinalized ? 'COMPLETED' : 'UNDER_INSPECTION'}
          />
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Pemeriksaan Lapangan"
        subtitle="Hasil dan progres pemeriksaan PBT"
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
        searchPlaceholder="Cari penugasan / penangkar..."
        loading={query.isLoading}
        emptyTitle="Belum ada pemeriksaan"
        emptyDescription="Mulai pemeriksaan dari menu Penugasan."
        filters={
          <select
            value={isFinalized}
            onChange={(e) => {
              setIsFinalized(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-border px-3 text-sm"
          >
            <option value="">Semua</option>
            <option value="false">Berjalan</option>
            <option value="true">Final</option>
          </select>
        }
        rowActions={(row) => (
          <Link
            to={`/pemeriksaan/${row.id}`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Eye className="h-4 w-4" /> Detail
          </Link>
        )}
      />
    </div>
  );
}

export function InspectionDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [form, setForm] = useState({
    populationCount: '',
    sampleCount: '',
    passedCount: '',
    failedCount: '',
    rejectedCount: '',
    latitude: '',
    longitude: '',
    gpsAccuracy: '',
    conclusion: '',
    recommendation: '',
    notes: '',
  });
  const [checklistValues, setChecklistValues] = useState<
    Record<string, { value: string; isPassed: string; notes: string }>
  >({});
  const [findingForm, setFindingForm] = useState({
    findingType: '',
    description: '',
    severity: 'MEDIUM',
    recommendation: '',
  });
  const [validateNotes, setValidateNotes] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');

  const query = useQuery({
    queryKey: ['inspections', id],
    queryFn: async () => (await inspectionsApi.get(id!)).data.data,
    enabled: !!id,
  });

  const checklistsQuery = useQuery({
    queryKey: ['inspection-checklists'],
    queryFn: async () => (await inspectionsApi.checklists()).data.data,
  });

  useEffect(() => {
    if (!query.data) return;
    const d = query.data;
    setForm({
      populationCount: d.populationCount != null ? String(d.populationCount) : '',
      sampleCount: d.sampleCount != null ? String(d.sampleCount) : '',
      passedCount: d.passedCount != null ? String(d.passedCount) : '',
      failedCount: d.failedCount != null ? String(d.failedCount) : '',
      rejectedCount: d.rejectedCount != null ? String(d.rejectedCount) : '',
      latitude: d.latitude != null ? String(d.latitude) : '',
      longitude: d.longitude != null ? String(d.longitude) : '',
      gpsAccuracy: d.gpsAccuracy != null ? String(d.gpsAccuracy) : '',
      conclusion: d.conclusion ?? '',
      recommendation: d.recommendation ?? '',
      notes: d.notes ?? '',
    });
    const map: Record<string, { value: string; isPassed: string; notes: string }> =
      {};
    for (const r of d.results ?? []) {
      map[r.checklistId] = {
        value: r.value ?? '',
        isPassed:
          r.isPassed == null ? '' : r.isPassed ? 'true' : 'false',
        notes: r.notes ?? '',
      };
    }
    setChecklistValues(map);
  }, [query.data]);

  const onError = (err: unknown) => {
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? 'Gagal memproses';
    toast.error(message);
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['inspections', id] });
    qc.invalidateQueries({ queryKey: ['findings'] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      inspectionsApi.update(id!, {
        populationCount: form.populationCount
          ? Number(form.populationCount)
          : null,
        sampleCount: form.sampleCount ? Number(form.sampleCount) : null,
        passedCount: form.passedCount ? Number(form.passedCount) : null,
        failedCount: form.failedCount ? Number(form.failedCount) : null,
        rejectedCount: form.rejectedCount ? Number(form.rejectedCount) : null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        gpsAccuracy: form.gpsAccuracy ? Number(form.gpsAccuracy) : null,
        conclusion: form.conclusion || null,
        recommendation: form.recommendation || null,
        notes: form.notes || null,
      }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      invalidate();
    },
    onError,
  });

  const saveChecklistMutation = useMutation({
    mutationFn: () => {
      const checklists = checklistsQuery.data ?? [];
      const results = checklists.map((c: InspectionChecklist) => ({
        checklistId: c.id,
        value: checklistValues[c.id]?.value || null,
        isPassed:
          checklistValues[c.id]?.isPassed === ''
            ? null
            : checklistValues[c.id]?.isPassed === 'true',
        notes: checklistValues[c.id]?.notes || null,
      }));
      return inspectionsApi.upsertResults(id!, { results });
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      invalidate();
    },
    onError,
  });

  const photoMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      if (photoCaption) fd.append('caption', photoCaption);
      return inspectionsApi.addPhoto(id!, fd);
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      setPhotoCaption('');
      invalidate();
    },
    onError,
  });

  const findingMutation = useMutation({
    mutationFn: () =>
      inspectionsApi.addFinding(id!, {
        findingType: findingForm.findingType,
        description: findingForm.description,
        severity: findingForm.severity,
        recommendation: findingForm.recommendation || null,
      }),
    onSuccess: () => {
      toast.success('Temuan ditambahkan');
      setFindingForm({
        findingType: '',
        description: '',
        severity: 'MEDIUM',
        recommendation: '',
      });
      invalidate();
    },
    onError,
  });

  const finalizeMutation = useMutation({
    mutationFn: (result: 'PASS' | 'FAIL' | 'REVISION') =>
      inspectionsApi.finalize(id!, {
        result,
        conclusion: form.conclusion || result,
        notes: form.notes || null,
      }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      invalidate();
    },
    onError,
  });

  const validateMutation = useMutation({
    mutationFn: (decision: 'PASS' | 'FAIL') =>
      inspectionsApi.validate(id!, {
        decision,
        notes: validateNotes || null,
      }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      invalidate();
    },
    onError,
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const d = query.data;
  const locked = d.isFinalized;
  const appStatus = d.assignment?.application?.status;
  const canValidate =
    locked &&
    appStatus === ApplicationStatus.WAITING_RESULT_VALIDATION &&
    hasPermission(PERMISSIONS.APPLICATION_VERIFY);

  const numField = (
    label: string,
    key: keyof typeof form,
  ) => (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-[var(--text-secondary)]">
        {label}
      </span>
      <input
        type="number"
        disabled={locked}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="h-10 w-full rounded-lg border border-border px-3 text-sm disabled:bg-slate-50"
      />
    </label>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={d.assignment?.assignmentNumber ?? 'Pemeriksaan'}
        subtitle={d.assignment?.application?.producer?.businessName}
        actions={
          <Link
            to="/pemeriksaan"
            className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
          >
            Kembali
          </Link>
        }
      />

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusBadge
            status={d.isFinalized ? 'COMPLETED' : 'UNDER_INSPECTION'}
          />
          {appStatus ? <StatusBadge status={appStatus} /> : null}
          {d.assignment?.application ? (
            <Link
              to={`/pengajuan/${d.assignment.application.id}`}
              className="text-sm text-primary hover:underline"
            >
              {d.assignment.application.applicationNumber}
            </Link>
          ) : null}
        </div>

        <h3 className="mb-3 text-sm font-semibold">Data Pemeriksaan</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {numField('Populasi', 'populationCount')}
          {numField('Sampel', 'sampleCount')}
          {numField('Lulus', 'passedCount')}
          {numField('Tidak Lulus', 'failedCount')}
          {numField('Afkir', 'rejectedCount')}
          {numField('Latitude', 'latitude')}
          {numField('Longitude', 'longitude')}
          {numField('Akurasi GPS', 'gpsAccuracy')}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Kesimpulan
            </span>
            <textarea
              disabled={locked}
              rows={2}
              value={form.conclusion}
              onChange={(e) =>
                setForm((f) => ({ ...f, conclusion: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Rekomendasi
            </span>
            <textarea
              disabled={locked}
              rows={2}
              value={form.recommendation}
              onChange={(e) =>
                setForm((f) => ({ ...f, recommendation: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Catatan
            </span>
            <textarea
              disabled={locked}
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </label>
        </div>
        {!locked ? (
          <PermissionGuard permission={PERMISSIONS.INSPECTION_EXECUTE}>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="mt-3 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              Simpan Data
            </button>
          </PermissionGuard>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold">Checklist</h3>
        <div className="space-y-3">
          {(checklistsQuery.data ?? []).map((c) => (
            <div
              key={c.id}
              className="grid gap-2 border-b border-border pb-3 sm:grid-cols-4"
            >
              <div className="text-sm font-medium sm:col-span-1">{c.label}</div>
              <input
                disabled={locked}
                placeholder="Nilai"
                value={checklistValues[c.id]?.value ?? ''}
                onChange={(e) =>
                  setChecklistValues((m) => ({
                    ...m,
                    [c.id]: {
                      value: e.target.value,
                      isPassed: m[c.id]?.isPassed ?? '',
                      notes: m[c.id]?.notes ?? '',
                    },
                  }))
                }
                className="h-9 rounded-lg border border-border px-2 text-sm disabled:bg-slate-50"
              />
              <select
                disabled={locked}
                value={checklistValues[c.id]?.isPassed ?? ''}
                onChange={(e) =>
                  setChecklistValues((m) => ({
                    ...m,
                    [c.id]: {
                      value: m[c.id]?.value ?? '',
                      isPassed: e.target.value,
                      notes: m[c.id]?.notes ?? '',
                    },
                  }))
                }
                className="h-9 rounded-lg border border-border px-2 text-sm disabled:bg-slate-50"
              >
                <option value="">—</option>
                <option value="true">Lulus</option>
                <option value="false">Tidak</option>
              </select>
              <input
                disabled={locked}
                placeholder="Catatan"
                value={checklistValues[c.id]?.notes ?? ''}
                onChange={(e) =>
                  setChecklistValues((m) => ({
                    ...m,
                    [c.id]: {
                      value: m[c.id]?.value ?? '',
                      isPassed: m[c.id]?.isPassed ?? '',
                      notes: e.target.value,
                    },
                  }))
                }
                className="h-9 rounded-lg border border-border px-2 text-sm disabled:bg-slate-50"
              />
            </div>
          ))}
        </div>
        {!locked ? (
          <PermissionGuard permission={PERMISSIONS.INSPECTION_EXECUTE}>
            <button
              type="button"
              onClick={() => saveChecklistMutation.mutate()}
              disabled={saveChecklistMutation.isPending}
              className="mt-3 h-10 rounded-lg border border-border px-4 text-sm font-medium disabled:opacity-60"
            >
              Simpan Checklist
            </button>
          </PermissionGuard>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold">Foto</h3>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          {(d.photos ?? []).map((p) => (
            <div key={p.id} className="rounded-lg border border-border p-2">
              {p.file?.mimeType.startsWith('image/') ? (
                <img
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:3111/api/v1'}/files/${p.file.id}`}
                  alt={p.caption ?? p.file.originalName}
                  className="h-32 w-full rounded object-cover"
                />
              ) : (
                <div className="flex h-32 items-center justify-center text-xs text-slate-500">
                  {p.file?.originalName ?? 'File'}
                </div>
              )}
              <div className="mt-1 text-xs text-[var(--text-secondary)]">
                {p.caption ?? p.file?.originalName}
              </div>
            </div>
          ))}
        </div>
        {!locked ? (
          <PermissionGuard permission={PERMISSIONS.INSPECTION_EXECUTE}>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                  Caption
                </span>
                <input
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  className="h-10 rounded-lg border border-border px-3 text-sm"
                />
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) photoMutation.mutate(file);
                  e.target.value = '';
                }}
                className="text-sm"
              />
            </div>
          </PermissionGuard>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold">Temuan</h3>
        <ul className="mb-4 space-y-2">
          {(d.findings ?? []).map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-2 border-b border-border py-2 text-sm"
            >
              <Link
                to={`/temuan/${f.id}`}
                className="font-medium text-primary hover:underline"
              >
                {f.findingType}
              </Link>
              <span className="rounded-full border px-2 py-0.5 text-[11px]">
                {SEVERITY_LABELS[f.severity as keyof typeof SEVERITY_LABELS] ??
                  f.severity}
              </span>
              <StatusBadge status={f.status} />
              <span className="text-[var(--text-secondary)]">
                {f.description}
              </span>
            </li>
          ))}
        </ul>
        {!locked ? (
          <PermissionGuard permission={PERMISSIONS.INSPECTION_EXECUTE}>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                placeholder="Jenis temuan"
                value={findingForm.findingType}
                onChange={(e) =>
                  setFindingForm((f) => ({ ...f, findingType: e.target.value }))
                }
                className="h-10 rounded-lg border border-border px-3 text-sm"
              />
              <select
                value={findingForm.severity}
                onChange={(e) =>
                  setFindingForm((f) => ({ ...f, severity: e.target.value }))
                }
                className="h-10 rounded-lg border border-border px-3 text-sm"
              >
                {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Deskripsi"
                rows={2}
                value={findingForm.description}
                onChange={(e) =>
                  setFindingForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
              />
              <button
                type="button"
                onClick={() => findingMutation.mutate()}
                disabled={
                  findingMutation.isPending ||
                  !findingForm.findingType ||
                  !findingForm.description
                }
                className="h-10 rounded-lg border border-border px-4 text-sm font-medium disabled:opacity-60 sm:col-span-2 sm:w-fit"
              >
                Tambah Temuan
              </button>
            </div>
          </PermissionGuard>
        ) : null}
      </div>

      {!locked ? (
        <PermissionGuard
          permission={[
            PERMISSIONS.INSPECTION_FINALIZE,
            PERMISSIONS.INSPECTION_EXECUTE,
          ]}
          mode="any"
        >
          <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold">Finalisasi</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => finalizeMutation.mutate('PASS')}
                disabled={finalizeMutation.isPending}
                className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                Lulus Sementara
              </button>
              <button
                type="button"
                onClick={() => finalizeMutation.mutate('REVISION')}
                disabled={finalizeMutation.isPending}
                className="h-10 rounded-lg border border-orange-300 bg-orange-50 px-4 text-sm font-medium text-orange-700 disabled:opacity-60"
              >
                Perlu Perbaikan
              </button>
              <button
                type="button"
                onClick={() => finalizeMutation.mutate('FAIL')}
                disabled={finalizeMutation.isPending}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                Tidak Lulus
              </button>
            </div>
          </div>
        </PermissionGuard>
      ) : null}

      {canValidate ? (
        <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
          <h3 className="mb-3 text-sm font-semibold">Validasi Hasil</h3>
          <textarea
            rows={2}
            placeholder="Catatan validasi"
            value={validateNotes}
            onChange={(e) => setValidateNotes(e.target.value)}
            className="mb-3 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => validateMutation.mutate('PASS')}
              disabled={validateMutation.isPending}
              className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              Validasi Lulus
            </button>
            <button
              type="button"
              onClick={() => validateMutation.mutate('FAIL')}
              disabled={validateMutation.isPending}
              className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              Validasi Tidak Lulus
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
