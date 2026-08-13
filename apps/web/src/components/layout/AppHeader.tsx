import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, LogOut, Menu, Search, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ROLES } from '@siperbun/shared';
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

export function AppHeader({
  title,
  subtitle,
  onMenuClick,
  nativeMobile = false,
  hideTitleOnMobile = false,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!popoverRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

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

  const unread = Number(notifQuery.data?.meta?.unreadCount ?? 0);
  const items = notifQuery.data?.data ?? [];
  const initials =
    user?.name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'U';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-white/95 backdrop-blur-xl',
        nativeMobile
          ? 'border-b border-black/[0.04] lg:border-border/80'
          : 'border-b border-border/80',
        nativeMobile && 'shadow-none lg:shadow-[0_4px_24px_rgba(15,23,42,0.06)]',
      )}
      style={
        nativeMobile
          ? { paddingTop: 'env(safe-area-inset-top)' }
          : undefined
      }
    >
      {/* Mobile native brand bar */}
      {nativeMobile && (
        <div className="flex items-center justify-between gap-3 px-4 pb-2.5 pt-3 lg:hidden">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-1.5">
            <NotifButton
              open={open}
              setOpen={setOpen}
              unread={unread}
              items={items}
              popoverRef={popoverRef}
              markAll={markAll}
              markOne={markOne}
              navigate={navigate}
            />
            <Link
              to="/profil"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-xs font-bold text-white shadow-[0_4px_12px_rgba(7,132,74,0.35)] ring-2 ring-primary/15"
              title="Profil"
            >
              {initials}
            </Link>
          </div>
        </div>
      )}

      <div
        className={cn(
          'flex items-start justify-between gap-4 px-4 py-3 lg:px-6 lg:py-4',
          nativeMobile && 'border-t border-border/60 py-2.5 lg:border-0',
          hideTitleOnMobile && 'hidden lg:flex',
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          {!nativeMobile && (
            <button
              type="button"
              className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-slate-600 shadow-sm transition active:scale-95 lg:hidden"
              onClick={onMenuClick}
              aria-label="Buka menu"
            >
              <Menu size={18} />
            </button>
          )}
          <div className="min-w-0">
            <h1
              className={cn(
                'truncate font-semibold text-[var(--text-primary)]',
                nativeMobile ? 'text-base' : 'text-lg lg:text-xl',
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className={cn(
                  'mt-0.5 text-[var(--text-secondary)]',
                  nativeMobile
                    ? 'line-clamp-1 text-xs'
                    : 'text-sm',
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 md:flex">
            <select className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-[var(--text-secondary)]">
              <option>Periode: 2026</option>
            </select>
            <select className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-[var(--text-secondary)]">
              <option>Semua Wilayah</option>
            </select>
            <select className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-[var(--text-secondary)]">
              <option>Semua Komoditas</option>
            </select>
          </div>

          <div className="relative hidden lg:block">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
            />
            <input
              placeholder="Cari..."
              className="h-9 w-44 rounded-lg border border-border bg-background pl-8 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>

          <div className={cn(nativeMobile && 'hidden lg:block')}>
            <NotifButton
              open={open}
              setOpen={setOpen}
              unread={unread}
              items={items}
              popoverRef={popoverRef}
              markAll={markAll}
              markOne={markOne}
              navigate={navigate}
            />
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-border px-2 py-1.5 lg:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-light text-primary">
              <User size={14} />
            </div>
            <div>
              <div className="text-xs font-medium leading-tight">{user?.name}</div>
              <div className="text-[10px] text-[var(--text-secondary)]">
                {user?.roles?.[0]?.replaceAll('_', ' ')}
              </div>
            </div>
            {isPenangkar && (
              <Link
                to="/profil"
                className="rounded p-1 text-[var(--text-secondary)] hover:text-primary"
                title="Profil"
              >
                <User size={14} />
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded p-1 text-[var(--text-secondary)] hover:text-danger"
              title="Keluar"
            >
              <LogOut size={14} />
            </button>
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
  setOpen: (v: boolean | ((p: boolean) => boolean)) => void;
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
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-slate-600 shadow-sm transition active:scale-95"
        aria-label="Notifikasi"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
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
