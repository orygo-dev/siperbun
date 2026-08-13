import {
  BANNER_PLACEMENTS,
  dashboardBannerCreateSchema,
  type BannerPlacement,
  type DashboardBannerCreateInput,
  PERMISSIONS,
} from '@siperbun/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import {
  bannerImageSrc,
  settingsApi,
  type DashboardBanner,
} from '../../services/settings';
import { useAuthStore } from '../../stores/authStore';

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const PAGE_COPY: Record<
  BannerPlacement,
  {
    title: string;
    subtitle: string;
    empty: string;
    deleteHint: string;
    imageHint: string;
  }
> = {
  DASHBOARD: {
    title: 'Banner Dashboard',
    subtitle: 'Kelola slide pengumuman di halaman dashboard dinas (maks. 5 aktif)',
    empty: 'Belum ada banner. Tambahkan pengumuman untuk ditampilkan di dashboard.',
    deleteHint:
      'Banner akan dihapus dari dashboard dan tidak dapat dikembalikan.',
    imageHint: 'Disarankan 1600×240 px (rasio ≈ 7:1), JPG/PNG/WebP',
  },
  MOBILE: {
    title: 'Banner Slide Mobile',
    subtitle:
      'Kelola slide banner untuk portal publik dan beranda penangkar (maks. 5 aktif)',
    empty:
      'Belum ada banner mobile. Tambahkan slide untuk portal publik dan penangkar.',
    deleteHint:
      'Banner akan dihapus dari portal publik & penangkar dan tidak dapat dikembalikan.',
    imageHint: 'Disarankan 1200×600 px (rasio 2:1), JPG/PNG/WebP',
  },
};

type Props = {
  placement?: BannerPlacement;
};

