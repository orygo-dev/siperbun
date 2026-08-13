import { CertificateStatus, PERMISSIONS } from '@siperbun/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { certificatesApi } from '../../services/certificates';

export function CertificateUploadScanPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  const query = useQuery({
    queryKey: ['certificates', id],
    queryFn: async () => (await certificatesApi.get(id!)).data.data,
    enabled: !!id,
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('File wajib dipilih');
      const fd = new FormData();
      fd.append('file', file);
      return certificatesApi.uploadScan(id!, fd);
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['certificates', id] });
      qc.invalidateQueries({ queryKey: ['certificates'] });
      navigate(`/sertifikat/${id}`);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal mengunggah scan';
      toast.error(message);
    },
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const c = query.data;
  const allowed =
    c.status === CertificateStatus.WAITING_SCAN ||
    c.status === CertificateStatus.ISSUED_MANUALLY ||
    c.status === CertificateStatus.REJECTED;

  return (
    <PermissionGuard permission={PERMISSIONS.CERTIFICATE_UPLOAD}>
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          title="Unggah Scan Sertifikat"
          subtitle={c.certificateNumber}
          actions={
            <Link
              to={`/sertifikat/${c.id}`}
              className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
            >
              Kembali
            </Link>
          }
        />

        <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
          <div className="mb-4">
            <StatusBadge status={c.status} />
          </div>
          <p className="mb-1 text-sm">
            Penangkar:{' '}
            <span className="font-medium">{c.producer?.businessName}</span>
          </p>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            Pengajuan: {c.application?.applicationNumber}
          </p>

          {!allowed ? (
            <p className="text-sm text-amber-700">
              Status saat ini tidak memungkinkan unggah scan.
            </p>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!file) {
                  toast.error('Pilih file terlebih dahulu');
                  return;
                }
                uploadMutation.mutate();
              }}
            >
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                  File scan (PDF, JPG, JPEG, PNG — maks 10MB)
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                />
              </label>
              {file ? (
                <p className="text-xs text-[var(--text-secondary)]">
                  {file.name} — {(file.size / 1024).toFixed(1)} KB
                </p>
              ) : null}
              <button
                type="submit"
                disabled={uploadMutation.isPending}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                {uploadMutation.isPending ? 'Mengunggah...' : 'Unggah Scan'}
              </button>
            </form>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
