import {
  APPLICATION_DOCUMENT_TITLES,
  certificationApplicationCreateSchema,
  type CertificationApplicationCreateInput,
} from '@siperbun/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { applicationsApi } from '../../services/applications';
import { commoditiesApi } from '../../services/commodities';
import { nurseriesApi } from '../../services/nurseries';
import { producersApi } from '../../services/producers';
import { productionApi } from '../../services/production';
import { varietiesApi } from '../../services/varieties';
import { useAuthStore } from '../../stores/authStore';

type FormValues = CertificationApplicationCreateInput;

export function ApplicationFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isProducer = user?.roles.includes('PENANGKAR') ?? false;
  const [documentFiles, setDocumentFiles] = useState<Record<string, File>>({});

  const applicationQuery = useQuery({
    queryKey: ['application', id],
    queryFn: async () => (await applicationsApi.get(id!)).data.data,
    enabled: isEdit,
  });
  const producersQuery = useQuery({
    queryKey: ['producers', 'application-options'],
    queryFn: async () => (await producersApi.list({ limit: 100 })).data.data,
    enabled: !isProducer,
  });
  const commoditiesQuery = useQuery({
    queryKey: ['commodities', 'options'],
    queryFn: async () => (await commoditiesApi.list({ limit: 100 })).data.data,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(certificationApplicationCreateSchema) as any,
    defaultValues: {
      producerId: isProducer ? (user?.producerId ?? '') : '',
      seedlingCount: 0,
    },
  });

  useEffect(() => {
    const application = applicationQuery.data;
    if (!application) return;
    reset({
      producerId: application.producerId,
      batchId: application.batchId ?? null,
      commodityId: application.commodityId,
      varietyId: application.varietyId ?? null,
      nurseryId: application.nurseryId ?? null,
      seedlingCount: application.seedlingCount,
      readyAt: application.readyAt ? application.readyAt.slice(0, 10) : null,
      inspectionType: application.inspectionType ?? null,
      notes: application.notes ?? null,
    });
  }, [applicationQuery.data, reset]);

  const producerId = watch('producerId');
  const commodityId = watch('commodityId');
  const batchId = watch('batchId');
  const nurseriesQuery = useQuery({
    queryKey: ['nurseries', 'application-options', producerId],
    queryFn: async () =>
      (await nurseriesApi.list({ limit: 100, producerId, status: 'ACTIVE' })).data
        .data,
    enabled: Boolean(producerId),
  });
  const batchesQuery = useQuery({
    queryKey: ['production-batches', 'application-options', producerId],
    queryFn: async () =>
      (await productionApi.list({ limit: 100, producerId })).data.data,
    enabled: Boolean(producerId),
  });
  const varietiesQuery = useQuery({
    queryKey: ['varieties', commodityId],
    queryFn: async () =>
      (await varietiesApi.list({ commodityId, limit: 100 })).data.data,
    enabled: Boolean(commodityId),
  });

  useEffect(() => {
    const batch = batchesQuery.data?.find((item) => item.id === batchId);
    if (!batch) return;
    setValue('commodityId', batch.commodityId, { shouldValidate: true });
    setValue('varietyId', batch.varietyId ?? null);
    setValue('nurseryId', batch.nurseryId ?? null);
  }, [batchId, batchesQuery.data, setValue]);

  const existingDocuments = useMemo(
    () => new Map(
      (applicationQuery.data?.documents ?? []).map((document) => [
        document.title,
        document,
      ]),
    ),
    [applicationQuery.data?.documents],
  );

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = isEdit
        ? await applicationsApi.update(id!, values)
        : await applicationsApi.create(values);
      const applicationId = response.data.data.id;
      await Promise.all(
        Object.entries(documentFiles).map(([title, file]) =>
          applicationsApi.uploadDocument(applicationId, title, file),
        ),
      );
      return response;
    },
    onSuccess: (response) => {
      toast.success(response.data.message);
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['application', id] });
      navigate(`/pengajuan/${response.data.data.id}`);
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal menyimpan pengajuan';
      toast.error(message);
    },
  });

  const saveApplication = (values: FormValues) => {
    const missingDocuments = APPLICATION_DOCUMENT_TITLES.filter(
      (title) => !existingDocuments.has(title) && !documentFiles[title],
    );
    if (missingDocuments.length > 0) {
      toast.error(`Dokumen wajib belum lengkap: ${missingDocuments.join(', ')}`);
      return;
    }
    mutation.mutate(values);
  };

  const field = (
    name: keyof FormValues,
    label: string,
    opts?: {
      required?: boolean;
      type?: string;
      as?: 'textarea' | 'select' | 'input';
      options?: { value: string; label: string }[];
      disabled?: boolean;
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
          disabled={opts.disabled}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-slate-50"
          {...register(name)}
        />
      ) : opts?.as === 'select' ? (
        <select
          disabled={opts.disabled}
          className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-primary disabled:bg-slate-50"
          {...register(name)}
        >
          <option value="">Pilih...</option>
          {(opts.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={opts?.type ?? 'text'}
          disabled={opts?.disabled}
          className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-primary disabled:bg-slate-50"
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

  if (isEdit && applicationQuery.isLoading) {
    return <div className="rounded-xl border border-border bg-white p-6">Memuat pengajuan...</div>;
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Perbaiki Pengajuan' : 'Tambah Pengajuan'}
        subtitle={
          isEdit
            ? 'Perbarui data sesuai catatan pemeriksa sebelum diajukan kembali'
            : 'Isi data pengajuan dan unggah seluruh dokumen pendukung'
        }
        actions={
          <Link
            to={isEdit ? `/pengajuan/${id}` : '/pengajuan'}
            className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
          >
            Batal
          </Link>
        }
      />
      <form
        onSubmit={handleSubmit(saveApplication)}
        className="rounded-xl border border-border bg-white p-5 shadow-soft"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {isProducer ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium">Penangkar</label>
              <div className="flex h-10 items-center rounded-lg border border-border bg-slate-50 px-3 text-sm">
                {applicationQuery.data?.producer?.businessName ?? user?.name ?? 'Penangkar terhubung'}
              </div>
              <input type="hidden" {...register('producerId')} />
            </div>
          ) : (
            field('producerId', 'Penangkar', {
              required: true,
              as: 'select',
              options: (producersQuery.data ?? []).map((producer) => ({
                value: producer.id,
                label: producer.businessName,
              })),
            })
          )}
          {field('commodityId', 'Komoditas', {
            required: true,
            as: 'select',
            options: (commoditiesQuery.data ?? []).map((commodity) => ({
              value: commodity.id,
              label: commodity.name,
            })),
          })}
          {field('batchId', 'Batch Produksi', {
            as: 'select',
            options: (batchesQuery.data ?? []).map((batch) => ({
              value: batch.id,
              label: `${batch.batchNumber} · tersedia ${Math.max(batch.readyCount, batch.activeCount).toLocaleString('id-ID')}`,
            })),
          })}
          {field('varietyId', 'Varietas', {
            as: 'select',
            options: (varietiesQuery.data ?? []).map((variety) => ({
              value: variety.id,
              label: variety.name,
            })),
          })}
          {field('nurseryId', 'Lokasi Pembibitan', {
            as: 'select',
            options: (nurseriesQuery.data ?? []).map((nursery) => ({
              value: nursery.id,
              label: nursery.name,
            })),
          })}
          {field('seedlingCount', 'Jumlah Bibit', { required: true, type: 'number' })}
          {field('readyAt', 'Tanggal Siap', { type: 'date' })}
          {field('inspectionType', 'Jenis Pemeriksaan', {
            as: 'select',
            options: [
              { value: 'AWAL', label: 'Pemeriksaan awal' },
              { value: 'ULANG', label: 'Pemeriksaan ulang' },
            ],
          })}
          <div className="sm:col-span-2">
            {field('notes', 'Catatan Pengajuan', { as: 'textarea' })}
          </div>
        </div>
        <div className="mt-6 border-t border-border pt-5">
          <h3 className="text-sm font-semibold">Dokumen Persyaratan</h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Seluruh dokumen wajib diunggah. Format yang diterima: PDF, JPEG, PNG,
            atau WebP.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {APPLICATION_DOCUMENT_TITLES.map((title, index) => {
              const existing = existingDocuments.get(title);
              const selected = documentFiles[title];
              return (
                <div key={title} className="rounded-lg border border-border p-3">
                  <label className="block text-xs font-medium" htmlFor={`application-document-${index}`}>
                    {index + 2}. {title}<span className="text-danger"> *</span>
                  </label>
                  {existing?.file ? (
                    <p className="mt-1 truncate text-xs text-primary">
                      Tersimpan: {existing.file.originalName}
                    </p>
                  ) : null}
                  <input
                    id={`application-document-${index}`}
                    type="file"
                    required={!existing}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    className="mt-2 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-medium file:text-primary"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setDocumentFiles((current) => {
                        const next = { ...current };
                        if (file) next[title] = file;
                        else delete next[title];
                        return next;
                      });
                    }}
                  />
                  {selected ? (
                    <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                      Dipilih: {selected.name}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {mutation.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perbaikan' : 'Simpan Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
