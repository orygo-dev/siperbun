import {
  seedGardenCreateSchema,
  seedGardenUpdateSchema,
  type SeedGardenCreateInput,
} from '@siperbun/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { commoditiesApi } from '../../services/commodities';
import { producersApi } from '../../services/producers';
import { regionsApi } from '../../services/regions';
import { seedGardensApi } from '../../services/seedGardens';
import { varietiesApi } from '../../services/varieties';

type FormValues = SeedGardenCreateInput;

function toDateInput(v?: string | null) {
  if (!v) return '';
  return v.slice(0, 10);
}

export function SeedGardenFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['seed-gardens', id],
    queryFn: async () => (await seedGardensApi.get(id!)).data.data,
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
  const regionsQuery = useQuery({
    queryKey: ['regions', 'kabupaten'],
    queryFn: async () =>
      (await regionsApi.list({ type: 'KABUPATEN', limit: 50 })).data.data,
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(
      mode === 'create' ? seedGardenCreateSchema : seedGardenUpdateSchema,
    ) as any,
    defaultValues: { name: '', status: 'ACTIVE' },
  });

  const commodityId = useWatch({ control, name: 'commodityId' });

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
        producerId: d.producerId ?? '',
        commodityId: d.commodityId,
        varietyId: d.varietyId ?? '',
        regionId: d.regionId ?? '',
        name: d.name,
        ownerName: d.ownerName ?? '',
        address: d.address ?? '',
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
        areaHa: d.areaHa ?? null,
        clone: d.clone ?? '',
        plantingYear: d.plantingYear ?? null,
        motherTreeCount: d.motherTreeCount ?? null,
        estimatedYield: d.estimatedYield ?? null,
        decreeNumber: d.decreeNumber ?? '',
        decreeDate: toDateInput(d.decreeDate),
        validUntil: toDateInput(d.validUntil),
        status: d.status,
      });
    }
  }, [detailQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (mode === 'create') return seedGardensApi.create(values);
      return seedGardensApi.update(id!, values);
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['seed-gardens'] });
      navigate(`/kebun-sumber/${res.data.data.id}`);
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

  return (
    <div>
      <PageHeader
        title={mode === 'create' ? 'Tambah Kebun Sumber' : 'Edit Kebun Sumber'}
        actions={
          <Link
            to={mode === 'edit' && id ? `/kebun-sumber/${id}` : '/kebun-sumber'}
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
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Nama Kebun <span className="text-danger">*</span>
            </label>
            <input
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('name')}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Penangkar</label>
            <select
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('producerId')}
            >
              <option value="">Pilih...</option>
              {(producersQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.businessName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Komoditas <span className="text-danger">*</span>
            </label>
            <select
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('commodityId')}
            >
              <option value="">Pilih...</option>
              {(commoditiesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.commodityId && (
              <p className="mt-1 text-xs text-danger">{errors.commodityId.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Varietas</label>
            <select
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('varietyId')}
            >
              <option value="">Pilih...</option>
              {(varietiesQuery.data ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Wilayah</label>
            <select
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('regionId')}
            >
              <option value="">Pilih...</option>
              {(regionsQuery.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Pemilik</label>
            <input
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('ownerName')}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Luas (Ha)</label>
            <input
              type="number"
              step="any"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('areaHa', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Tahun Tanam</label>
            <input
              type="number"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('plantingYear', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Jumlah Pohon Induk</label>
            <input
              type="number"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('motherTreeCount', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Perkiraan Hasil</label>
            <input
              type="number"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('estimatedYield', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">No. SK</label>
            <input
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('decreeNumber')}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Tanggal SK</label>
            <input
              type="date"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('decreeDate')}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Berlaku Hingga</label>
            <input
              type="date"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('validUntil')}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Status</label>
            <select
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('status')}
            >
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium">Alamat</label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            {...register('address')}
          />
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-white disabled:opacity-60"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}
