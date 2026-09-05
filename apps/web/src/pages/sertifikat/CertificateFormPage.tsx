import { ApplicationStatus, CertificateStatus, PERMISSIONS } from '@siperbun/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { applicationsApi } from '../../services/applications';
import { certificatesApi } from '../../services/certificates';

export function CertificateFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    applicationId: '',
    certificateNumber: '',
    issuedAt: '',
    expiresAt: '',
    certifiedCount: '',
    signatoryName: 'Kepala Dinas Perkebunan',
    signatoryTitle: 'Kepala Dinas',
    notes: '',
    issuedManually: true,
  });

  const appsQuery = useQuery({
    queryKey: ['applications', 'for-certificate'],
    queryFn: async () => {
      const res = await applicationsApi.list({
        page: 1,
        limit: 100,
        status: ApplicationStatus.PAYMENT_VERIFIED,
      });
      return res.data.data ?? [];
    },
  });

  const eligibleApps = useMemo(
    () => (appsQuery.data ?? []).filter((a) => !a.certificate),
    [appsQuery.data],
  );

  const selected = eligibleApps.find((a) => a.id === form.applicationId);

  const createMutation = useMutation({
    mutationFn: () =>
      certificatesApi.create({
        applicationId: form.applicationId,
        certificateNumber: form.certificateNumber || null,
        issuedAt: form.issuedAt || null,
        expiresAt: form.expiresAt || null,
        certifiedCount: form.certifiedCount
          ? Number(form.certifiedCount)
          : selected?.seedlingCount ?? null,
        signatoryName: form.signatoryName || null,
        signatoryTitle: form.signatoryTitle || null,
        notes: form.notes || null,
        status: form.issuedManually
          ? CertificateStatus.WAITING_SCAN
          : CertificateStatus.WAITING_ISSUANCE,
      }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      navigate(`/sertifikat/${res.data.data.id}`);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal membuat sertifikat';
      toast.error(message);
    },
  });

  const field = (
    key: keyof typeof form,
    label: string,
    type: 'text' | 'date' | 'number' = 'text',
  ) => (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-[var(--text-secondary)]">
        {label}
      </span>
      <input
        type={type}
        value={String(form[key] ?? '')}
        onChange={(e) =>
          setForm((f) => ({
            ...f,
            [key]: e.target.value,
          }))
        }
        className="h-10 w-full rounded-lg border border-border px-3 text-sm"
      />
    </label>
  );

  return (
    <PermissionGuard
      permission={[PERMISSIONS.CERTIFICATE_UPLOAD, PERMISSIONS.APPLICATION_VERIFY]}
      mode="any"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Tambah Sertifikat"
          subtitle="Buat sertifikat dari pengajuan yang pembayarannya sudah lunas"
          actions={
            <Link
              to="/sertifikat"
              className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
            >
              Kembali
            </Link>
          }
        />

        {appsQuery.isLoading ? (
          <LoadingState />
        ) : (
          <form
            className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-soft"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.applicationId) {
                toast.error('Pilih pengajuan terlebih dahulu');
                return;
              }
              createMutation.mutate();
            }}
          >
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Pengajuan (Pembayaran Lunas)
              </span>
              <select
                required
                value={form.applicationId}
                onChange={(e) => {
                  const app = eligibleApps.find((a) => a.id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    applicationId: e.target.value,
                    certifiedCount: app
                      ? String(app.seedlingCount)
                      : f.certifiedCount,
                  }));
                }}
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              >
                <option value="">Pilih pengajuan</option>
                {eligibleApps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.applicationNumber} — {a.producer?.businessName} (
                    {a.commodity?.name})
                  </option>
                ))}
              </select>
              {eligibleApps.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700">
                  Tidak ada pengajuan lunas tanpa sertifikat.
                </p>
              ) : null}
            </label>

            {field('certificateNumber', 'No Sertifikat (kosongkan untuk otomatis)')}
            <div className="grid gap-4 sm:grid-cols-2">
              {field('issuedAt', 'Tanggal Terbit', 'date')}
              {field('expiresAt', 'Tanggal Kedaluwarsa', 'date')}
            </div>
            {field('certifiedCount', 'Jumlah Tersertifikasi', 'number')}
            {field('signatoryName', 'Nama Penandatangan')}
            {field('signatoryTitle', 'Jabatan Penandatangan')}

            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Catatan
              </span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.issuedManually}
                onChange={(e) =>
                  setForm((f) => ({ ...f, issuedManually: e.target.checked }))
                }
                className="mt-1"
              />
              <span>
                Sudah diterbitkan manual
                <span className="block text-xs text-[var(--text-secondary)]">
                  Status menjadi Menunggu Upload Scan
                </span>
              </span>
            </label>

            <button
              type="submit"
              disabled={createMutation.isPending || eligibleApps.length === 0}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan Sertifikat'}
            </button>
          </form>
        )}
      </div>
    </PermissionGuard>
  );
}
