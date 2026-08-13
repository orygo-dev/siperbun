import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({
  title = 'Belum ada data',
  description = 'Data belum tersedia untuk ditampilkan.',
  action,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Inbox className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
