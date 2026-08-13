import { loginSchema, type LoginInput } from '@siperbun/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { BrandLogo } from '../components/common/BrandLogo';
import { authApi } from '../services/auth';
import { useAuthStore } from '../stores/authStore';
import { useBrandingStore } from '../stores/brandingStore';

export function LoginPage() {
  const token = useAuthStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);
  const branding = useBrandingStore((s) => s.branding);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@siperbun.local',
      password: 'password',
    },
  });

  if (token) return <Navigate to="/dashboard" replace />;

  async function onSubmit(values: LoginInput) {
    setLoading(true);
    try {
      const res = await authApi.login(values.email, values.password);
      setSession(res.data.data.accessToken, res.data.data.user);
      toast.success('Login berhasil');
      navigate('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Login gagal';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-root min-h-screen bg-[#f4f7f5] lg:grid lg:grid-cols-2 lg:bg-white">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
      />
      <style>{`.login-root { font-family: Manrope, system-ui, sans-serif; }`}</style>

      {/* Brand panel — desktop only */}
      <aside className="relative hidden overflow-hidden bg-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(7,132,74,0.12) 0.8px, transparent 1px), radial-gradient(circle at 80% 40%, rgba(15,155,142,0.1) 0.8px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />

        <div className="relative z-10">
          <BrandLogo size="lg" />
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-primary/70">
            Perbenihan digital
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-primary xl:text-5xl">
            Kelola sertifikasi bibit dengan standar profesional
          </h1>
          <p className="mt-5 text-base leading-relaxed text-primary/75">
            Satu platform untuk penangkar, produksi, pemeriksaan lapangan,
            penerbitan sertifikat, hingga pengawasan peredaran.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              'Alur sertifikasi terkontrol dan terdokumentasi',
              'Monitoring kinerja PBT dan status pengajuan real-time',
              'Keamanan akses berbasis role & audit trail',
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-primary/90"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-sm text-primary/80">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span>{branding.officeName}</span>
        </div>
      </aside>

      {/* Form column */}
      <main className="relative flex min-h-screen flex-col lg:items-center lg:justify-center lg:bg-[linear-gradient(160deg,#045c36_0%,#07844a_42%,#0f9b8e_100%)] lg:px-8 lg:py-10">
        <div
          className="pointer-events-none absolute inset-0 hidden opacity-[0.1] lg:block"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #fff 0.8px, transparent 1px), radial-gradient(circle at 80% 40%, #fff 0.8px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] lg:max-w-[420px] lg:flex-none lg:justify-start lg:rounded-2xl lg:border lg:border-white/20 lg:bg-white/95 lg:p-9 lg:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] lg:backdrop-blur-sm">
          {/* Mobile header */}
          <header className="mb-8 text-center lg:hidden">
            <div className="flex justify-center">
              <BrandLogo size="lg" />
            </div>
            <p className="mt-4 text-[13px] text-slate-500">Masuk ke akun Anda</p>
          </header>

          {/* Desktop header */}
          <div className="mb-7 hidden lg:block">
            <h2 className="text-2xl font-semibold tracking-tight text-primary">
              Masuk ke akun
            </h2>
            <p className="mt-1.5 text-sm text-primary/70">
              Gunakan kredensial resmi yang diberikan administrator.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-[13px] font-medium text-slate-700 lg:text-xs lg:font-semibold lg:uppercase lg:tracking-wide lg:text-primary/80"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 lg:left-3 lg:text-primary/45" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 lg:border-primary/20 lg:bg-primary-light/50 lg:pl-10 lg:focus:border-primary lg:focus:bg-white lg:focus:ring-4 lg:focus:ring-primary/15"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-danger">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-[13px] font-medium text-slate-700 lg:text-xs lg:font-semibold lg:uppercase lg:tracking-wide lg:text-primary/80"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 lg:left-3 lg:text-primary/45" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 lg:border-primary/20 lg:bg-primary-light/50 lg:pl-10 lg:focus:border-primary lg:focus:bg-white lg:focus:ring-4 lg:focus:ring-primary/15"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 lg:right-3 lg:text-primary/50 lg:hover:text-primary"
                  aria-label={
                    showPassword ? 'Sembunyikan password' : 'Tampilkan password'
                  }
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-danger">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-60 lg:bg-primary lg:shadow-[0_10px_24px_-12px_rgba(7,132,74,0.9)] lg:hover:bg-primary-dark"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              Masuk
            </button>
          </form>

          <div className="mt-6 hidden rounded-xl border border-amber-200/80 bg-amber-50/90 px-3.5 py-3 text-[11px] leading-relaxed text-amber-900 lg:block">
            <strong className="font-semibold">Akun demo:</strong>{' '}
            admin@siperbun.local / password. Ubah sebelum production.
          </div>

          <p className="mt-6 text-center text-[13px] text-slate-500 lg:text-xs lg:text-primary/70">
            Masyarakat?{' '}
            <Link
              to="/portal"
              className="font-semibold text-emerald-800 underline-offset-2 lg:text-primary lg:hover:underline"
            >
              Portal publik
            </Link>
          </p>

        </div>

        <p className="relative z-10 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 text-center text-[11px] text-slate-400 lg:mt-6 lg:px-0 lg:pb-0 lg:pt-0 lg:text-white/80">
          © {new Date().getFullYear()} {branding.officeName}
        </p>
      </main>
    </div>
  );
}
