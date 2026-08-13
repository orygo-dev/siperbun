import {
  commodityCreateSchema,
  varietyCreateSchema,
  type CommodityCreateInput,
  type VarietyCreateInput,
} from '@siperbun/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { commoditiesApi } from '../../services/commodities';
import { varietiesApi } from '../../services/varieties';

export function CommoditiesSettingsPage() {
  const [tab, setTab] = useState<'commodities' | 'varieties'>('commodities');
  const [deleteCommodityId, setDeleteCommodityId] = useState<string | null>(null);
  const [deleteVarietyId, setDeleteVarietyId] = useState<string | null>(null);
  const qc = useQueryClient();

  const commoditiesQuery = useQuery({
    queryKey: ['commodities'],
    queryFn: async () => (await commoditiesApi.list({ limit: 100 })).data.data,
  });

  const varietiesQuery = useQuery({
    queryKey: ['varieties'],
    queryFn: async () => (await varietiesApi.list({ limit: 100 })).data.data,
  });

  const commodityForm = useForm<CommodityCreateInput>({
    resolver: zodResolver(commodityCreateSchema),
    defaultValues: { code: '', name: '', unit: 'batang', isActive: true },
  });

  const varietyForm = useForm<VarietyCreateInput>({
    resolver: zodResolver(varietyCreateSchema),
    defaultValues: { code: '', name: '', isActive: true },
  });

  const createCommodity = useMutation({
    mutationFn: (v: CommodityCreateInput) => commoditiesApi.create(v),
    onSuccess: (res) => {
      toast.success(res.data.message);
      commodityForm.reset({ code: '', name: '', unit: 'batang', isActive: true });
      qc.invalidateQueries({ queryKey: ['commodities'] });
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal menambah komoditas',
      );
    },
  });

  const createVariety = useMutation({
    mutationFn: (v: VarietyCreateInput) => varietiesApi.create(v),
    onSuccess: (res) => {
      toast.success(res.data.message);
      varietyForm.reset({ code: '', name: '', isActive: true });
      qc.invalidateQueries({ queryKey: ['varieties'] });
      qc.invalidateQueries({ queryKey: ['commodities'] });
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal menambah varietas',
      );
    },
  });

  const removeCommodity = useMutation({
    mutationFn: (id: string) => commoditiesApi.remove(id),
    onSuccess: () => {
      toast.success('Komoditas dihapus');
      setDeleteCommodityId(null);
      qc.invalidateQueries({ queryKey: ['commodities'] });
    },
  });

  const removeVariety = useMutation({
    mutationFn: (id: string) => varietiesApi.remove(id),
    onSuccess: () => {
      toast.success('Varietas dihapus');
      setDeleteVarietyId(null);
      qc.invalidateQueries({ queryKey: ['varieties'] });
      qc.invalidateQueries({ queryKey: ['commodities'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Komoditas & Varietas"
        subtitle="Master data komoditas dan varietas"
        actions={
          <Link
            to="/pengaturan"
            className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
          >
            Kembali
          </Link>
        }
      />

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('commodities')}
          className={`h-9 rounded-lg px-4 text-sm ${
            tab === 'commodities'
              ? 'bg-primary text-white'
              : 'border border-border bg-white'
          }`}
        >
          Komoditas
        </button>
        <button
          type="button"
          onClick={() => setTab('varieties')}
          className={`h-9 rounded-lg px-4 text-sm ${
            tab === 'varieties'
              ? 'bg-primary text-white'
              : 'border border-border bg-white'
          }`}
        >
          Varietas
        </button>
      </div>

      {tab === 'commodities' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <form
            onSubmit={commodityForm.handleSubmit((v) => createCommodity.mutate(v))}
            className="rounded-xl border border-border bg-white p-4 shadow-soft"
          >
            <h3 className="mb-3 text-sm font-semibold">Tambah Komoditas</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs">Kode *</label>
                <input
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                  {...commodityForm.register('code')}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs">Nama *</label>
                <input
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                  {...commodityForm.register('name')}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs">Nama Ilmiah</label>
                <input
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                  {...commodityForm.register('scientificName')}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs">Satuan</label>
                <input
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                  {...commodityForm.register('unit')}
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" /> Simpan
              </button>
            </div>
          </form>

          <div className="rounded-xl border border-border bg-white shadow-soft lg:col-span-2">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Kode</th>
                  <th className="px-4 py-3 text-left">Nama</th>
                  <th className="px-4 py-3 text-left">Varietas</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(commoditiesQuery.data ?? []).map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{c.code}</td>
                    <td className="px-4 py-3">{c.name}</td>
                    <td className="px-4 py-3">{c.varietiesCount ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteCommodityId(c.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <form
            onSubmit={varietyForm.handleSubmit((v) => createVariety.mutate(v))}
            className="rounded-xl border border-border bg-white p-4 shadow-soft"
          >
            <h3 className="mb-3 text-sm font-semibold">Tambah Varietas</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs">Komoditas *</label>
                <select
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                  {...varietyForm.register('commodityId')}
                >
                  <option value="">Pilih...</option>
                  {(commoditiesQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs">Kode *</label>
                <input
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                  {...varietyForm.register('code')}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs">Nama *</label>
                <input
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                  {...varietyForm.register('name')}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs">Klon</label>
                <input
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                  {...varietyForm.register('clone')}
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" /> Simpan
              </button>
            </div>
          </form>

          <div className="rounded-xl border border-border bg-white shadow-soft lg:col-span-2">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Kode</th>
                  <th className="px-4 py-3 text-left">Nama</th>
                  <th className="px-4 py-3 text-left">Komoditas</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(varietiesQuery.data ?? []).map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{v.code}</td>
                    <td className="px-4 py-3">{v.name}</td>
                    <td className="px-4 py-3">{v.commodity?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteVarietyId(v.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteCommodityId}
        title="Hapus komoditas?"
        description="Data akan dihapus secara soft-delete."
        danger
        confirmLabel="Hapus"
        onCancel={() => setDeleteCommodityId(null)}
        onConfirm={() =>
          deleteCommodityId && removeCommodity.mutate(deleteCommodityId)
        }
        loading={removeCommodity.isPending}
      />
      <ConfirmDialog
        open={!!deleteVarietyId}
        title="Hapus varietas?"
        description="Data akan dihapus secara soft-delete."
        danger
        confirmLabel="Hapus"
        onCancel={() => setDeleteVarietyId(null)}
        onConfirm={() => deleteVarietyId && removeVariety.mutate(deleteVarietyId)}
        loading={removeVariety.isPending}
      />
    </div>
  );
}
