import { useQuery } from '@tanstack/react-query';
import { LogIn, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { settingsApi } from '../../services/settings';
import { useBrandingStore } from '../../stores/brandingStore';
import { BrandLogo } from '../common/BrandLogo';
import { PortalBottomNav } from './PortalBottomNav';

const landingNav = [
  { href: '/portal', label: 'Beranda' },
  { href: '/portal#profil', label: 'Profil', section: 'profile' },
  { href: '/portal#layanan', label: 'Layanan Penangkar', section: 'services' },
  { href: '/portal#visi-misi', label: 'Visi & Misi', section: 'visionMission' },
  { href: '/portal#peta', label: 'Peta Sebaran', section: 'map' },
  { href: '/portal/bibit', label: 'Katalog Bibit' },
] as const;

export function PortalLayout() {
  const branding = useBrandingStore((state) => state.branding);
  const portalContentQuery = useQuery({
    queryKey: ['settings', 'portal-content'],
    queryFn: async () => (await settingsApi.getPortalContent()).data.data,
    staleTime: 60_000,
  });
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLanding = location.pathname === '/portal';
  const isDetail =
    location.pathname.startsWith('/portal/bibit/') ||
    /^\/portal\/penangkar\/[^/]+$/.test(location.pathname);
  const visibleNav = landingNav.filter((item) => {
    if (!('section' in item)) return true;
    return portalContentQuery.data?.content?.[item.section]?.enabled !== false;
  });

  return (
    <div className="portal-root min-h-screen bg-white text-[#15302a]">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" />
      <style>{`.portal-root { font-family: Manrope, system-ui, sans-serif; }`}</style>

      <header className={cn('sticky top-0 z-50 border-b border-[#e4ebe7] bg-white/96 backdrop-blur-xl', isDetail && 'hidden md:block')}>
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-5 px-4 sm:px-8">
          <Link to="/portal" aria-label="Beranda portal" className="shrink-0">
            <BrandLogo size="md" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama portal">
            {visibleNav.map((item) =>
              item.href.includes('#') ? (
                <a key={item.href} href={item.href} className="rounded-md px-3 py-2 text-[13px] font-semibold text-[#415b54] transition hover:bg-[#eef7f1] hover:text-[#0c4a3a]">{item.label}</a>
              ) : (
                <NavLink key={item.href} to={item.href} end={item.href === '/portal'} className={({ isActive }) => cn('rounded-md px-3 py-2 text-[13px] font-semibold transition hover:bg-[#eef7f1] hover:text-[#0c4a3a]', isActive ? 'text-[#0c4a3a]' : 'text-[#415b54]')}>{item.label}</NavLink>
              ),
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden h-10 items-center gap-2 rounded-lg bg-[#0c4a3a] px-4 text-sm font-semibold text-white transition hover:bg-[#083b2e] sm:inline-flex">
              <LogIn className="h-4 w-4" /> Masuk Sistem
            </Link>
            <button type="button" aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#dce6e1] text-[#0c4a3a] lg:hidden">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <nav className="border-t border-[#e4ebe7] bg-white px-4 py-3 lg:hidden" aria-label="Navigasi portal mobile">
            <div className="mx-auto grid max-w-[1400px] gap-1">
              {visibleNav.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#415b54] hover:bg-[#eef7f1] hover:text-[#0c4a3a]">{item.label}</a>
              ))}
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0c4a3a] text-sm font-semibold text-white sm:hidden">
                <LogIn className="h-4 w-4" /> Masuk Sistem
              </Link>
            </div>
          </nav>
        ) : null}
      </header>

      <main className={cn(!isLanding && !isDetail && 'pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0', isDetail && 'pb-[env(safe-area-inset-bottom)] md:pb-0')}>
        <Outlet />
      </main>

      <footer className="border-t border-[#dfe8e3] bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_0.6fr_0.6fr]">
          <div>
            <BrandLogo size="md" />
            <p className="mt-4 max-w-md text-sm leading-6 text-[#60756f]">{branding.officeName}</p>
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0c4a3a]">Informasi</h2>
            <div className="mt-3 grid gap-2 text-sm text-[#60756f]">
              {portalContentQuery.data?.content?.profile?.enabled !== false ? <a href="/portal#profil" className="hover:text-[#0c4a3a]">Profil Balai</a> : null}
              {portalContentQuery.data?.content?.visionMission?.enabled !== false ? <a href="/portal#visi-misi" className="hover:text-[#0c4a3a]">Visi & Misi</a> : null}
              {portalContentQuery.data?.content?.map?.enabled !== false ? <a href="/portal#peta" className="hover:text-[#0c4a3a]">Peta Sebaran</a> : null}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0c4a3a]">Layanan</h2>
            <div className="mt-3 grid gap-2 text-sm text-[#60756f]">
              <Link to="/portal/bibit" className="hover:text-[#0c4a3a]">Katalog Bibit</Link>
              <Link to="/portal/penangkar" className="hover:text-[#0c4a3a]">Daftar Penangkar</Link>
              <Link to="/portal/daftar" className="hover:text-[#0c4a3a]">Pendaftaran</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-[#e5ece8] px-5 py-5 text-center text-xs text-[#7a8c86]">
          © {new Date().getFullYear()} {branding.officeName}. Seluruh hak dilindungi.
        </div>
      </footer>

      {!isLanding && !isDetail ? <PortalBottomNav /> : null}
    </div>
  );
}
