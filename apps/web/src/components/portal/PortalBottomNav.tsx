import { NavLink } from 'react-router-dom';
import { Leaf, LogIn, UserPlus, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

const tabs = [
  { to: '/portal', label: 'Katalog', icon: Leaf, end: true },
  { to: '/portal/penangkar', label: 'Penangkar', icon: Users },
  { to: '/portal/daftar', label: 'Daftar', icon: UserPlus },
  { to: '/login', label: 'Login', icon: LogIn },
] as const;

export function PortalBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-black/[0.06] bg-white/92 backdrop-blur-2xl md:hidden"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
      aria-label="Menu portal"
    >
      <ul className="mx-auto flex h-[3.4rem] max-w-lg items-stretch">
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
                      isActive ? 'text-emerald-700' : 'text-slate-400',
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-semibold tracking-tight',
                      isActive ? 'text-emerald-700' : 'text-slate-400',
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
