import {
  brandingUpdateSchema,
  type BrandingUpdateInput,
  PERMISSIONS,
} from '@siperbun/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BrandLogo } from '../../components/common/BrandLogo';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import {
  brandingLogoSrc,
  settingsApi,
} from '../../services/settings';
import { useAuthStore } from '../../stores/authStore';
import { useBrandingStore } from '../../stores/brandingStore';

export function BrandingSettingsPage() {
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.USER_MANAGE));
  const setBranding = useBrandingStore((s) => s.setBranding);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['settings', 'branding'],
    queryFn: async () => (await settingsApi.getBranding()).data.data,
    enabled: canManage,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BrandingUpdateInput>({
    resolver: zodResolver(brandingUpdateSchema),
  });

  useEffect(() => {
    if (query.data) {
      reset({
        appName: query.data.appName,
        fullName: query.data.fullName,
        officeName: query.data.officeName,
      });
      setPreview(brandingLogoSrc(query.data.logoUrl));
    }
  }, [query.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: BrandingUpdateInput) =>
      settingsApi.updateBranding(values),
    onSuccess: (res) => {
      setBranding(res.data.data);
      qc.invalidateQueries({ queryKey: ['settings', 'branding'] });
      toast.success('Pengaturan aplikasi disimpan');
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal menyimpan';
      toast.error(message);
    },
  });

  const logoMutation = useMutation({
    mutationFn: (file: File) => settingsApi.uploadLogo(file),
    onSuccess: (res) => {
      setBranding(res.data.data);
      setPreview(brandingLogoSrc(res.data.data.logoUrl));
      qc.invalidateQueries({ queryKey: ['settings', 'branding'] });
      toast.success('Logo berhasil diunggah');
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal mengunggah logo';
      toast.error(message);
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => settingsApi.clearLogo(),
    onSuccess: (res) => {
      setBranding(res.data.data);
      setPreview(null);
      qc.invalidateQueries({ queryKey: ['settings', 'branding'] });
      toast.success('Logo dihapus, kembali ke ikon bawaan');
    },
  });

  if (!canManage) {
    return <Navigate to="/pengaturan" replace />;
  }

  if (query.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branding Aplikasi"
        subtitle="Atur nama aplikasi, nama lengkap, instansi, dan logo (Super Admin)"
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <form
          onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
          className="space-y-4 rounded-xl border border-border bg-white p-6 shadow-soft lg:col-span-3"
        >
          <h3 className="text-sm font-semibold text-slate-800">Identitas aplikasi</h3>

          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Nama aplikasi singkat <span className="text-danger">*</span>
            </label>
            <input
              className="h-11 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-primary"
              placeholder="SIPERBUN"
              {...register('appName')}
            />
            {errors.appName && (
              <p className="mt-1 text-xs text-danger">{errors.appName.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Nama lengkap aplikasi <span className="text-danger">*</span>
            </label>
            <input
              className="h-11 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-primary"
              placeholder="Sistem Informasi Perbenihan Perkebunan"
              {...register('fullName')}
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-danger">{errors.fullName.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Nama instansi <span className="text-danger">*</span>
            </label>
            <input
              className="h-11 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-primary"
              placeholder="Dinas Perkebunan Provinsi Kalimantan Selatan"
              {...register('officeName')}
            />
            {errors.officeName && (
              <p className="mt-1 text-xs text-danger">{errors.officeName.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || saveMutation.isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {(isSubmitting || saveMutation.isPending) && (
              <Loader2 className="animate-spin" size={16} />
            )}
            Simpan identitas
          </button>
        </form>

        <div className="space-y-4 rounded-xl border border-border bg-white p-6 shadow-soft lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800">Logo aplikasi</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Format PNG, JPG, atau WebP. Disarankan persegi, latar transparan, maks. 10MB.
          </p>

          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-slate-50/80 p-6">
            {preview ? (
              <img
                src={preview}
                alt="Preview logo"
                className="h-20 w-auto max-w-[12rem] object-contain"
              />
            ) : (
              <BrandLogo size="xl" />
            )}
            <div className="text-center text-xs text-[var(--text-secondary)]">
              Pratinjau tanpa frame — seperti di sidebar & login
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) logoMutation.mutate(file);
              e.target.value = '';
            }}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={logoMutation.isPending}
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {logoMutation.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <ImagePlus size={16} />
              )}
              Unggah logo
            </button>
            <button
              type="button"
              disabled={clearMutation.isPending || !preview}
              onClick={() => clearMutation.mutate()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <Trash2 size={16} />
              Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
