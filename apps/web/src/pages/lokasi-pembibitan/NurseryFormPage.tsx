import {
  nurseryCreateSchema,
  nurseryUpdateSchema,
  type NurseryCreateInput,
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
import { regionsApi } from '../../services/regions';

type FormValues = NurseryCreateInput;

export function NurseryFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['nurseries', id],
    queryFn: async () => (await nurseriesApi.get(id!)).data.data,
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
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(
      mode === 'create' ? nurseryCreateSchema : nurseryUpdateSchema,
    ) as any,
    defaultValues: { name: '', status: 'ACTIVE' },
  });

  useEffect(() => {
    if (detailQuery.data) {
      const d = detailQuery.data;
      reset({
        producerId: d.producerId,
        commodityId: d.commodityId ?? '',
        regionId: d.regionId ?? '',
        name: d.name,
        address: d.address ?? '',
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
        areaHa: d.areaHa ?? null,
        capacity: d.capacity ?? null,
        waterSource: d.waterSource ?? '',
        facilities: d.facilities ?? '',
        status: d.status,
        notes: d.notes ?? '',
      });
    }
  }, [detailQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (mode === 'create') return nurseriesApi.create(values);
      return nurseriesApi.update(id!, values);
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['nurseries'] });
      navigate(`/lokasi-pembibitan/${res.data.data.id}`);
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
        title={mode === 'create' ? 'Tambah Lokasi Pembibitan' : 'Edit Lokasi Pembibitan'}
        actions={
          <Link
            to={mode === 'edit' && id ? `/lokasi-pembibitan/${id}` : '/lokasi-pembibitan'}
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
              Penangkar <span className="text-danger">*</span>
            </label>
            <select
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('producerId')}
            >
              <option value="">Pilih penangkar</option>
              {(producersQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.businessName}
                </option>
              ))}
            </select>
            {errors.producerId && (
              <p className="mt-1 text-xs text-danger">{errors.producerId.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Nama Lokasi <span className="text-danger">*</span>
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
            <label className="mb-1.5 block text-xs font-medium">Komoditas</label>
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
            <label className="mb-1.5 block text-xs font-medium">Luas (Ha)</label>
            <input
              type="number"
              step="any"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('areaHa', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Kapasitas</label>
            <input
              type="number"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('capacity', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Sumber Air</label>
            <input
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('waterSource')}
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
          <div>
            <label className="mb-1.5 block text-xs font-medium">Latitude</label>
            <input
              type="number"
              step="any"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('latitude', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Longitude</label>
            <input
              type="number"
              step="any"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              {...register('longitude', { valueAsNumber: true })}
            />
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
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium">Fasilitas</label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            {...register('facilities')}
          />
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium">Catatan</label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            {...register('notes')}
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
