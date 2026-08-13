import {
  publicListingCreateSchema,
  type PublicListingCreateInput,
  PERMISSIONS,
} from '@siperbun/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { commoditiesApi } from '../../services/commodities';
import { producersApi } from '../../services/producers';
import {
  catalogApi,
  publicAssetUrl,
  type PublicListingCard,
} from '../../services/public';
import { useAuthStore } from '../../stores/authStore';

export function CatalogListingsPage() {
  const canView = useAuthStore((s) => s.hasPermission(PERMISSIONS.PRODUCER_VIEW));
  const canCreate = useAuthStore((s) => s.hasPermission(PERMISSIONS.PRODUCER_CREATE));
  const canUpdate = useAuthStore((s) => s.hasPermission(PERMISSIONS.PRODUCER_UPDATE));
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoTarget, setPhotoTarget] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listingsQ = useQuery({
    queryKey: ['catalog', 'listings'],
    queryFn: async () => (await catalogApi.list()).data.data,
    enabled: canView,
  });
  const producersQ = useQuery({
    queryKey: ['producers', 'options'],
    queryFn: async () => {
      const res = await producersApi.list({ limit: 100 });
      const data = res.data.data as unknown as { items?: { id: string; businessName: string }[] };
      return Array.isArray(data) ? data : data.items ?? [];
    },
    enabled: canCreate,
  });
  const commoditiesQ = useQuery({
    queryKey: ['commodities', 'options'],
    queryFn: async () => {
      const res = await commoditiesApi.list({ limit: 100 });
      const data = res.data.data as unknown as { items?: { id: string; name: string }[] };
      return Array.isArray(data) ? data : data.items ?? [];
    },
    enabled: canCreate,
  });

  const form = useForm<PublicListingCreateInput>({
    resolver: zodResolver(publicListingCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      unit: 'batang',
      status: 'PUBLISHED',
      priceHint: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (v: PublicListingCreateInput) => catalogApi.create(v),
    onSuccess: () => {
      toast.success('Listing dipublikasikan');
      form.reset({ title: '', description: '', unit: 'batang', status: 'PUBLISHED', priceHint: '' });
      qc.invalidateQueries({ queryKey: ['catalog', 'listings'] });
      qc.invalidateQueries({ queryKey: ['public', 'listings'] });
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal membuat listing',
      );
    },
  });

  const photoMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      catalogApi.uploadPhoto(id, file, true),
    onSuccess: () => {
      toast.success('Foto diunggah');
      qc.invalidateQueries({ queryKey: ['catalog', 'listings'] });
      qc.invalidateQueries({ queryKey: ['public', 'listings'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => catalogApi.remove(id),
    onSuccess: () => {
      toast.success('Listing dihapus');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['catalog', 'listings'] });
      qc.invalidateQueries({ queryKey: ['public', 'listings'] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      catalogApi.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog', 'listings'] });
      qc.invalidateQueries({ queryKey: ['public', 'listings'] });
      toast.success('Status diperbarui');
    },
  });

  if (!canView) return <Navigate to="/pengaturan" replace />;
  if (listingsQ.isLoading) return <LoadingState />;

  const listings = listingsQ.data ?? [];
  const producers = producersQ.data ?? [];
  const commodities = commoditiesQ.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Katalog Bibit Portal"
        subtitle="Kelola listing bibit yang tampil di portal publik (thumbnail marketplace)"
      />

      {canCreate && (
        <form
          onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
          className="grid gap-3 rounded-xl border border-border bg-white p-5 shadow-soft sm:grid-cols-2 lg:grid-cols-3"
        >
          <h3 className="sm:col-span-2 lg:col-span-3 text-sm font-semibold">Tambah listing</h3>
          <select
            className="h-10 rounded-lg border border-border px-3 text-sm"
            {...form.register('producerId')}
          >
            <option value="">Pilih penangkar</option>
            {(producers as { id: string; businessName: string }[]).map((p) => (
              <option key={p.id} value={p.id}>
                {p.businessName}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border border-border px-3 text-sm"
            {...form.register('commodityId')}
          >
            <option value="">Pilih komoditas</option>
            {commodities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Judul listing"
            className="h-10 rounded-lg border border-border px-3 text-sm"
            {...form.register('title')}
          />
          <input
            type="number"
            placeholder="Jumlah tersedia"
            className="h-10 rounded-lg border border-border px-3 text-sm"
            {...form.register('availableQty', { valueAsNumber: true })}
          />
          <input
            type="number"
            placeholder="Usia (bulan)"
            min={0}
            className="h-10 rounded-lg border border-border px-3 text-sm"
            {...form.register('ageMonths', { valueAsNumber: true })}
          />
          <input
            placeholder="Keterangan harga (opsional)"
            className="h-10 rounded-lg border border-border px-3 text-sm"
            {...form.register('priceHint')}
          />
          <select
            className="h-10 rounded-lg border border-border px-3 text-sm"
            {...form.register('status')}
          >
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <textarea
            placeholder="Deskripsi"
            rows={2}
            className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2 lg:col-span-3"
            {...form.register('description')}
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white sm:col-span-2 lg:col-span-3"
          >
            {createMutation.isPending && <Loader2 className="animate-spin" size={16} />}
            Simpan listing
          </button>
        </form>
      )}

      <div className="space-y-3">
        {listings.map((item: PublicListingCard) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-center"
          >
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-emerald-50">
              {item.coverUrl ? (
                <img
                  src={publicAssetUrl(item.coverUrl) ?? undefined}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                  No photo
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-slate-800">{item.title}</h4>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {item.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {item.producer.businessName} · {item.commodity.name}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canUpdate && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoTarget(item.id);
                      fileRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs"
                  >
                    <ImagePlus size={14} /> Foto
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      publishMutation.mutate({
                        id: item.id,
                        status: item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
                      })
                    }
                    className="rounded-lg border px-2.5 py-1.5 text-xs"
                  >
                    {item.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setDeleteId(item.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-danger"
              >
                <Trash2 size={14} /> Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && photoTarget) photoMutation.mutate({ id: photoTarget, file });
          e.target.value = '';
          setPhotoTarget(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Hapus listing?"
        description="Listing akan diarsipkan dan hilang dari portal publik."
        confirmLabel="Hapus"
        danger
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
