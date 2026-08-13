import { PERMISSIONS } from '@siperbun/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { certificatesApi } from '../../services/certificates';
import { seedLabelsApi } from '../../services/seedLabels';

export function LabelFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    certificateId: '',
    serialStart: '',
    serialEnd: '',
    quantity: '100',
    receivedAt: '',
    handedOverAt: '',
    recipient: '',
    notes: '',
  });

  const certsQuery = useQuery({
    queryKey: ['certificates', 'for-label'],
    queryFn: async () => {
      const res = await certificatesApi.list({
        page: 1,
        limit: 100,
        status: 'ACTIVE',
      });
      return res.data.data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: () =>
      seedLabelsApi.create({
        certificateId: form.certificateId,
        serialStart: form.serialStart,
        serialEnd: form.serialEnd,
        quantity: Number(form.quantity),
        receivedAt: form.receivedAt || null,
        handedOverAt: form.handedOverAt || null,
        recipient: form.recipient || null,
        notes: form.notes || null,
      }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      navigate(`/label-distribusi/label/${res.data.data.id}`);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal membuat label';
      toast.error(message);
    },
  });

  return (
    <PermissionGuard permission={PERMISSIONS.CERTIFICATE_UPLOAD}>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Tambah Label"
          subtitle="Catat penerimaan label untuk sertifikat"
          actions={
            <Link to="/label-distribusi" className="text-sm text-primary hover:underline">
              Kembali
            </Link>
          }
        />
        <form
          className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Sertifikat *
            </span>
            <select
              required
              value={form.certificateId}
              onChange={(e) =>
                setForm((f) => ({ ...f, certificateId: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            >
              <option value="">Pilih sertifikat</option>
              {(certsQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.certificateNumber} — {c.producer?.businessName}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Serial awal *
              </span>
              <input
                required
                value={form.serialStart}
                onChange={(e) =>
                  setForm((f) => ({ ...f, serialStart: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Serial akhir *
              </span>
              <input
                required
                value={form.serialEnd}
                onChange={(e) =>
                  setForm((f) => ({ ...f, serialEnd: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Jumlah *
            </span>
            <input
              required
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Diterima
              </span>
              <input
                type="date"
                value={form.receivedAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, receivedAt: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Diserahkan
              </span>
              <input
                type="date"
                value={form.handedOverAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, handedOverAt: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Penerima
            </span>
            <input
              value={form.recipient}
              onChange={(e) =>
                setForm((f) => ({ ...f, recipient: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Catatan
            </span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="min-h-[80px] w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Label'}
          </button>
        </form>
      </div>
    </PermissionGuard>
  );
}
