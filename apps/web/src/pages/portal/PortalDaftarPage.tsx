import {
  producerRegistrationSchema,
  type ProducerRegistrationInput,
} from '@siperbun/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  FileCheck2,
  Loader2,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { catalogApi, publicApi } from '../../services/public';

const documentFields = [
  {
    key: 'businessLicense',
    label: 'Sertifikat standar / izin usaha pembibitan benih',
    hint: 'PDF atau gambar dokumen resmi',
    accept: '.pdf,image/jpeg,image/png,image/webp',
  },
  {
    key: 'landOwnershipProof',
    label: 'Bukti kepemilikan lahan pembibitan',
    hint: 'Sertifikat, perjanjian sewa, atau surat pinjam pakai',
    accept: '.pdf,image/jpeg,image/png,image/webp',
  },
  {
    key: 'nurseryPhoto',
    label: 'Foto lahan pembibitan',
    hint: 'JPG, PNG, atau WebP',
    accept: 'image/jpeg,image/png,image/webp',
  },
  {
    key: 'facilitiesPhoto',
    label: 'Foto sarana dan prasarana pembibitan',
    hint: 'JPG, PNG, atau WebP',
    accept: 'image/jpeg,image/png,image/webp',
  },
  {
    key: 'sourceAgreement',
    label: 'SPK dengan perusahaan sumber benih',
    hint: 'PDF atau gambar dokumen kerja sama',
    accept: '.pdf,image/jpeg,image/png,image/webp',
  },
  {
    key: 'waterSourcePhoto',
    label: 'Foto sumber air',
    hint: 'JPG, PNG, atau WebP',
    accept: 'image/jpeg,image/png,image/webp',
  },
  {
    key: 'businessRecommendation',
    label: 'Rekomendasi izin usaha benih',
    hint: 'PDF atau gambar dokumen rekomendasi',
    accept: '.pdf,image/jpeg,image/png,image/webp',
  },
  {
    key: 'expertCertificate',
    label: 'Surat / sertifikat tenaga ahli',
    hint: 'PDF atau gambar sertifikat',
    accept: '.pdf,image/jpeg,image/png,image/webp',
  },
  {
    key: 'workforceList',
    label: 'Daftar tenaga kerja',
    hint: 'PDF atau gambar daftar tenaga kerja',
    accept: '.pdf,image/jpeg,image/png,image/webp',
  },
] as const;

type DocumentField = (typeof documentFields)[number]['key'];
type RegistrationFiles = Partial<Record<DocumentField, File>>;

