import { Link } from 'react-router-dom';
import type { RecentApplication } from '../../services/dashboard';
import { formatNumber } from '../../lib/utils';
import { StatusBadge } from '../common/StatusBadge';

export function RecentApplicationsTable({ items }: { items: RecentApplication[] }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Pengajuan Terbaru</h3>
        <Link
          to="/pengajuan"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Lihat semua
        </Link>
      </div>

      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-[var(--text-secondary)]">
              <th className="pb-2 font-medium">No Permohonan</th>
              <th className="pb-2 font-medium">Penangkar</th>
              <th className="pb-2 font-medium">Komoditas</th>
              <th className="pb-2 font-medium">Jumlah Bibit</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Tanggal</th>
              <th className="pb-2 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-b border-border/70 last:border-0">
                <td className="py-2.5 font-medium">{row.applicationNumber}</td>
                <td className="py-2.5">{row.producer}</td>
                <td className="py-2.5">{row.commodity}</td>
                <td className="py-2.5">{formatNumber(row.seedlingCount)}</td>
                <td className="py-2.5">
                  <StatusBadge status={row.status} />
                </td>
                <td className="py-2.5 text-[var(--text-secondary)]">{row.submittedAt}</td>
                <td className="py-2.5">
                  <Link to={row.href} className="text-xs font-medium text-primary hover:underline">
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {items.map((row) => (
          <div
            key={row.id}
            className="rounded-lg border border-border p-3 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{row.applicationNumber}</div>
              <StatusBadge status={row.status} />
            </div>
            <div className="mt-2 space-y-1 text-[var(--text-secondary)]">
              <div>{row.producer}</div>
              <div>
                {row.commodity} · {formatNumber(row.seedlingCount)} bibit
              </div>
              <div>{row.submittedAt}</div>
            </div>
            <Link
              to={row.href}
              className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
            >
              Detail
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
