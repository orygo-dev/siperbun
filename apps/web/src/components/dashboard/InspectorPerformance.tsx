import type { InspectorItem } from '../../services/dashboard';

export function InspectorPerformance({ items }: { items: InspectorItem[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <h3 className="text-sm font-semibold">Kinerja PBT</h3>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium">{item.name}</span>
              <span className="text-[var(--text-secondary)]">
                {item.inspectionCount} · {item.completionRate}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${item.completionRate}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
