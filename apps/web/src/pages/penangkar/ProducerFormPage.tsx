import {
  producerCreateSchema,
  producerUpdateSchema,
  type ProducerCreateInput,
} from '@siperbun/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { producersApi } from '../../services/producers';
import { regionsApi } from '../../services/regions';

type FormValues = ProducerCreateInput;

export function ProducerFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['producers', id],
    queryFn: async () => {
      const res = await producersApi.get(id!);
      return res.data.data;
    },
    enabled: mode === 'edit' && !!id,
  });

  const regionsQuery = useQuery({
    queryKey: ['regions', 'kabupaten'],
    queryFn: async () => {
      const res = await regionsApi.list({ type: 'KABUPATEN', limit: 50 });
      return res.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(
      mode === 'create' ? producerCreateSchema : producerUpdateSchema,
    ) as any,
    defaultValues: {
      businessName: '',
      ownerName: '',
      businessType: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (detailQuery.data) {
      const d = detailQuery.data;
      reset({
        registrationNumber: d.registrationNumber,
        businessName: d.businessName,
        businessType: d.businessType ?? '',
        ownerName: d.ownerName,
        nik: d.nik ?? '',
        nib: d.nib ?? '',
        phone: d.phone ?? '',
        email: d.email ?? '',
        address: d.address ?? '',
        nurseryAddress: d.nurseryAddress ?? '',
        landOwnershipStatus: d.landOwnershipStatus ?? null,
        kabupatenId: d.kabupatenId ?? '',
        nurseryKabupatenId: d.nurseries?.[0]?.region?.id ?? '',
        kecamatan: d.kecamatan ?? '',
        desa: d.desa ?? '',
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
        productionCapacity: d.productionCapacity ?? null,
        notes: d.notes ?? '',
        isActive: d.isActive,
      });
    }
  }, [detailQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (mode === 'create') {
        return producersApi.create(values);
      }
      return producersApi.update(id!, values);
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['producers'] });
      navigate(`/penangkar/${res.data.data.id}`);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal menyimpan data';
      toast.error(message);
    },
  });

  if (mode === 'edit' && detailQuery.isLoading) return <LoadingState />;
  if (mode === 'edit' && detailQuery.isError) {
    return <ErrorState onRetry={() => detailQuery.refetch()} />;
  }

  const field = (
    name: keyof FormValues,
    label: string,
    opts?: { required?: boolean; type?: string; as?: 'textarea' | 'select' | 'input'; options?: { value: string; label: string }[] },
  ) => (
    <div>
      <label className="mb-1.5 block text-xs font-medium">
        {label}
        {opts?.required ? <span className="text-danger"> *</span> : null}
      </label>
      {opts?.as === 'textarea' ? (
        <textarea
          rows={3}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          {...register(name)}
        />
      ) : opts?.as === 'select' ? (
        <select
          className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-primary"
          {...register(name)}
        >
          <option value="">Pilih...</option>
          {(opts.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={opts?.type ?? 'text'}
          className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-primary"
          {...register(name, opts?.type === 'number' ? { valueAsNumber: true } : undefined)}
        />
      )}
      {errors[name] ? (
        <p className="mt-1 text-xs text-danger">
          {(errors[name]?.message as string) ?? 'Tidak valid'}
        </p>
      ) : null}
    </div>
  );

  return (
    <div>
      <PageHeader
        title={mode === 'create' ? 'Tambah Penangkar' : 'Edit Penangkar'}
        subtitle="Lengkapi data penangkar bibit perkebunan"
        actions={
          <Link
            to={mode === 'edit' && id ? `/penangkar/${id}` : '/penangkar'}
            className="h-10 rounded-lg border border-border px-4 text-sm leading-10 hover:bg-slate-50"
          >
            Batal
          </Link>
        }
      />

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="rounded-xl border border-border bg-white p-5 shadow-soft"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {field('registrationNumber', 'No Registrasi (otomatis jika kosong)')}
          {field('businessName', 'Nama Usaha', { required: true })}
          {field('businessType', 'Jenis Usaha', {
            as: 'select',
            options: [
              { value: 'CV', label: 'CV' },
              { value: 'UD', label: 'UD' },
              { value: 'KT', label: 'Kelompok Tani' },
              { value: 'PT', label: 'PT' },
              { value: 'LAINNYA', label: 'Lainnya' },
            ],
          })}
          {field('ownerName', 'Penanggung Jawab', { required: true })}
          {field('nik', 'NIK')}
          {field('nib', 'NIB')}
          {field('phone', 'Telepon')}
          {field('email', 'Email', { type: 'email' })}
          {field('kabupatenId', 'Kabupaten Kantor', {
            as: 'select',
            options: (regionsQuery.data ?? []).map((r) => ({
              value: r.id,
              label: r.name,
            })),
          })}
          {field('kecamatan', 'Kecamatan')}
          {field('desa', 'Desa')}
          {field('productionCapacity', 'Kapasitas Produksi', { type: 'number' })}
          {field('latitude', 'Latitude', { type: 'number' })}
          {field('longitude', 'Longitude', { type: 'number' })}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {field('address', 'Alamat Kantor', { as: 'textarea' })}
          {field('nurseryAddress', 'Alamat Lokasi Pembibitan', { as: 'textarea' })}
        </div>
        <div className="mt-4 max-w-md">
          {field('landOwnershipStatus', 'Status Kepemilikan Lahan Pembibitan', {
            as: 'select',
            options: [
              { value: 'RENTED', label: 'Sewa' },
              { value: 'BORROWED', label: 'Pinjam pakai' },
              { value: 'OWNED', label: 'Milik sendiri' },
            ],
          })}
          {field('nurseryKabupatenId', 'Kabupaten Lokasi Pembibitan', {
            as: 'select',
            options: (regionsQuery.data ?? []).map((r) => ({
              value: r.id,
              label: r.name,
            })),
          })}
        </div>
        <div className="mt-4">{field('notes', 'Catatan', { as: 'textarea' })}</div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}
