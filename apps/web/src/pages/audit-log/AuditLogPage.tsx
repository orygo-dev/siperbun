import { PERMISSIONS } from '@siperbun/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { DataTable, type DataTableColumn } from '../../components/tables/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import { auditLogsApi, type AuditLog } from '../../services/auditLogs';

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const debounced = useDebounce(search, 300);

  const query = useQuery({
    queryKey: ['audit-logs', page, debounced, module, action],
    queryFn: async () => {
      const res = await auditLogsApi.list({
        page,
        limit: 20,
        search: debounced || undefined,
        module: module || undefined,
        action: action || undefined,
      });
      return res.data;
    },
  });

  const columns = useMemo<DataTableColumn<AuditLog>[]>(
    () => [
      {
        key: 'createdAt',
        header: 'Waktu',
        render: (row) =>
          new Date(row.createdAt).toLocaleString('id-ID', {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
      },
      {
        key: 'user',
        header: 'Pengguna',
        render: (row) => row.user?.name ?? row.user?.email ?? '—',
      },
      {
        key: 'module',
        header: 'Modul',
        render: (row) => row.module,
      },
      {
        key: 'action',
        header: 'Aksi',
        render: (row) => row.action,
      },
      {
        key: 'entity',
        header: 'Entity',
        render: (row) => (
          <span className="font-mono text-xs">{row.entityId?.slice(0, 8) ?? '—'}</span>
        ),
      },
    ],
    [],
  );

  return (
    <PermissionGuard permission={PERMISSIONS.AUDIT_VIEW}>
      <div className="space-y-4">
        <PageHeader
          title="Audit Log"
          subtitle="Riwayat perubahan data sistem"
          actions={
            <Link to="/pengaturan" className="text-sm text-primary hover:underline">
              Pengaturan
            </Link>
          }
        />

        <DataTable
          columns={columns}
          data={query.data?.data ?? []}
          page={page}
          limit={20}
          total={(query.data?.meta?.total as number) ?? 0}
          onPageChange={setPage}
          search={search}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          loading={query.isLoading}
          emptyTitle="Belum ada audit log"
          emptyDescription="Aktivitas tulis akan tercatat di sini."
          filters={
            <>
              <input
                value={module}
                onChange={(e) => {
                  setModule(e.target.value);
                  setPage(1);
                }}
                placeholder="Modul"
                className="h-10 rounded-lg border border-border px-3 text-sm"
              />
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-border px-3 text-sm"
              >
                <option value="">Semua aksi</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </>
          }
          rowActions={(row) => (
            <button
              type="button"
              onClick={() =>
                setExpanded((cur) => (cur === row.id ? null : row.id))
              }
              className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-slate-50"
            >
              {expanded === row.id ? 'Tutup' : 'Detail'}
            </button>
          )}
        />

        {expanded && (
          <div className="rounded-xl border border-border bg-white p-4 shadow-soft">
            {(() => {
              const row = (query.data?.data ?? []).find((x) => x.id === expanded);
              if (!row) return null;
              return (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">
                      Before
                    </h4>
                    <pre className="max-h-72 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
                      {JSON.stringify(row.beforeData ?? null, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">
                      After
                    </h4>
                    <pre className="max-h-72 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
                      {JSON.stringify(row.afterData ?? null, null, 2)}
                    </pre>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
