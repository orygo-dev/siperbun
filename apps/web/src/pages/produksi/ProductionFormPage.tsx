import {
  productionBatchCreateSchema,
  productionBatchUpdateSchema,
  ProductionStatus,
  PRODUCTION_STATUS_LABELS,
  type ProductionBatchCreateInput,
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
import { nurseriesApi } from '../../services/nurseries';
import { producersApi } from '../../services/producers';
import { productionApi } from '../../services/production';
import { seedSourcesApi } from '../../services/seedSources';
import { varietiesApi } from '../../services/varieties';

type FormValues = ProductionBatchCreateInput;

export function ProductionFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['production-batches', id],
    queryFn: async () => (await productionApi.get(id!)).data.data,
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
  const nurseriesQuery = useQuery({
    queryKey: ['nurseries', 'options'],
    queryFn: async () => (await nurseriesApi.list({ limit: 100 })).data.data,
  });
  const seedSourcesQuery = useQuery({
    queryKey: ['seed-sources', 'options'],
    queryFn: async () => (await seedSourcesApi.list({ limit: 100 })).data.data,
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
        ? productionBatchCreateSchema
        : productionBatchUpdateSchema) as any,
    ) as any,
    defaultValues: {
      initialCount: 0,
      status: ProductionStatus.PREPARATION,
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
        batchNumber: d.batchNumber,
        producerId: d.producerId,
        nurseryId: d.nurseryId ?? '',
        seedSourceId: d.seedSourceId ?? '',
        commodityId: d.commodityId,
        varietyId: d.varietyId ?? '',
        startedAt: d.startedAt ? String(d.startedAt).slice(0, 10) : '',
        initialCount: d.initialCount,
        grownCount: d.grownCount,
        deadCount: d.deadCount,
        rejectedCount: d.rejectedCount,
        activeCount: d.activeCount,
        readyCount: d.readyCount,
        status: d.status as FormValues['status'],
        notes: d.notes ?? '',
      });
    }
  }, [detailQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (mode === 'create') return productionApi.create(values);
      return productionApi.update(id!, values);
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['production-batches'] });
      navigate(`/produksi/${res.data.data.id}`);
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
        title={mode === 'create' ? 'Tambah Batch Produksi' : 'Edit Batch Produksi'}
        subtitle="Formulir data produksi bibit"
        actions={
          <Link
            to="/produksi"
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
          {mode === 'edit'
            ? field('batchNumber', 'Nomor Batch')
            : field('batchNumber', 'Nomor Batch (opsional, otomatis jika kosong)')}
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
          {field('nurseryId', 'Lokasi Pembibitan', {
            as: 'select',
            options: (nurseriesQuery.data ?? []).map((n) => ({
              value: n.id,
              label: n.name,
            })),
          })}
          {field('seedSourceId', 'Sumber Benih', {
            as: 'select',
            options: (seedSourcesQuery.data ?? []).map((s) => ({
              value: s.id,
              label: s.lotNumber,
            })),
          })}
          {field('startedAt', 'Tanggal Mulai', { type: 'date' })}
          {field('initialCount', 'Jumlah Awal', { type: 'number' })}
          {field('activeCount', 'Jumlah Aktif', { type: 'number' })}
          {field('status', 'Status', {
            as: 'select',
            options: Object.values(ProductionStatus).map((s) => ({
              value: s,
              label: PRODUCTION_STATUS_LABELS[s],
            })),
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
