import { AlertTriangle } from 'lucide-react';

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  message = 'Terjadi kesalahan saat memuat data.',
  onRetry,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/50 px-6 py-14 text-center">
      <AlertTriangle className="mb-2 h-6 w-6 text-danger" />
      <p className="text-sm text-danger">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 h-9 rounded-lg border border-border bg-white px-3 text-sm hover:bg-slate-50"
        >
          Coba lagi
        </button>
      ) : null}
    </div>
  );
}