export function BannersSettingsPage({
  placement = BANNER_PLACEMENTS.DASHBOARD,
}: Props) {
  const canManage = useAuthStore((s) =>
    s.hasPermission(PERMISSIONS.USER_MANAGE),
  );
  const qc = useQueryClient();
  const formFileRef = useRef<HTMLInputElement>(null);
  const listFileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<DashboardBanner | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [imageTargetId, setImageTargetId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const copy = PAGE_COPY[placement];

  const query = useQuery({
    queryKey: ['settings', 'banners', placement],
    queryFn: async () =>
      (await settingsApi.listBanners(placement)).data.data,
    enabled: canManage,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DashboardBannerCreateInput>({
    resolver: zodResolver(dashboardBannerCreateSchema),
    defaultValues: {
      title: '',
      subtitle: '',
      linkUrl: '',
      placement,
      sortOrder: 0,
      isActive: true,
      startsAt: null,
      endsAt: null,
    },
  });

  function clearPendingImage() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    if (formFileRef.current) formFileRef.current.value = '';
  }

  useEffect(() => {
    clearPendingImage();
    setRemoveExistingImage(false);
    if (editing) {
      reset({
        title: editing.title,
        subtitle: editing.subtitle ?? '',
        linkUrl: editing.linkUrl ?? '',
        placement,
        sortOrder: editing.sortOrder,
        isActive: editing.isActive,
        startsAt: (toDatetimeLocal(editing.startsAt) ||
          null) as unknown as Date | null,
        endsAt: (toDatetimeLocal(editing.endsAt) ||
          null) as unknown as Date | null,
      });
    } else {
      reset({
        title: '',
        subtitle: '',
        linkUrl: '',
        placement,
        sortOrder: (query.data?.length ?? 0) + 1,
        isActive: true,
        startsAt: null,
        endsAt: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset image state when switching edit target
  }, [editing, placement, query.data?.length, reset]);

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  const invalidateBannerQueries = () => {
    qc.invalidateQueries({ queryKey: ['settings', 'banners'] });
    qc.invalidateQueries({ queryKey: ['dash', 'banners'] });
    qc.invalidateQueries({ queryKey: ['public', 'banners'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: DashboardBannerCreateInput) => {
      const payload = {
        ...values,
        placement,
        startsAt: values.startsAt || null,
        endsAt: values.endsAt || null,
      };

      let bannerId: string;
      let message: string;

      if (editing) {
        const res = await settingsApi.updateBanner(editing.id, payload);
        bannerId = editing.id;
        message = res.data.message;
        if (removeExistingImage && !pendingFile && editing.imageUrl) {
          await settingsApi.clearBannerImage(bannerId);
        }
      } else {
        const res = await settingsApi.createBanner(payload);
        bannerId = res.data.data.id;
        message = res.data.message;
      }

      if (pendingFile) {
        await settingsApi.uploadBannerImage(bannerId, pendingFile);
      }

      return message;
    },
    onSuccess: (message) => {
      toast.success(message);
      setEditing(null);
      clearPendingImage();
      setRemoveExistingImage(false);
      invalidateBannerQueries();
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal menyimpan banner',
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deleteBanner(id),
    onSuccess: () => {
      toast.success('Banner dihapus');
      setDeleteId(null);
      if (editing?.id === deleteId) setEditing(null);
      invalidateBannerQueries();
    },
  });

  const imageMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      settingsApi.uploadBannerImage(id, file),
    onSuccess: () => {
      toast.success('Gambar banner diunggah');
      invalidateBannerQueries();
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal mengunggah gambar',
      );
    },
  });

  const clearImageMutation = useMutation({
    mutationFn: (id: string) => settingsApi.clearBannerImage(id),
    onSuccess: () => {
      toast.success('Gambar banner dihapus');
      if (editing) {
        setEditing((prev) =>
          prev ? { ...prev, imageUrl: null, imageFileId: null } : prev,
        );
      }
      invalidateBannerQueries();
    },
  });

  if (!canManage) {
    return <Navigate to="/pengaturan" replace />;
  }

  if (query.isLoading) return <LoadingState />;

  const banners = query.data ?? [];
  const existingPreview =
    editing && editing.imageUrl && !removeExistingImage && !pendingPreview
      ? bannerImageSrc(editing.imageUrl)
      : null;
  const formPreview = pendingPreview ?? existingPreview;
  const saving = isSubmitting || saveMutation.isPending;

  function onPickFormFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar PNG, JPG, atau WebP');
      return;
    }
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    setRemoveExistingImage(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        actions={
          editing ? (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Batalkan edit
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              <Plus size={16} />
              Banner baru
            </button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <form
          onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
          className="space-y-4 rounded-xl border border-border bg-white p-6 shadow-soft lg:col-span-2"
        >
          <h3 className="text-sm font-semibold text-slate-800">
            {editing ? 'Edit banner' : 'Tambah banner'}
          </h3>

          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Gambar banner
            </label>
            <div className="overflow-hidden rounded-lg border border-dashed border-border bg-slate-50">
              {formPreview ? (
                <div className="relative">
                  <img
                    src={formPreview}
                    alt="Pratinjau banner"
                    className="h-36 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      clearPendingImage();
                      if (editing?.imageUrl) setRemoveExistingImage(true);
                    }}
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm ring-1 ring-black/5 hover:bg-white"
                    aria-label="Hapus gambar"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => formFileRef.current?.click()}
                  className="flex h-36 w-full flex-col items-center justify-center gap-2 px-4 text-center hover:bg-slate-100/80"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ImagePlus size={18} />
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    Unggah gambar banner
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    {copy.imageHint}
                  </span>
                </button>
              )}
            </div>
            {formPreview && (
              <button
                type="button"
                onClick={() => formFileRef.current?.click()}
                className="mt-2 text-xs font-medium text-primary hover:underline"
              >
                Ganti gambar
              </button>
            )}
            <input
              ref={formFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                onPickFormFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Judul
              {placement !== BANNER_PLACEMENTS.MOBILE && (
                <span className="text-danger"> *</span>
              )}
            </label>
            <input
              className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...register('title')}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-danger">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium">Subjudul</label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...register('subtitle')}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Link (opsional)
            </label>
            <input
              placeholder={
                placement === BANNER_PLACEMENTS.MOBILE
                  ? '/portal atau https://...'
                  : '/pengajuan atau https://...'
              }
              className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...register('linkUrl')}
            />
            {errors.linkUrl && (
              <p className="mt-1 text-xs text-danger">{errors.linkUrl.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium">Urutan</label>
              <input
                type="number"
                min={0}
                className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register('sortOrder', { valueAsNumber: true })}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  {...register('isActive')}
                />
                Aktif
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium">Mulai</label>
              <input
                type="datetime-local"
                className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register('startsAt')}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Selesai</label>
              <input
                type="datetime-local"
                className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register('endsAt')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {saving && <Loader2 className="animate-spin" size={16} />}
            {editing ? 'Simpan perubahan' : 'Tambah banner'}
          </button>
        </form>

        <div className="space-y-3 lg:col-span-3">
          {banners.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-[var(--text-secondary)]">
              {copy.empty}
            </div>
          ) : (
            banners.map((banner) => (
              <div
                key={banner.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-soft sm:flex-row sm:items-center"
              >
                <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary/80 to-secondary sm:w-36">
                  {banner.imageUrl ? (
                    <img
                      src={bannerImageSrc(banner.imageUrl) ?? undefined}
                      alt={banner.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] font-medium uppercase tracking-wide text-white/80">
                      Tanpa gambar
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-semibold text-slate-800">
                      {banner.title?.trim() || 'Tanpa judul'}
                    </h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        banner.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {banner.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Urutan {banner.sortOrder}
                    </span>
                  </div>
                  {banner.subtitle && (
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">
                      {banner.subtitle}
                    </p>
                  )}
                  {banner.linkUrl && (
                    <p className="mt-1 truncate text-[11px] text-primary">
                      {banner.linkUrl}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImageTargetId(banner.id);
                      listFileRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50"
                  >
                    <ImagePlus size={14} />
                    Gambar
                  </button>
                  {banner.imageUrl && (
                    <button
                      type="button"
                      onClick={() => clearImageMutation.mutate(banner.id)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Hapus gambar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(banner)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(banner.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <input
        ref={listFileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && imageTargetId) {
            imageMutation.mutate({ id: imageTargetId, file });
          }
          e.target.value = '';
          setImageTargetId(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Hapus banner?"
        description={copy.deleteHint}
        confirmLabel="Hapus"
        danger
        onConfirm={() => deleteId && removeMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

export function MobileBannersSettingsPage() {
  return <BannersSettingsPage placement={BANNER_PLACEMENTS.MOBILE} />;
}
