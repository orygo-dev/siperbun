import {
  certificationApplicationCreateSchema,
  type CertificationApplicationCreateInput,
} from '@siperbun/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { applicationsApi } from '../../services/applications';
import { commoditiesApi } from '../../services/commodities';
import { nurseriesApi } from '../../services/nurseries';
import { producersApi } from '../../services/producers';
import { productionApi } from '../../services/production';
import { varietiesApi } from '../../services/varieties';

type FormValues = CertificationApplicationCreateInput;

export function ApplicationFormPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

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
  const batchesQuery = useQuery({
    queryKey: ['production-batches', 'options'],
    queryFn: async () => (await productionApi.list({ limit: 100 })).data.data,
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(certificationApplicationCreateSchema) as any,
    defaultValues: { seedlingCount: 0 },
  });

  const commodityId = watch('commodityId');
  const varietiesQuery = useQuery({
    queryKey: ['varieties', commodityId],
    queryFn: async () =>
      (await varietiesApi.list({ commodityId, limit: 100 })).data.data,
    enabled: !!commodityId,
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => applicationsApi.create(values),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['applications'] });
      navigate(`/pengajuan/${res.data.data.id}`);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal menyimpan';
      toast.error(message);
    },
  });

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
        title="Tambah Pengajuan"
        subtitle="Formulir pengajuan sertifikasi bibit"
        actions={
          <Link
            to="/pengajuan"
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
          {field('batchId', 'Batch Produksi', {
            as: 'select',
            options: (batchesQuery.data ?? []).map((b) => ({
              value: b.id,
              label: b.batchNumber,
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
          {field('seedlingCount', 'Jumlah Bibit', {
            required: true,
            type: 'number',
          })}
          {field('readyAt', 'Tanggal Siap', { type: 'date' })}
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
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
