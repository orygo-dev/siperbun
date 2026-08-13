import { PERMISSIONS } from '@siperbun/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { certificatesApi } from '../../services/certificates';
import { producersApi } from '../../services/producers';
import { seedDistributionsApi } from '../../services/seedDistributions';

export function DistributionFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    producerId: '',
    certificateId: '',
    buyerName: '',
    buyerAddress: '',
    destinationKab: '',
    quantity: '',
    distributedAt: new Date().toISOString().slice(0, 10),
    deliveryNoteNo: '',
    notes: '',
  });

  const producersQuery = useQuery({
    queryKey: ['producers', 'options'],
    queryFn: async () => {
      const res = await producersApi.list({ page: 1, limit: 100 });
      return res.data.data ?? [];
    },
  });

  const certsQuery = useQuery({
    queryKey: ['certificates', 'for-dist'],
    queryFn: async () => {
      const res = await certificatesApi.list({ page: 1, limit: 100 });
      return res.data.data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: () =>
      seedDistributionsApi.create({
        producerId: form.producerId,
        certificateId: form.certificateId || null,
        buyerName: form.buyerName,
        buyerAddress: form.buyerAddress || null,
        destinationKab: form.destinationKab || null,
        quantity: Number(form.quantity),
        distributedAt: form.distributedAt,
        deliveryNoteNo: form.deliveryNoteNo || null,
        notes: form.notes || null,
      }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      navigate(`/label-distribusi/distribusi/${res.data.data.id}`);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal mencatat distribusi';
      toast.error(message);
    },
  });

  return (
    <PermissionGuard permission={PERMISSIONS.CERTIFICATE_UPLOAD}>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Tambah Distribusi Bibit"
          subtitle="Catat penyaluran bibit ke pembeli"
          actions={
            <Link
              to="/label-distribusi?tab=distribusi"
              className="text-sm text-primary hover:underline"
            >
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
              Penangkar *
            </span>
            <select
              required
              value={form.producerId}
              onChange={(e) =>
                setForm((f) => ({ ...f, producerId: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            >
              <option value="">Pilih penangkar</option>
              {(producersQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.businessName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Sertifikat
            </span>
            <select
              value={form.certificateId}
              onChange={(e) =>
                setForm((f) => ({ ...f, certificateId: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            >
              <option value="">Opsional</option>
              {(certsQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.certificateNumber}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Nama pembeli *
            </span>
            <input
              required
              value={form.buyerName}
              onChange={(e) =>
                setForm((f) => ({ ...f, buyerName: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Tanggal *
              </span>
              <input
                required
                type="date"
                value={form.distributedAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, distributedAt: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-border px-3 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Kabupaten tujuan
            </span>
            <input
              value={form.destinationKab}
              onChange={(e) =>
                setForm((f) => ({ ...f, destinationKab: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              No. surat jalan
            </span>
            <input
              value={form.deliveryNoteNo}
              onChange={(e) =>
                setForm((f) => ({ ...f, deliveryNoteNo: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      </div>
    </PermissionGuard>
  );
}
