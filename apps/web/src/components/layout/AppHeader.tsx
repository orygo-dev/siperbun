import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PERMISSIONS, ROLE_LABELS, ROLES, type RoleSlug } from '@siperbun/shared';
import { BrandLogo } from '../common/BrandLogo';
import { authApi } from '../../services/auth';
import { notificationsApi } from '../../services/notifications';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

type Props = {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  /** Mode aplikasi native (Penangkar mobile) */
  nativeMobile?: boolean;
  /** Sembunyikan bar judul halaman di mobile (mis. dashboard) */
  hideTitleOnMobile?: boolean;
};

const SEARCH_PAGES: Array<{
  to: string;
  label: string;
  hint: string;
  perm?: string;
  anyPerm?: string[];
  roles?: string[];
  excludeRoles?: string[];
}> = [
  { to: '/dashboard', label: 'Dashboard', hint: 'Ringkasan operasional' },
  { to: '/penangkar', label: 'Penangkar', hint: 'Data penangkar', perm: PERMISSIONS.PRODUCER_VIEW },
  {
    to: '/lokasi-pembibitan',
    label: 'Lokasi Pembibitan',
    hint: 'Lokasi kebun bibit',
    perm: PERMISSIONS.NURSERY_VIEW,
  },
  {
    to: '/kebun-sumber',
    label: 'Kebun Sumber',
    hint: 'Kebun sumber benih',
    perm: PERMISSIONS.SEED_GARDEN_VIEW,
  },
  {
    to: '/sumber-benih',
    label: 'Sumber Benih',
    hint: 'Lot sumber benih',
    perm: PERMISSIONS.PRODUCTION_VIEW,
  },
  {
    to: '/produksi',
    label: 'Produksi Bibit',
    hint: 'Batch produksi',
    perm: PERMISSIONS.PRODUCTION_VIEW,
  },
  {
    to: '/pengajuan',
    label: 'Pengajuan Sertifikasi',
    hint: 'Permohonan sertifikasi',
    perm: PERMISSIONS.APPLICATION_VIEW,
  },
  {
    to: '/penugasan',
    label: 'Penugasan',
    hint: 'Penugasan PBT',
    perm: PERMISSIONS.APPLICATION_ASSIGN,
  },
  {
    to: '/pemeriksaan',
    label: 'Pemeriksaan Lapangan',
    hint: 'Hasil pemeriksaan',
    perm: PERMISSIONS.INSPECTION_VIEW,
  },
  { to: '/temuan', label: 'Temuan', hint: 'Temuan lapangan', perm: PERMISSIONS.INSPECTION_VIEW },
  {
    to: '/sertifikat',
    label: 'Sertifikat',
    hint: 'Sertifikat terbit',
    perm: PERMISSIONS.CERTIFICATE_VIEW,
  },
  {
    to: '/label-distribusi',
    label: 'Label & Distribusi',
    hint: 'Label dan distribusi bibit',
    anyPerm: [
      PERMISSIONS.CERTIFICATE_UPLOAD,
      PERMISSIONS.CERTIFICATE_VERIFY,
      PERMISSIONS.DISTRIBUTION_VIEW,
    ],
    excludeRoles: [ROLES.PENANGKAR],
  },
  {
    to: '/distribusi',
    label: 'Distribusi Bibit',
    hint: 'Penjualan dan penyaluran bibit',
    perm: PERMISSIONS.DISTRIBUTION_VIEW,
    roles: [ROLES.PENANGKAR],
  },
  { to: '/laporan', label: 'Laporan', hint: 'Laporan & ekspor', perm: PERMISSIONS.REPORT_VIEW },
  { to: '/pengaturan', label: 'Pengaturan', hint: 'Konfigurasi sistem', perm: PERMISSIONS.USER_MANAGE },
];

function roleLabel(roles?: string[]) {
  const slug = roles?.[0];
  if (!slug) return 'Pengguna';
  if (slug in ROLE_LABELS) return ROLE_LABELS[slug as RoleSlug];
  return slug.replaceAll('_', ' ');
}

