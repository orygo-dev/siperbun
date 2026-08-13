import {
  producerRegistrationSchema,
  type ProducerRegistrationInput,
} from '@siperbun/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { publicApi } from '../../services/public';

export function PortalDaftarPage() {
  const [done, setDone] = useState(false);
  const kabupatenQ = useQuery({
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
      businessName: '',
      ownerName: '',
      phone: '',
      email: '',
      address: '',
      kecamatan: '',
      desa: '',
      commodityInterest: '',
      notes: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ProducerRegistrationInput) => publicApi.register(values),
    onSuccess: () => {
      setDone(true);
      toast.success('Pendaftaran berhasil dikirim');
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal mengirim pendaftaran',
      );
    },
  });

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center md:py-20 sm:px-6">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" />
        <h1 className="mt-4 text-[22px] font-bold tracking-tight text-slate-900 md:text-3xl md:font-semibold md:text-emerald-950">
          Pendaftaran diterima
        </h1>
        <p className="mt-3 text-[13px] text-slate-600 md:text-sm">
          Tim dinas akan meninjau data Anda. Jika disetujui, akun login akan
          disiapkan dan diinformasikan melalui kontak yang Anda berikan.
        </p>
        <Link
          to="/portal"
          className="mt-8 inline-flex h-12 items-center rounded-2xl bg-emerald-800 px-5 text-sm font-semibold text-white md:rounded-xl md:bg-emerald-900"
        >
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-4 pt-3 md:py-10 sm:px-6">
      <h1 className="text-[22px] font-bold tracking-tight text-slate-900 md:text-3xl md:font-semibold md:text-emerald-950">
        Daftar Calon Penangkar
      </h1>
      <p className="mt-1 text-[13px] text-slate-500 md:mt-2 md:text-sm md:text-slate-600">
        Isi formulir berikut. Pendaftaran ditinjau admin sebelum akun dibuat.
      </p>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="mt-5 space-y-4 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03] md:mt-8 md:rounded-2xl md:border md:border-emerald-900/10 md:p-6 md:shadow-sm md:ring-0"
      >
        <Field label="Nama usaha / lembaga" error={errors.businessName?.message} required>
          <input className={inputCls} {...register('businessName')} />
        </Field>
        <Field label="Nama pemilik" error={errors.ownerName?.message} required>
          <input className={inputCls} {...register('ownerName')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="No. telepon / WhatsApp" error={errors.phone?.message} required>
            <input className={inputCls} {...register('phone')} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input type="email" className={inputCls} {...register('email')} />
          </Field>
        </div>
        <Field label="NIK (opsional)" error={errors.nik?.message}>
          <input className={inputCls} {...register('nik')} />
        </Field>
        <Field label="Kabupaten" error={errors.kabupatenId?.message}>
          <select className={inputCls} {...register('kabupatenId')}>
            <option value="">Pilih kabupaten</option>
            {(kabupatenQ.data ?? []).map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kecamatan">
            <input className={inputCls} {...register('kecamatan')} />
          </Field>
          <Field label="Desa">
            <input className={inputCls} {...register('desa')} />
          </Field>
        </div>
        <Field label="Alamat">
          <textarea rows={2} className={inputCls} {...register('address')} />
        </Field>
        <Field label="Komoditas yang diminati">
          <input
            placeholder="Contoh: Kelapa sawit, karet, kakao"
            className={inputCls}
            {...register('commodityInterest')}
          />
        </Field>
        <Field label="Catatan">
          <textarea rows={3} className={inputCls} {...register('notes')} />
        </Field>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-800 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-60 md:rounded-xl md:bg-emerald-900"
        >
          {mutation.isPending && <Loader2 className="animate-spin" size={16} />}
          Kirim pendaftaran
        </button>
      </form>
    </div>
  );
}

const inputCls =
  'h-12 w-full rounded-2xl border-0 bg-slate-50 px-3.5 text-sm outline-none ring-1 ring-black/[0.06] focus:ring-2 focus:ring-emerald-700/25 md:h-11 md:rounded-xl md:border md:border-emerald-900/10 md:bg-[#f7faf8] md:ring-0 md:focus:border-emerald-700 md:focus:ring-4 md:focus:ring-emerald-700/10';

function Field({
  label,
  children,
  error,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-emerald-950">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
