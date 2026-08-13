import { PERMISSIONS } from '@siperbun/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { catalogApi } from '../../services/public';
import { useAuthStore } from '../../stores/authStore';

type Registration = {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string | null;
  status: string;
  commodityInterest: string | null;
  kabupaten?: { name: string } | null;
  createdAt: string;
  createdProducer?: { id: string; registrationNumber: string } | null;
};

export function RegistrationsPage() {
  const canView = useAuthStore((s) => s.hasPermission(PERMISSIONS.PRODUCER_VIEW));
  const canUpdate = useAuthStore((s) => s.hasPermission(PERMISSIONS.PRODUCER_UPDATE));
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['catalog', 'registrations'],
    queryFn: async () =>
      (await catalogApi.registrations()).data.data as Registration[],
    enabled: canView,
  });

  const mutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
    }) => catalogApi.updateRegistration(id, { status }),
    onSuccess: () => {
      toast.success('Status diperbarui');
      qc.invalidateQueries({ queryKey: ['catalog', 'registrations'] });
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal memperbarui',
      );
    },
  });

  if (!canView) return <Navigate to="/pengaturan" replace />;
  if (query.isLoading) return <LoadingState />;

  const rows = query.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pendaftaran Calon Penangkar"
        subtitle="Antrian dari portal publik — setujui untuk membuat data penangkar"
      />

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Usaha</th>
              <th className="px-4 py-3">Kontak</th>
              <th className="px-4 py-3">Wilayah</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Belum ada pendaftaran.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{r.businessName}</div>
                    <div className="text-xs text-slate-500">{r.ownerName}</div>
                    {r.commodityInterest && (
                      <div className="mt-1 text-[11px] text-slate-400">
                        {r.commodityInterest}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>{r.phone}</div>
                    <div className="text-slate-500">{r.email || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.kabupaten?.name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {r.status}
                    </span>
                    {r.createdProducer && (
                      <div className="mt-1 text-[11px] text-emerald-700">
                        {r.createdProducer.registrationNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canUpdate && r.status !== 'APPROVED' && r.status !== 'REJECTED' && (
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            mutation.mutate({ id: r.id, status: 'UNDER_REVIEW' })
                          }
                          className="rounded border px-2 py-1 text-[11px]"
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            mutation.mutate({ id: r.id, status: 'APPROVED' })
                          }
                          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800"
                        >
                          Setujui
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            mutation.mutate({ id: r.id, status: 'REJECTED' })
                          }
                          className="rounded border border-red-200 px-2 py-1 text-[11px] text-danger"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
