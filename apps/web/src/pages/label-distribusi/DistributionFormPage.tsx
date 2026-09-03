import {
  KALSEL_DISTRICTS,
  PERMISSIONS,
  ROLES,
} from '@siperbun/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { certificatesApi } from '../../services/certificates';
import { producersApi } from '../../services/producers';
import { seedDistributionsApi } from '../../services/seedDistributions';
import { useAuthStore } from '../../stores/authStore';

export function DistributionFormPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const lockProducer = user?.roles.includes(ROLES.PENANGKAR) ?? false;
  const isPenangkarPath = pathname.startsWith('/distribusi');
  const listPath = isPenangkarPath
    ? '/distribusi'
    : '/label-distribusi?tab=distribusi';
  const detailPath = (id: string) =>
    isPenangkarPath
      ? `/distribusi/${id}`
      : `/label-distribusi/distribusi/${id}`;

  const [form, setForm] = useState({
    producerId: lockProducer ? (user?.producerId ?? '') : '',
    certificateId: '',
    buyerName: '',
    buyerAddress: '',
    destinationKab: '',
    quantity: '',
    distributedAt: new Date().toISOString().slice(0, 10),
    deliveryNoteNo: '',
    notes: '',
  });

  useEffect(() => {
    if (lockProducer && user?.producerId) {
      setForm((f) => (f.producerId ? f : { ...f, producerId: user.producerId ?? '' }));
    }
  }, [lockProducer, user?.producerId]);

  const producersQuery = useQuery({
    queryKey: ['producers', 'options'],
    enabled: !lockProducer,
    queryFn: async () => {
      const res = await producersApi.list({ page: 1, limit: 100 });
      return res.data.data ?? [];
    },
  });

  const certsQuery = useQuery({
    queryKey: ['certificates', 'for-dist', form.producerId],
    queryFn: async () => {
      const res = await certificatesApi.list({ page: 1, limit: 100 });
      return res.data.data ?? [];
    },
  });

  const filteredCerts = useMemo(() => {
    const rows = certsQuery.data ?? [];
    if (!form.producerId) return rows;
    return rows.filter((c) => c.producerId === form.producerId);
  }, [certsQuery.data, form.producerId]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!form.producerId) {
        throw new Error('Akun belum terhubung ke data penangkar');
      }
      return seedDistributionsApi.create({
        producerId: form.producerId,
        certificateId: form.certificateId || null,
        buyerName: form.buyerName,
        buyerAddress: form.buyerAddress || null,
        destinationKab: form.destinationKab,
        quantity: Number(form.quantity),
        distributedAt: form.distributedAt,
        deliveryNoteNo: form.deliveryNoteNo || null,
        notes: form.notes || null,
      });
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      navigate(detailPath(res.data.data.id));
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error && !('response' in err)
          ? err.message
          : ((err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? 'Gagal mencatat distribusi');
      toast.error(message);
    },
  });

  return (
    <PermissionGuard
      permission={[PERMISSIONS.CERTIFICATE_UPLOAD, PERMISSIONS.DISTRIBUTION_CREATE]}
      mode="any"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Tambah Distribusi Bibit"
          subtitle="Catat penjualan atau penyaluran bibit ke pembeli"
          actions={
            <Link to={listPath} className="text-sm text-primary hover:underline">
              Kembali
            </Link>
          }
        />
        {lockProducer && !user?.producerId ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Akun Anda belum terhubung ke data penangkar, sehingga distribusi tidak
            dapat dicatat. Hubungi admin dinas.
          </div>
        ) : null}
        <form
          className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          {lockProducer ? null : (
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Penangkar *
              </span>
              <select
                required
                value={form.producerId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    producerId: e.target.value,
                    certificateId: '',
                  }))
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
          )}
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
              {filteredCerts.map((c) => (
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
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Alamat pembeli
            </span>
            <textarea
              rows={2}
              value={form.buyerAddress}
              onChange={(e) =>
                setForm((f) => ({ ...f, buyerAddress: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                Jumlah (batang) *
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
              Kabupaten tujuan *
            </span>
            <select
              required
              value={form.destinationKab}
              onChange={(e) =>
                setForm((f) => ({ ...f, destinationKab: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            >
              <option value="">Pilih kabupaten/kota</option>
              {KALSEL_DISTRICTS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
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
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">
              Catatan
            </span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={mutation.isPending || (lockProducer && !user?.producerId)}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      </div>
    </PermissionGuard>
  );
}
