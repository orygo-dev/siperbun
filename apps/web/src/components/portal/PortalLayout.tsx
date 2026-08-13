import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { useBrandingStore } from '../../stores/brandingStore';
import { PortalBottomNav } from './PortalBottomNav';
import { cn } from '../../lib/utils';

export function PortalLayout() {
  const branding = useBrandingStore((s) => s.branding);
  const location = useLocation();
  const isDetail =
    location.pathname.startsWith('/portal/bibit/') ||
    /^\/portal\/penangkar\/[^/]+$/.test(location.pathname);

  return (
    <div className="portal-root min-h-screen bg-[#f2f4f3] text-slate-900 md:bg-[#f7f8f7]">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap"
      />
      <style>{`
        .portal-root { font-family: Manrope, system-ui, sans-serif; }
      `}</style>

      {/* Mobile app header */}
      <header
        className={cn(
          'sticky top-0 z-40 border-b border-black/[0.04] bg-[#f2f4f3]/92 backdrop-blur-xl md:hidden',
          isDetail && 'hidden',
        )}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link to="/portal" aria-label="Beranda portal" className="shrink-0">
            <BrandLogo size="sm" />
          </Link>
          <Link
            to="/login"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-800 shadow-sm ring-1 ring-black/[0.05] active:scale-95"
            aria-label="Login dinas"
          >
            <LogIn size={16} />
          </Link>
        </div>
      </header>

      {/* Desktop header */}
      <header className="sticky top-0 z-40 hidden border-b border-black/5 bg-[#f7f8f7]/95 backdrop-blur-md md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/portal" aria-label="Beranda portal" className="shrink-0">
            <BrandLogo size="md" />
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium text-slate-600">
            <NavLink
              to="/portal"
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 transition ${
                  isActive ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                }`
              }
            >
              Katalog
            </NavLink>
            <NavLink
              to="/portal/penangkar"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 transition ${
                  isActive ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                }`
              }
            >
              Penangkar
            </NavLink>
            <NavLink
              to="/portal/daftar"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 transition ${
                  isActive ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                }`
              }
            >
              Daftar
            </NavLink>
            <Link
              to="/login"
              className="ml-1 rounded-lg px-3 py-1.5 text-slate-500 transition hover:text-slate-900"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      <main
        className={cn(
          !isDetail &&
            'pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0',
          isDetail && 'pb-[env(safe-area-inset-bottom)] md:pb-0',
        )}
      >
        <Outlet />
      </main>

      <footer className="mt-16 hidden border-t border-black/5 md:block">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>{branding.officeName}</span>
          <span>© {new Date().getFullYear()} Portal publik</span>
        </div>
      </footer>

      {!isDetail && <PortalBottomNav />}
    </div>
  );
}
