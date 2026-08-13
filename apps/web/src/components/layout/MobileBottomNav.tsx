import { NavLink } from 'react-router-dom';
import {
  Award,
  FileText,
  LayoutDashboard,
  Leaf,
  UserRound,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const tabs = [
  { to: '/dashboard', label: 'Beranda', icon: LayoutDashboard, end: true },
  { to: '/produksi', label: 'Produksi', icon: Leaf },
  { to: '/pengajuan', label: 'Pengajuan', icon: FileText },
  { to: '/sertifikat', label: 'Sertifikat', icon: Award },
  { to: '/profil', label: 'Profil', icon: UserRound },
] as const;

/** Tab bar gaya aplikasi native (iOS/Android) */
export function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-white/92 backdrop-blur-2xl lg:hidden"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
      aria-label="Menu utama"
    >
      <ul className="mx-auto flex h-[3.35rem] max-w-lg items-stretch justify-between px-1">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={'end' in tab ? tab.end : false}
              className="flex h-full flex-col items-center justify-center gap-0.5 active:opacity-70"
            >
              {({ isActive }) => (
                <>
                  <tab.icon
                    size={22}
                    strokeWidth={isActive ? 2.35 : 1.85}
                    className={cn(
                      'transition-colors',
                      isActive ? 'text-primary' : 'text-slate-400',
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-semibold tracking-tight',
                      isActive ? 'text-primary' : 'text-slate-400',
                    )}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
