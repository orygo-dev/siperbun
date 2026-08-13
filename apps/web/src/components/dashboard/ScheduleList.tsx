import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ScheduleItem } from '../../services/dashboard';

export function ScheduleList({ items }: { items: ScheduleItem[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <h3 className="text-sm font-semibold">Jadwal Pemeriksaan Hari Ini</h3>
      <div className="mt-3 space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)]">Tidak ada jadwal hari ini.</p>
        )}
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className="flex gap-3 rounded-lg border border-border p-3 transition hover:bg-background"
          >
            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-light text-primary">
              <Clock size={14} />
              <span className="text-[10px] font-semibold">{item.time}</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{item.commodity}</div>
              <div className="truncate text-xs text-[var(--text-secondary)]">
                {item.producer} · {item.kabupaten}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                Petugas: {item.inspector}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
