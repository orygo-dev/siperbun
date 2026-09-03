import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ProductionItem } from '../../services/dashboard';
import { formatNumber } from '../../lib/utils';

export function ProductionChart({ data }: { data: ProductionItem[] }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Produksi Bibit per Komoditas</h3>
        <Link
          to="/laporan"
          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary-light"
        >
          Lihat laporan
        </Link>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatNumber(Number(v))}
            />
            <Tooltip formatter={(v: number) => formatNumber(v)} />
            <Bar dataKey="value" fill="#07844a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