export function PortalDaftarPage({ adminMode = false }: { adminMode?: boolean }) {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [files, setFiles] = useState<RegistrationFiles>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<DocumentField, string>>>({});

  const kabupatenQuery = useQuery({
    queryKey: ['public', 'kabupaten'],
    queryFn: async () => (await publicApi.kabupaten()).data.data,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProducerRegistrationInput>({
    resolver: zodResolver(producerRegistrationSchema),
    defaultValues: {
      email: '',
      password: '',
      producerName: '',
      organizationName: '',
      phone: '',
      officeAddress: '',
      kabupatenId: '',
      nurseryAddress: '',
      nurseryKabupatenId: '',
      landOwnershipStatus: undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: FormData) => {
      if (adminMode) {
        const response = await catalogApi.createRegistration(payload);
        return { producerId: response.data.data.createdProducer?.id ?? null };
      }
      await publicApi.register(payload);
      return { producerId: null };
    },
    onSuccess: ({ producerId }) => {
      if (adminMode) {
        toast.success('Penangkar dan akun berhasil ditambahkan');
        navigate(producerId ? `/penangkar/${producerId}` : '/penangkar');
        return;
      }
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Pendaftaran berhasil dikirim');
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal mengirim pendaftaran',
      );
    },
  });

  const selectFile = (field: DocumentField, file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFileErrors((current) => ({ ...current, [field]: 'Ukuran file maksimal 10 MB' }));
      return;
    }
    setFiles((current) => ({ ...current, [field]: file }));
    setFileErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (values: ProducerRegistrationInput) => {
    const missing = Object.fromEntries(
      documentFields
        .filter(({ key }) => !files[key])
        .map(({ key }) => [key, 'File wajib diunggah']),
    ) as Partial<Record<DocumentField, string>>;
    setFileErrors(missing);
    if (Object.keys(missing).length > 0) {
      toast.error('Lengkapi seluruh dokumen dan foto pendaftaran');
      return;
    }

    const payload = new FormData();
    for (const [key, value] of Object.entries(values)) payload.append(key, String(value));
    for (const { key } of documentFields) payload.append(key, files[key]!);
    mutation.mutate(payload);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 md:py-24">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-9 w-9 text-emerald-700" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-emerald-950 md:text-3xl">
          Pendaftaran diterima
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Tim balai akan memeriksa data dan seluruh dokumen Anda. Setelah
          disetujui, akun penangkar dapat digunakan dengan email dan password
          yang telah didaftarkan.
        </p>
        <Link to="/portal" className="mt-8 inline-flex h-11 items-center rounded-xl bg-emerald-900 px-5 text-sm font-semibold text-white">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#f7faf8]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Pendaftaran Penangkar</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-emerald-950 md:text-4xl">
            {adminMode ? 'Tambah penangkar baru' : 'Daftar sebagai penangkar benih perkebunan'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
            Lengkapi identitas, kabupaten kantor dan pembibitan, serta sembilan
            dokumen pendukung. {adminMode
              ? 'Penangkar dan akun akan langsung dibuat setelah data tersimpan.'
              : 'Seluruh data akan diverifikasi sebelum akun penangkar diaktifkan.'}
          </p>
        </div>

        <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-6">
          <FormSection
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Akun dan identitas"
            description="Email digunakan sebagai akun masuk setelah pendaftaran disetujui."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Email" error={errors.email?.message} required>
                <input type="email" autoComplete="email" className={inputCls} {...register('email')} />
              </Field>
              <Field label="Password" error={errors.password?.message} required>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`${inputCls} pr-11`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Minimal 8 karakter serta memuat huruf dan angka.</p>
              </Field>
              <Field label="Nama penangkar" error={errors.producerName?.message} required>
                <input className={inputCls} {...register('producerName')} />
              </Field>
              <Field label="Nama perusahaan / lembaga / perorangan" error={errors.organizationName?.message} required>
                <input className={inputCls} {...register('organizationName')} />
              </Field>
              <Field label="Nomor HP" error={errors.phone?.message} required>
                <input type="tel" inputMode="tel" autoComplete="tel" className={inputCls} {...register('phone')} />
              </Field>
            </div>
          </FormSection>

          <FormSection
            icon={<FileCheck2 className="h-5 w-5" />}
            title="Lokasi usaha dan pembibitan"
            description="Alamat ini menjadi data utama penangkar dan lokasi pembibitan setelah disetujui."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Alamat kantor" error={errors.officeAddress?.message} required>
                <textarea rows={4} className={textareaCls} {...register('officeAddress')} />
              </Field>
              <Field label="Alamat lokasi pembibitan" error={errors.nurseryAddress?.message} required>
                <textarea rows={4} className={textareaCls} {...register('nurseryAddress')} />
              </Field>
              <Field label="Kabupaten kantor" error={errors.kabupatenId?.message} required>
                <select className={inputCls} {...register('kabupatenId')}>
                  <option value="">Pilih kabupaten kantor</option>
                  {(kabupatenQuery.data ?? []).map((region) => (
                    <option key={region.id} value={region.id}>{region.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Kabupaten lokasi pembibitan" error={errors.nurseryKabupatenId?.message} required>
                <select className={inputCls} {...register('nurseryKabupatenId')}>
                  <option value="">Pilih kabupaten lokasi pembibitan</option>
                  {(kabupatenQuery.data ?? []).map((region) => (
                    <option key={region.id} value={region.id}>{region.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status kepemilikan lahan pembibitan" error={errors.landOwnershipStatus?.message} required>
                <select className={inputCls} {...register('landOwnershipStatus')}>
                  <option value="">Pilih status kepemilikan</option>
                  <option value="RENTED">Sewa</option>
                  <option value="BORROWED">Pinjam pakai</option>
                  <option value="OWNED">Milik sendiri</option>
                </select>
              </Field>
            </div>
          </FormSection>

          <FormSection
            icon={<Upload className="h-5 w-5" />}
            title="Dokumen dan foto pendukung"
            description="Semua berkas wajib diunggah. Ukuran maksimum masing-masing file 10 MB."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {documentFields.map((document) => (
                <FileField
                  key={document.key}
                  definition={document}
                  file={files[document.key]}
                  error={fileErrors[document.key]}
                  onChange={(file) => selectFile(document.key, file)}
                />
              ))}
            </div>
          </FormSection>

          <div className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
            <p className="text-xs leading-5 text-slate-500">
              Dengan mengirim formulir ini, Anda menyatakan bahwa data dan
              dokumen yang diberikan benar serta dapat diverifikasi oleh UPTD.
            </p>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mutation.isPending
                ? 'Menyimpan penangkar…'
                : adminMode
                  ? 'Simpan penangkar dan akun'
                  : 'Kirim pendaftaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'h-11 w-full rounded-xl border border-emerald-900/10 bg-[#f8fbf9] px-3.5 text-sm text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10';
const textareaCls = `${inputCls} h-auto py-3 leading-6`;

function FormSection({ icon, title, description, children }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm md:p-7">
      <div className="mb-6 flex items-start gap-3 border-b border-slate-100 pb-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">{icon}</span>
        <div>
          <h2 className="font-bold text-emerald-950">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, error, required }: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-emerald-950">
        {label}{required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

function FileField({ definition, file, error, onChange }: {
  definition: (typeof documentFields)[number];
  file?: File;
  error?: string;
  onChange: (file?: File) => void;
}) {
  const id = `registration-${definition.key}`;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-emerald-950">
        {definition.label} <span className="text-red-600">*</span>
      </label>
      <label
        htmlFor={id}
        className="mt-1.5 flex min-h-[82px] cursor-pointer items-center gap-3 rounded-xl border border-dashed border-emerald-900/20 bg-[#f8fbf9] p-3.5 transition hover:border-emerald-700 hover:bg-emerald-50/50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-800 shadow-sm">
          {file ? <FileCheck2 size={19} /> : <Upload size={19} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-slate-700">{file?.name ?? 'Pilih file'}</span>
          <span className="mt-1 block text-[11px] leading-4 text-slate-500">{definition.hint}</span>
        </span>
      </label>
      <input id={id} type="file" accept={definition.accept} className="sr-only" onChange={(event) => onChange(event.target.files?.[0])} />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