export function AppHeader({
  title,
  subtitle,
  onMenuClick,
  nativeMobile = false,
  hideTitleOnMobile = false,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const isPenangkar = user?.roles.includes(ROLES.PENANGKAR) ?? false;

  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationsApi.list({ page: 1, limit: 10 });
      return res.data;
    },
    refetchInterval: 60_000,
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markOne = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const pages = useMemo(
    () =>
      SEARCH_PAGES.filter((p) => {
        if (p.excludeRoles?.some((r) => user?.roles.includes(r))) return false;
        if (p.roles?.length && !p.roles.some((r) => user?.roles.includes(r))) {
          return false;
        }
        if (p.anyPerm) return hasAnyPermission(...p.anyPerm);
        if (p.perm) return hasPermission(p.perm);
        return true;
      }),
    [hasAnyPermission, hasPermission, user?.roles],
  );

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages.slice(0, 6);
    return pages
      .filter(
        (p) =>
          p.label.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [pages, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (!notifRef.current?.contains(t)) setNotifOpen(false);
      if (!userRef.current?.contains(t)) setUserOpen(false);
      if (!searchRef.current?.contains(t)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

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

  function goTo(to: string) {
    setSearchOpen(false);
    setQuery('');
    navigate(to);
  }

  const unread = Number(notifQuery.data?.meta?.unreadCount ?? 0);
  const items = notifQuery.data?.data ?? [];
  const initials =
    user?.name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'U';
  const displayRole = roleLabel(user?.roles);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-white/95 backdrop-blur-xl',
        nativeMobile
          ? 'border-b border-black/[0.04] lg:border-border/80'
          : 'border-b border-border/80',
      )}
      style={
        nativeMobile
          ? { paddingTop: 'env(safe-area-inset-top)' }
          : undefined
      }
    >
      {nativeMobile && (
        <div className="flex h-14 items-center justify-between gap-3 px-4 lg:hidden">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-1.5">
            <NotifButton
              open={notifOpen}
              setOpen={(v) => {
                setNotifOpen(v);
                if (v) setUserOpen(false);
              }}
              unread={unread}
              items={items}
              popoverRef={notifRef}
              markAll={markAll}
              markOne={markOne}
              navigate={navigate}
            />
            <Link
              to="/profil"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(7,132,74,0.35)] ring-2 ring-primary/15"
              title="Profil"
            >
              {initials}
            </Link>
          </div>
        </div>
      )}

      <div
        className={cn(
          'flex h-16 items-center justify-between gap-4 px-4 lg:px-6',
          nativeMobile && 'hidden border-t border-border/60 lg:flex lg:border-0',
          hideTitleOnMobile && 'hidden lg:flex',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {!nativeMobile && (
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95 lg:hidden"
              onClick={onMenuClick}
              aria-label="Buka menu"
            >
              <Menu size={18} />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-tight tracking-tight text-[var(--text-primary)] lg:text-[17px]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 hidden truncate text-xs text-[var(--text-secondary)] sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isPenangkar && (
            <div className="relative hidden md:block" ref={searchRef}>
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => {
                  setSearchOpen(true);
                  setNotifOpen(false);
                  setUserOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredPages[0]) {
                    e.preventDefault();
                    goTo(filteredPages[0].to);
                  }
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
                placeholder="Cari menu..."
                className="h-10 w-44 rounded-xl border border-border bg-slate-50/80 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10 lg:w-56"
              />
              {searchOpen && (
                <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-xl">
                  {filteredPages.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-slate-500">
                      Tidak ada menu yang cocok
                    </div>
                  ) : (
                    filteredPages.map((p) => (
                      <button
                        key={p.to}
                        type="button"
                        onClick={() => goTo(p.to)}
                        className="flex w-full flex-col px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <span className="text-sm font-medium text-slate-800">
                          {p.label}
                        </span>
                        <span className="text-[11px] text-slate-500">{p.hint}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className={cn(nativeMobile && 'hidden lg:block')}>
            <NotifButton
              open={notifOpen}
              setOpen={(v) => {
                setNotifOpen(v);
                if (v) {
                  setUserOpen(false);
                  setSearchOpen(false);
                }
              }}
              unread={unread}
              items={items}
              popoverRef={notifRef}
              markAll={markAll}
              markOne={markOne}
              navigate={navigate}
            />
          </div>

          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => {
                setUserOpen((v) => !v);
                setNotifOpen(false);
                setSearchOpen(false);
              }}
              className="flex h-10 max-w-[220px] items-center gap-2 rounded-xl border border-border bg-white py-1 pl-1 pr-1.5 text-left transition hover:bg-slate-50 xl:pr-2.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-[11px] font-bold text-primary">
                {initials}
              </span>
              <span className="hidden min-w-0 xl:block">
                <span className="block truncate text-xs font-semibold leading-tight text-slate-800">
                  {user?.name}
                </span>
                <span className="block truncate text-[10px] leading-tight text-slate-500">
                  {displayRole}
                </span>
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  'hidden shrink-0 text-slate-400 transition xl:block',
                  userOpen && 'rotate-180',
                )}
              />
            </button>
            {userOpen && (
              <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-xl">
                <Link
                  to="/profil"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <UserRound size={15} />
                  Profil
                </Link>
                {hasPermission(PERMISSIONS.USER_MANAGE) && (
                  <Link
                    to="/pengaturan"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings size={15} />
                    Pengaturan
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-red-50"
                >
                  <LogOut size={15} />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

type NotifItem = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string | null;
};

function NotifButton({
  open,
  setOpen,
  unread,
  items,
  popoverRef,
  markAll,
  markOne,
  navigate,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  unread: number;
  items: NotifItem[];
  popoverRef: React.RefObject<HTMLDivElement | null>;
  markAll: { mutate: () => void };
  markOne: { mutate: (id: string) => void };
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className="relative" ref={popoverRef as React.Ref<HTMLDivElement>}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
        aria-label="Notifikasi"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <span className="text-sm font-semibold">Notifikasi</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="text-xs font-medium text-primary hover:underline"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--text-secondary)]">
                Tidak ada notifikasi
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.isRead) markOne.mutate(n.id);
                    setOpen(false);
                    if (n.link) navigate(n.link);
                  }}
                  className={`block w-full border-b border-border px-3 py-2.5 text-left hover:bg-slate-50 ${
                    n.isRead ? 'opacity-70' : ''
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-800">
                    {n.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                    {n.body}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
