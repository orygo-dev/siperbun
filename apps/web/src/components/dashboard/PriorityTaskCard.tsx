import { AlertTriangle, ClipboardList, FileWarning, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PriorityItem } from '../../services/dashboard';
import { cn } from '../../lib/utils';

const icons = {
  unverified: ClipboardList,
  unassigned: AlertTriangle,
  overdue: FileWarning,
  pending_scan: Upload,
};

const colors = {
  danger: 'bg-red-50 text-danger border-red-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  info: 'bg-blue-50 text-info border-blue-100',
};

export function PriorityTaskCard({ items }: { items: PriorityItem[] }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-soft">
      <h3 className="text-sm font-semibold">Pekerjaan Prioritas</h3>
      <div className="mt-3 flex-1 space-y-2">
        {items.map((item) => {
          const Icon = icons[item.key as keyof typeof icons] ?? AlertTriangle;
          return (
            <Link
              key={item.key}
              to={item.href}
              className={cn(
                'flex items-start gap-3 rounded-lg border px-3 py-2.5 transition hover:opacity-90',
                colors[item.color as keyof typeof colors] ?? colors.warning,
              )}
            >
              <Icon size={16} className="mt-0.5 shrink-0" />
              <span className="text-sm font-medium leading-snug">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
