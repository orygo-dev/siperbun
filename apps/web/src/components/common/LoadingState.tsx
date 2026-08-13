import { Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Memuat data...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 py-16 text-sm text-[var(--text-secondary)]">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      {label}
    </div>
  );
}
