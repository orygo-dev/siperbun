import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import type { StatusItem } from '../../services/dashboard';

const COLORS = ['#f59e0b', '#f97316', '#2563eb', '#6366f1', '#7c3aed', '#07844a'];

export function CertificationStatusChart({
  total,
  items,
}: {
  total: number;
  items: StatusItem[];
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Status Sertifikasi</h3>
        <Link
          to="/pengajuan"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Lihat semua
        </Link>
      </div>
      <div className="relative mx-auto h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="count"
              nameKey="label"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
            >
              {items.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-[10px] text-[var(--text-secondary)]">Total</div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <i
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {item.label}
            </span>
            <span className="font-semibold">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
