export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-soft">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Modul dalam pengembangan — Tahap berikutnya
      </p>
    </div>
  );
}
