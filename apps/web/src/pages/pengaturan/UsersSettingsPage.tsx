import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateInput,
} from '@siperbun/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, type DataTableColumn } from '../../components/tables/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import { usersApi, type AppUser } from '../../services/users';

type FormValues = UserCreateInput & { password?: string };

export function UsersSettingsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AppUser | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const qc = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await usersApi.roles()).data.data,
  });

  const query = useQuery({
    queryKey: ['users', page, debouncedSearch],
    queryFn: async () => {
      const res = await usersApi.list({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
      });
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editing ? userUpdateSchema : userCreateSchema) as any,
  });

  function openCreate() {
    setEditing(null);
    reset({
      name: '',
      email: '',
      password: '',
      phone: '',
      roleIds: [],
      isActive: true,
    });
    setOpen(true);
  }

  function openEdit(user: AppUser) {
    setEditing(user);
    reset({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone ?? '',
      roleIds: user.roles.map((r) => r.id),
      isActive: user.isActive,
    });
    setOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editing) {
        const { password, ...rest } = values;
        const payload = password ? { ...rest, password } : rest;
        return usersApi.update(editing.id, payload);
      }
      return usersApi.create(values);
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal menyimpan pengguna';
      toast.error(message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (user: AppUser) => usersApi.toggleActive(user.id),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setToggleTarget(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Gagal mengubah status pengguna'),
  });

  const columns = useMemo<DataTableColumn<AppUser>[]>(
    () => [
      {
        key: 'name',
        header: 'Nama',
        render: (row) => <span className="font-medium">{row.name}</span>,
      },
      { key: 'email', header: 'Email', render: (row) => row.email },
      {
        key: 'roles',
        header: 'Role',
        render: (row) => row.roles.map((r) => r.name).join(', ') || '—',
      },
      {
        key: 'isActive',
        header: 'Status',
        render: (row) => (
          <span
            className={`text-xs font-medium ${row.isActive ? 'text-emerald-700' : 'text-slate-500'}`}
          >
            {row.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Pengguna"
        subtitle="Kelola akun dan role akses"
        actions={
          <>
            <Link
              to="/pengaturan"
              className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
            >
              Kembali
            </Link>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" /> Tambah
            </button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        page={page}
        limit={10}
        total={(query.data?.meta?.total as number) ?? 0}
        onPageChange={setPage}
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        loading={query.isLoading}
        rowActions={(row) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              type="button"
              onClick={() => setToggleTarget(row)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs"
            >
              <Power className="h-3.5 w-3.5" />
              {row.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
          </div>
        )}
      />

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-white p-5 shadow-soft">
            <h3 className="text-base font-semibold">
              {editing ? 'Edit Pengguna' : 'Tambah Pengguna'}
            </h3>
            <form
              onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Nama <span className="text-danger">*</span>
                </label>
                <input
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Email <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Password {!editing ? <span className="text-danger">*</span> : '(opsional)'}
                </label>
                <input
                  type="password"
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Telepon</label>
                <input
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                  {...register('phone')}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Role <span className="text-danger">*</span>
                </label>
                <select
                  multiple
                  className="min-h-[100px] w-full rounded-lg border border-border px-3 py-2 text-sm"
                  {...register('roleIds')}
                >
                  {(rolesQuery.data ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {errors.roleIds && (
                  <p className="mt-1 text-xs text-danger">
                    {(errors.roleIds as { message?: string }).message ??
                      'Role wajib dipilih'}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-9 rounded-lg border border-border px-3 text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || saveMutation.isPending}
                  className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!toggleTarget}
        title={
          toggleTarget?.isActive
            ? 'Nonaktifkan pengguna?'
            : 'Aktifkan pengguna?'
        }
        description={`Ubah status akun ${toggleTarget?.name ?? ''}.`}
        onCancel={() => setToggleTarget(null)}
        onConfirm={() => toggleTarget && toggleMutation.mutate(toggleTarget)}
        loading={toggleMutation.isPending}
        danger={!!toggleTarget?.isActive}
      />
    </div>
  );
}
