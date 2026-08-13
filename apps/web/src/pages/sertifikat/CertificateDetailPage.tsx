import { CertificateStatus, PERMISSIONS } from '@siperbun/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Upload } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { certificatesApi } from '../../services/certificates';
import { useAuthStore } from '../../stores/authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

function fileHref(fileId: string) {
  return `${API_BASE}/files/${fileId}`;
}

export function CertificateDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceReason, setReplaceReason] = useState('');
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  const query = useQuery({
    queryKey: ['certificates', id],
    queryFn: async () => (await certificatesApi.get(id!)).data.data,
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['certificates', id] });
    qc.invalidateQueries({ queryKey: ['certificates'] });
  };

  const onError = (err: unknown) => {
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? 'Gagal memproses';
    toast.error(message);
  };

  const verifyMutation = useMutation({
    mutationFn: (approved: boolean) =>
      certificatesApi.verifyScan(id!, {
        approved,
        notes: verifyNotes || null,
      }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setVerifyNotes('');
      invalidate();
    },
    onError,
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      certificatesApi.cancel(id!, { reason: cancelReason || null }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setCancelOpen(false);
      invalidate();
    },
    onError,
  });

  const replaceMutation = useMutation({
    mutationFn: () => {
      if (!replaceFile) throw new Error('File wajib dipilih');
      const fd = new FormData();
      fd.append('file', replaceFile);
      if (replaceReason) fd.append('reason', replaceReason);
      return certificatesApi.replaceScan(id!, fd);
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      setReplaceOpen(false);
      setReplaceFile(null);
      setReplaceReason('');
      invalidate();
    },
    onError,
  });

  const downloadScan = async () => {
    if (!id || !accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/certificates/${id}/download`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        toast.error('Gagal mengunduh file');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        query.data?.currentFile?.originalName ?? 'sertifikat-scan';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Gagal mengunduh file');
    }
  };

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const c = query.data;
  const canUpload =
    hasPermission(PERMISSIONS.CERTIFICATE_UPLOAD) &&
    (c.status === CertificateStatus.WAITING_SCAN ||
      c.status === CertificateStatus.ISSUED_MANUALLY ||
      c.status === CertificateStatus.REJECTED);
  const canVerify =
    hasPermission(PERMISSIONS.CERTIFICATE_VERIFY) &&
    (c.status === CertificateStatus.WAITING_VERIFICATION ||
      c.status === CertificateStatus.SCAN_UPLOADED);
  const canReplace =
    hasPermission(PERMISSIONS.CERTIFICATE_REPLACE) &&
    (c.status === CertificateStatus.ACTIVE ||
      c.status === CertificateStatus.WAITING_VERIFICATION ||
      c.status === CertificateStatus.SCAN_UPLOADED);
  const canCancel =
    (hasPermission(PERMISSIONS.CERTIFICATE_VERIFY) ||
      hasPermission(PERMISSIONS.CERTIFICATE_UPLOAD)) &&
    c.status !== CertificateStatus.CANCELLED;

  const row = (label: string, value?: ReactNode) => (
    <div className="border-b border-border py-2.5 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
      <dd className="mt-0.5 text-sm sm:col-span-2 sm:mt-0">{value ?? '—'}</dd>
    </div>
  );

  const file = c.currentFile;

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.certificateNumber}
        subtitle={c.producer?.businessName}
        actions={
          <Link
            to="/sertifikat"
            className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
          >
            Kembali
          </Link>
        }
      />

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <div className="mb-3">
          <StatusBadge status={c.status} />
        </div>
        <dl>
          {row(
            'Pengajuan',
            c.application ? (
              <Link
                to={`/pengajuan/${c.application.id}`}
                className="text-primary hover:underline"
              >
                {c.application.applicationNumber}
              </Link>
            ) : null,
          )}
          {row(
            'Penangkar',
            c.producer ? (
              <Link
                to={`/penangkar/${c.producer.id}`}
                className="text-primary hover:underline"
              >
                {c.producer.businessName}
              </Link>
            ) : null,
          )}
          {row('Komoditas', c.application?.commodity?.name)}
          {row('Varietas', c.application?.variety?.name)}
          {row('Jumlah', c.certifiedCount.toLocaleString('id-ID'))}
          {row('Tanggal Terbit', c.issuedAt ? String(c.issuedAt).slice(0, 10) : null)}
          {row(
            'Kedaluwarsa',
            c.expiresAt ? String(c.expiresAt).slice(0, 10) : null,
          )}
          {row('Penandatangan', c.signatoryName)}
          {row('Jabatan', c.signatoryTitle)}
          {row('Diunggah oleh', c.uploadedBy?.name)}
          {row(
            'Diunggah',
            c.uploadedAt
              ? new Date(c.uploadedAt).toLocaleString('id-ID')
              : null,
          )}
          {row('Diverifikasi oleh', c.verifiedBy?.name)}
          {row(
            'Diverifikasi',
            c.verifiedAt
              ? new Date(c.verifiedAt).toLocaleString('id-ID')
              : null,
          )}
          {row('Catatan', c.notes)}
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold">Scan Sertifikat</h3>
        {file ? (
          <div className="space-y-3">
            <dl>
              {row('Nama file', file.originalName)}
              {row('Ukuran', `${(file.size / 1024).toFixed(1)} KB`)}
              {row(
                'SHA-256',
                <code className="break-all text-xs">{file.sha256}</code>,
              )}
            </dl>
            <div className="flex flex-wrap gap-2">
              {file.mimeType.startsWith('image/') ? (
                <img
                  src={fileHref(file.id)}
                  alt={file.originalName}
                  className="max-h-72 rounded-lg border border-border"
                />
              ) : (
                <a
                  href={fileHref(file.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Pratinjau PDF (inline)
                </a>
              )}
              <button
                type="button"
                onClick={() => void downloadScan()}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" /> Unduh
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            Belum ada file scan.
          </p>
        )}
      </div>

      {(canUpload || canVerify || canReplace || canCancel) && (
        <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
          <h3 className="mb-3 text-sm font-semibold">Aksi</h3>
          <div className="flex flex-wrap gap-2">
            {canUpload ? (
              <PermissionGuard permission={PERMISSIONS.CERTIFICATE_UPLOAD}>
                <Link
                  to={`/sertifikat/${c.id}/upload-scan`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white"
                >
                  <Upload className="h-4 w-4" /> Unggah Scan
                </Link>
              </PermissionGuard>
            ) : null}
            {canVerify ? (
              <PermissionGuard permission={PERMISSIONS.CERTIFICATE_VERIFY}>
                <div className="w-full space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Catatan verifikasi (opsional)"
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => verifyMutation.mutate(true)}
                      disabled={verifyMutation.isPending}
                      className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-60"
                    >
                      Verifikasi
                    </button>
                    <button
                      type="button"
                      onClick={() => verifyMutation.mutate(false)}
                      disabled={verifyMutation.isPending}
                      className="h-10 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-medium text-red-700 disabled:opacity-60"
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              </PermissionGuard>
            ) : null}
            {canReplace ? (
              <PermissionGuard permission={PERMISSIONS.CERTIFICATE_REPLACE}>
                <button
                  type="button"
                  onClick={() => setReplaceOpen(true)}
                  className="h-10 rounded-lg border border-border px-4 text-sm hover:bg-slate-50"
                >
                  Ganti Scan
                </button>
              </PermissionGuard>
            ) : null}
            {canCancel ? (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="h-10 rounded-lg border border-red-200 px-4 text-sm text-red-700 hover:bg-red-50"
              >
                Batalkan
              </button>
            ) : null}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold">Riwayat Versi</h3>
        {(c.versions ?? []).length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Belum ada versi scan.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-[var(--text-secondary)]">
                  <th className="py-2 pr-3 font-medium">Versi</th>
                  <th className="py-2 pr-3 font-medium">File</th>
                  <th className="py-2 pr-3 font-medium">SHA-256</th>
                  <th className="py-2 pr-3 font-medium">Alasan</th>
                  <th className="py-2 font-medium">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {(c.versions ?? []).map((v) => (
                  <tr key={v.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">v{v.version}</td>
                    <td className="py-2 pr-3">
                      {v.file ? (
                        <a
                          href={fileHref(v.file.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {v.file.originalName}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <code className="break-all text-[10px]">
                        {v.file?.sha256 ?? '—'}
                      </code>
                    </td>
                    <td className="py-2 pr-3">{v.reason ?? '—'}</td>
                    <td className="py-2">
                      {new Date(v.createdAt).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {cancelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h3 className="mb-2 text-sm font-semibold">Batalkan sertifikat?</h3>
            <p className="mb-3 text-sm text-[var(--text-secondary)]">
              Tindakan ini menandai sertifikat sebagai dibatalkan.
            </p>
            <textarea
              rows={2}
              placeholder="Alasan pembatalan (opsional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mb-4 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                className="h-9 rounded-lg border border-border px-3 text-sm"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
                className="h-9 rounded-lg bg-red-600 px-3 text-sm font-medium text-white disabled:opacity-60"
              >
                Ya, batalkan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {replaceOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h3 className="mb-3 text-sm font-semibold">Ganti Scan</h3>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                File (PDF/JPG/PNG)
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) =>
                  setReplaceFile(e.target.files?.[0] ?? null)
                }
                className="w-full text-sm"
              />
            </label>
            <label className="mb-4 block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Alasan
              </span>
              <input
                type="text"
                value={replaceReason}
                onChange={(e) => setReplaceReason(e.target.value)}
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReplaceOpen(false)}
                className="h-9 rounded-lg border border-border px-3 text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!replaceFile || replaceMutation.isPending}
                onClick={() => replaceMutation.mutate()}
                className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-white disabled:opacity-60"
              >
                Unggah Pengganti
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
