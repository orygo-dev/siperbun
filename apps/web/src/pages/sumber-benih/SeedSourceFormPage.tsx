import {
  seedSourceCreateSchema,
  seedSourceUpdateSchema,
  type SeedSourceCreateInput,
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
import { commoditiesApi } from '../../services/commodities';
import { producersApi } from '../../services/producers';
import { seedGardensApi } from '../../services/seedGardens';
import { seedSourcesApi } from '../../services/seedSources';
import { varietiesApi } from '../../services/varieties';

type FormValues = SeedSourceCreateInput;

export function SeedSourceFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['seed-sources', id],
    queryFn: async () => (await seedSourcesApi.get(id!)).data.data,
    enabled: mode === 'edit' && !!id,
  });

  const producersQuery = useQuery({
    queryKey: ['producers', 'options'],
    queryFn: async () => (await producersApi.list({ limit: 100 })).data.data,
  });
  const commoditiesQuery = useQuery({
    queryKey: ['commodities', 'options'],
    queryFn: async () => (await commoditiesApi.list({ limit: 100 })).data.data,
  });
  const seedGardensQuery = useQuery({
    queryKey: ['seed-gardens', 'options'],
    queryFn: async () => (await seedGardensApi.list({ limit: 100 })).data.data,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(
      (mode === 'create'
        ? seedSourceCreateSchema
        : seedSourceUpdateSchema) as any,
    ) as any,
    defaultValues: {
      lotNumber: '',
      quantity: 0,
      unit: 'kg',
      usedQuantity: 0,
      verificationStatus: 'PENDING',
    },
  });

  const commodityId = watch('commodityId');

  const varietiesQuery = useQuery({
    queryKey: ['varieties', commodityId],
    queryFn: async () =>
      (await varietiesApi.list({ commodityId, limit: 100 })).data.data,
    enabled: !!commodityId,
  });

  useEffect(() => {
    if (detailQuery.data) {
      const d = detailQuery.data;
      reset({
        producerId: d.producerId,
        seedGardenId: d.seedGardenId ?? '',
        commodityId: d.commodityId,
        varietyId: d.varietyId ?? '',
        lotNumber: d.lotNumber,
        receivedAt: d.receivedAt
          ? String(d.receivedAt).slice(0, 10)
          : '',
        quantity: d.quantity,
        unit: d.unit,
        supplier: d.supplier ?? '',
        originDocumentNumber: d.originDocumentNumber ?? '',
        sourceCertificateNo: d.sourceCertificateNo ?? '',
        usedQuantity: d.usedQuantity,
        verificationStatus: d.verificationStatus,
        notes: d.notes ?? '',
      });
    }
  }, [detailQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (mode === 'create') return seedSourcesApi.create(values);
      return seedSourcesApi.update(id!, values);
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['seed-sources'] });
      navigate(`/sumber-benih/${res.data.data.id}`);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal menyimpan';
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
    opts?: {
      required?: boolean;
      type?: string;
      as?: 'textarea' | 'select' | 'input';
      options?: { value: string; label: string }[];
    },
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
          {...register(
            name,
            opts?.type === 'number' ? { valueAsNumber: true } : undefined,
          )}
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
        title={mode === 'create' ? 'Tambah Sumber Benih' : 'Edit Sumber Benih'}
        subtitle="Formulir data sumber benih"
        actions={
          <Link
            to="/sumber-benih"
            className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
          >
            Batal
          </Link>
        }
      />
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="rounded-xl border border-border bg-white p-5 shadow-soft"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {field('producerId', 'Penangkar', {
            required: true,
            as: 'select',
            options: (producersQuery.data ?? []).map((p) => ({
              value: p.id,
              label: p.businessName,
            })),
          })}
          {field('commodityId', 'Komoditas', {
            required: true,
            as: 'select',
            options: (commoditiesQuery.data ?? []).map((c) => ({
              value: c.id,
              label: c.name,
            })),
          })}
          {field('varietyId', 'Varietas', {
            as: 'select',
            options: (varietiesQuery.data ?? []).map((v) => ({
              value: v.id,
              label: v.name,
            })),
          })}
          {field('seedGardenId', 'Kebun Sumber', {
            as: 'select',
            options: (seedGardensQuery.data ?? []).map((g) => ({
              value: g.id,
              label: g.name,
            })),
          })}
          {field('lotNumber', 'Nomor Lot', { required: true })}
          {field('receivedAt', 'Tanggal Diterima', { type: 'date' })}
          {field('quantity', 'Jumlah', { required: true, type: 'number' })}
          {field('unit', 'Satuan')}
          {field('usedQuantity', 'Jumlah Terpakai', { type: 'number' })}
          {field('supplier', 'Pemasok')}
          {field('originDocumentNumber', 'No Dokumen Asal')}
          {field('sourceCertificateNo', 'No Sertifikat Sumber')}
          {field('verificationStatus', 'Status Verifikasi', {
            as: 'select',
            options: [
              { value: 'PENDING', label: 'Menunggu' },
              { value: 'VERIFIED', label: 'Terverifikasi' },
              { value: 'REJECTED', label: 'Ditolak' },
            ],
          })}
          <div className="sm:col-span-2">
            {field('notes', 'Catatan', { as: 'textarea' })}
          </div>
        </div>
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
