type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  loading,
  danger,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {description ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-9 rounded-lg border border-border px-3 text-sm hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`h-9 rounded-lg px-3 text-sm text-white disabled:opacity-60 ${
              danger ? 'bg-danger hover:bg-red-700' : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {loading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
