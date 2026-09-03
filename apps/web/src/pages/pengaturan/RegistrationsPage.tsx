import { PERMISSIONS } from '@siperbun/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Download, ExternalLink, FileText } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { catalogApi } from '../../services/public';
import { useAuthStore } from '../../stores/authStore';

type RegistrationDocument = {
  id: string;
  kind: string;
  title: string;
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  };
};

type Registration = {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string | null;
  nurseryAddress: string | null;
  kabupaten: { id: string; name: string } | null;
  nurseryKabupaten: { id: string; name: string } | null;
  landOwnershipStatus: 'RENTED' | 'BORROWED' | 'OWNED' | null;
  status: string;
  reviewNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy?: { name: string } | null;
  createdProducer?: { id: string; registrationNumber: string } | null;
  documents: RegistrationDocument[];
};

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Diajukan',
  UNDER_REVIEW: 'Dalam review',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};

const ownershipLabels: Record<'RENTED' | 'BORROWED' | 'OWNED', string> = {
  RENTED: 'Sewa',
  BORROWED: 'Pinjam pakai',
  OWNED: 'Milik sendiri',
};

export function RegistrationsPage() {
  const canView = useAuthStore((state) => state.hasPermission(PERMISSIONS.PRODUCER_VIEW));
  const canUpdate = useAuthStore((state) => state.hasPermission(PERMISSIONS.PRODUCER_UPDATE));
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: ['catalog', 'registrations'],
    queryFn: async () => (await catalogApi.registrations()).data.data as Registration[],
    enabled: canView,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' }) =>
      catalogApi.updateRegistration(id, {
        status,
        reviewNotes: reviewNotes[id]?.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Status pendaftaran diperbarui');
      queryClient.invalidateQueries({ queryKey: ['catalog', 'registrations'] });
      queryClient.invalidateQueries({ queryKey: ['producers'] });
    },
    onError: (error: unknown) => {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal memperbarui pendaftaran',
      );
    },
  });

  const downloadDocument = async (document: RegistrationDocument) => {
    try {
      const response = await catalogApi.downloadRegistrationFile(document.file.id);
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.file.originalName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Dokumen gagal diunduh');
    }
  };

  if (!canView) return <Navigate to="/pengaturan" replace />;
  if (query.isLoading) return <LoadingState />;

  const rows = query.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pendaftaran Calon Penangkar"
        subtitle="Periksa identitas, lokasi, dan kelengkapan dokumen sebelum menyetujui akun"
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-white px-5 py-12 text-center text-sm text-slate-500 shadow-soft">
          Belum ada pendaftaran.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((registration) => {
            const expanded = expandedId === registration.id;
            const finalized = registration.status === 'APPROVED' || registration.status === 'REJECTED';
            return (
              <article key={registration.id} className="overflow-hidden rounded-xl border border-border bg-white shadow-soft">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setExpandedId(expanded ? null : registration.id)}
                  className="grid w-full gap-4 p-4 text-left sm:grid-cols-[1.3fr_1fr_auto] sm:items-center"
                >
                  <span>
                    <span className="block font-semibold text-slate-900">{registration.businessName}</span>
                    <span className="mt-1 block text-xs text-slate-500">{registration.ownerName} · {registration.email}</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(registration.createdAt).toLocaleDateString('id-ID', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </span>
                  <span className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">
                      {statusLabels[registration.status] ?? registration.status}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition ${expanded ? 'rotate-180' : ''}`} />
                  </span>
                </button>

                {expanded ? (
                  <div className="border-t border-border bg-slate-50/60 p-4 sm:p-5">
                    <div className="grid gap-5 lg:grid-cols-2">
                      <section className="rounded-lg border border-border bg-white p-4">
                        <h2 className="text-sm font-semibold text-slate-900">Data pendaftar</h2>
                        <dl className="mt-3 space-y-2 text-sm">
                          <InfoRow label="Nama penangkar" value={registration.ownerName} />
                          <InfoRow label="Perusahaan/lembaga/perorangan" value={registration.businessName} />
                          <InfoRow label="Email" value={registration.email} />
                          <InfoRow label="Nomor HP" value={registration.phone} />
                          <InfoRow label="Alamat kantor" value={registration.address} />
                          <InfoRow label="Kabupaten kantor" value={registration.kabupaten?.name} />
                          <InfoRow label="Lokasi pembibitan" value={registration.nurseryAddress} />
                          <InfoRow label="Kabupaten pembibitan" value={registration.nurseryKabupaten?.name} />
                          <InfoRow label="Status lahan" value={registration.landOwnershipStatus ? ownershipLabels[registration.landOwnershipStatus] : null} />
                        </dl>
                      </section>

                      <section className="rounded-lg border border-border bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h2 className="text-sm font-semibold text-slate-900">Dokumen pendukung</h2>
                          <span className="text-xs text-slate-500">{registration.documents.length}/9 file</span>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {registration.documents.map((document) => (
                            <li key={document.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5">
                              <FileText className="h-4 w-4 shrink-0 text-emerald-700" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-medium text-slate-700">{document.title}</span>
                                <span className="block truncate text-[10px] text-slate-400">
                                  {document.file.originalName} · {(document.file.size / 1024).toFixed(0)} KB
                                </span>
                              </span>
                              <button
                                type="button"
                                aria-label={`Unduh ${document.title}`}
                                onClick={() => downloadDocument(document)}
                                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-800"
                              >
                                <Download size={15} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    </div>

                    {registration.createdProducer ? (
                      <Link
                        to={`/penangkar/${registration.createdProducer.id}`}
                        className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 hover:underline"
                      >
                        <ExternalLink size={14} /> Buka penangkar {registration.createdProducer.registrationNumber}
                      </Link>
                    ) : null}

                    {canUpdate && !finalized ? (
                      <div className="mt-5 rounded-lg border border-border bg-white p-4">
                        <label className="block text-xs font-medium text-slate-700" htmlFor={`notes-${registration.id}`}>
                          Catatan review
                        </label>
                        <textarea
                          id={`notes-${registration.id}`}
                          rows={2}
                          value={reviewNotes[registration.id] ?? registration.reviewNotes ?? ''}
                          onChange={(event) => setReviewNotes((current) => ({ ...current, [registration.id]: event.target.value }))}
                          className="mt-1.5 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                          placeholder="Catatan pemeriksaan atau alasan penolakan"
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <ActionButton label="Mulai review" onClick={() => mutation.mutate({ id: registration.id, status: 'UNDER_REVIEW' })} disabled={mutation.isPending} />
                          <ActionButton label="Setujui & buat akun" tone="success" onClick={() => mutation.mutate({ id: registration.id, status: 'APPROVED' })} disabled={mutation.isPending || registration.documents.length !== 9} />
                          <ActionButton label="Tolak" tone="danger" onClick={() => mutation.mutate({ id: registration.id, status: 'REJECTED' })} disabled={mutation.isPending} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-xs font-medium leading-5 text-slate-700">{value || '—'}</dd>
    </div>
  );
}

function ActionButton({ label, tone = 'neutral', onClick, disabled }: {
  label: string;
  tone?: 'neutral' | 'success' | 'danger';
  onClick: () => void;
  disabled?: boolean;
}) {
  const toneClass = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-border bg-white text-slate-700';
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${toneClass}`}>
      {label}
    </button>
  );
}
