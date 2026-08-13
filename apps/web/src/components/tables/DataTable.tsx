import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '../common/EmptyState';
import { LoadingState } from '../common/LoadingState';

export type DataTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

type Props<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  loading?: boolean;
  rowActions?: (row: T) => ReactNode;
  filters?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function DataTable<T extends { id: string }>({
  columns,
  data,
  page,
  limit,
  total,
  onPageChange,
  search,
  onSearch,
  searchPlaceholder = 'Cari...',
  loading,
  rowActions,
  filters,
  emptyTitle,
  emptyDescription,
}: Props<T>) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="rounded-xl border border-border bg-white shadow-soft">
      {(onSearch || filters) && (
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          {onSearch ? (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search ?? ''}
                onChange={(e) => onSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-lg border border-border pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          ) : (
            <div />
          )}
          {filters ? <div className="flex flex-wrap gap-2">{filters}</div> : null}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : data.length === 0 ? (
        <div className="p-4">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 font-medium ${col.className ?? ''}`}
                    >
                      {col.header}
                    </th>
                  ))}
                  {rowActions ? (
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-border hover:bg-slate-50/60"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 ${col.className ?? ''}`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                    {rowActions ? (
                      <td className="px-4 py-3 text-right">{rowActions(row)}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 p-3 md:hidden">
            {data.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-border bg-white p-3 shadow-sm"
              >
                <dl className="space-y-2">
                  {columns.map((col) => (
                    <div key={col.key} className="min-w-0">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        {col.header}
                      </dt>
                      <dd className="mt-0.5 break-words text-sm text-slate-800">
                        {col.render(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
                {rowActions ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    {rowActions(row)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <span>
          Menampilkan {data.length === 0 ? 0 : (page - 1) * limit + 1}–
          {Math.min(page * limit, total)} dari {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-3 disabled:opacity-40 sm:h-8 sm:min-h-0 sm:px-2"
          >
            <ChevronLeft className="h-4 w-4" /> Sebelumnya
          </button>
          <span className="text-xs">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-3 disabled:opacity-40 sm:h-8 sm:min-h-0 sm:px-2"
          >
            Berikutnya <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
