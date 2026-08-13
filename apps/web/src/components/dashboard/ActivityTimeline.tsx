import type { ActivityItem } from '../../services/dashboard';

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <h3 className="text-sm font-semibold">Aktivitas Terbaru</h3>
      <div className="mt-3 space-y-3">
        {items.map((item, idx) => (
          <div key={item.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
              {idx < items.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div className="pb-2">
              <div className="text-sm font-medium leading-snug">{item.title}</div>
              {item.description && (
                <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {item.description}
                </div>
              )}
              <div className="mt-1 text-[10px] text-[var(--text-secondary)]">{item.relative}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
