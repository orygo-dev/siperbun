import {
  changePasswordSchema,
  profileUpdateSchema,
  type ChangePasswordInput,
  type ProfileUpdateInput,
  ROLE_LABELS,
  ROLES,
  type RoleSlug,
} from '@siperbun/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import {
  Award,
  ClipboardCheck,
  Eye,
  EyeOff,
  KeyRound,
  Leaf,
  Lock,
  LogOut,
  Map,
  Sprout,
  UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { authApi } from '../../services/auth';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logoutStore = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const isPenangkar = user?.roles.includes(ROLES.PENANGKAR) ?? false;
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const profileForm = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { name: '', phone: '' },
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name ?? '',
        phone: user.phone ?? '',
      });
    }
  }, [user, profileForm]);

  const updateProfile = useMutation({
    mutationFn: (values: ProfileUpdateInput) => authApi.updateProfile(values),
    onSuccess: (res) => {
      setUser(res.data.data);
      toast.success('Profil berhasil disimpan');
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal menyimpan profil';
      toast.error(message);
    },
  });

  const changePassword = useMutation({
    mutationFn: (values: ChangePasswordInput) => authApi.changePassword(values),
    onSuccess: async () => {
      toast.success('Password diganti. Silakan masuk kembali.');
      try {
        await authApi.logout();
      } catch {
        // ignore
      }
      logoutStore();
      navigate('/login');
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal mengganti password';
      toast.error(message);
    },
  });

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    logoutStore();
    toast.success('Anda telah keluar');
    navigate('/login');
  }

  const roleLabel =
    ROLE_LABELS[(user?.roles?.[0] as RoleSlug) ?? ROLES.PENANGKAR] ??
    user?.roles?.[0] ??
    '-';

  const shortcuts = [
    { to: '/sumber-benih', label: 'Sumber Benih', icon: Sprout },
    { to: '/produksi', label: 'Produksi', icon: Leaf },
    { to: '/pemeriksaan', label: 'Pemeriksaan', icon: ClipboardCheck },
    { to: '/sertifikat', label: 'Sertifikat', icon: Award },
    { to: '/peta', label: 'Peta', icon: Map },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-4">
      <div className="hidden lg:block">
        <PageHeader
          title="Profil"
          subtitle="Kelola data akun dan keamanan password"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
        <div className="bg-gradient-to-br from-primary to-primary-dark px-5 pb-10 pt-6 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-2 ring-white/30 backdrop-blur">
              <UserRound className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight">
                {user?.name}
              </h2>
              <p className="truncate text-sm text-white/80">{user?.email}</p>
              <span className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="-mt-5 px-5 pb-5">
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div>
                <div className="text-[var(--text-secondary)]">Email</div>
                <div className="mt-0.5 truncate font-medium text-slate-800">
                  {user?.email}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Telepon</div>
                <div className="mt-0.5 font-medium text-slate-800">
                  {user?.phone || '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isPenangkar && (
        <section className="rounded-2xl border border-border bg-white p-4 shadow-soft lg:hidden">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Menu cepat</h3>
          <div className="grid grid-cols-5 gap-2">
            {shortcuts.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center transition active:scale-95 hover:bg-primary-light"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon size={18} />
                </span>
                <span className="text-[10px] font-medium leading-tight text-slate-600">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserRound size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Data profil</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Nama dan nomor telepon akun Anda
            </p>
          </div>
        </div>
        <form
          className="space-y-3"
          onSubmit={profileForm.handleSubmit((v) => updateProfile.mutate(v))}
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Nama lengkap
            </label>
            <input
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              {...profileForm.register('name')}
            />
            {profileForm.formState.errors.name && (
              <p className="mt-1 text-xs text-danger">
                {profileForm.formState.errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Email
            </label>
            <input
              disabled
              value={user?.email ?? ''}
              className="h-11 w-full rounded-xl border border-border bg-slate-50 px-3 text-sm text-[var(--text-secondary)]"
            />
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              Email tidak dapat diubah sendiri. Hubungi admin jika perlu.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Nomor telepon
            </label>
            <input
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              placeholder="08xxxxxxxxxx"
              {...profileForm.register('phone')}
            />
          </div>
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-white shadow-soft transition hover:bg-primary-dark disabled:opacity-60"
          >
            {updateProfile.isPending ? 'Menyimpan…' : 'Simpan profil'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <KeyRound size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Ganti password</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Setelah diganti, Anda akan diminta masuk ulang
            </p>
          </div>
        </div>
        <form
          className="space-y-3"
          onSubmit={passwordForm.handleSubmit((v) => changePassword.mutate(v))}
        >
          <PasswordField
            label="Password saat ini"
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            error={passwordForm.formState.errors.currentPassword?.message}
            registration={passwordForm.register('currentPassword')}
          />
          <PasswordField
            label="Password baru"
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            error={passwordForm.formState.errors.newPassword?.message}
            registration={passwordForm.register('newPassword')}
          />
          <PasswordField
            label="Konfirmasi password baru"
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            error={passwordForm.formState.errors.confirmPassword?.message}
            registration={passwordForm.register('confirmPassword')}
          />
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
          >
            <Lock size={16} />
            {changePassword.isPending ? 'Memproses…' : 'Ganti password'}
          </button>
        </form>
      </section>

      <button
        type="button"
        onClick={handleLogout}
        className={cn(
          'flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white text-sm font-semibold text-danger shadow-soft transition hover:bg-red-50',
          'lg:hidden',
        )}
      >
        <LogOut size={16} />
        Keluar dari akun
      </button>
    </div>
  );
}

function PasswordField({
  label,
  show,
  onToggle,
  error,
  registration,
}: {
  label: string;
  show: boolean;
  onToggle: () => void;
  error?: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 pr-10 text-sm outline-none focus:border-primary"
          autoComplete="new-password"
          {...registration}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
          aria-label={show ? 'Sembunyikan' : 'Tampilkan'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
