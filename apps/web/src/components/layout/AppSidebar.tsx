import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCog,
  MapPin,
  TreePine,
  Sprout,
  Leaf,
  FileText,
  ClipboardList,
  ClipboardCheck,
  AlertTriangle,
  Award,
  Tags,
  Shield,
  BarChart3,
  Settings,
  Map,
  ChevronLeft,
  ChevronRight,
  UserRound,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { BrandLogo } from '../common/BrandLogo';
import { useAuthStore } from '../../stores/authStore';
import { useBrandingStore } from '../../stores/brandingStore';
import { PERMISSIONS, ROLES } from '@siperbun/shared';

const menus: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  perm?: string;
  anyPerm?: string[];
  roles?: string[];
}> = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: PERMISSIONS.DASHBOARD_VIEW },
  { to: '/penangkar', label: 'Penangkar', icon: Users, perm: PERMISSIONS.PRODUCER_VIEW },
  { to: '/lokasi-pembibitan', label: 'Lokasi Pembibitan', icon: MapPin, perm: PERMISSIONS.NURSERY_VIEW },
  { to: '/kebun-sumber', label: 'Kebun Sumber', icon: TreePine, perm: PERMISSIONS.SEED_GARDEN_VIEW },
  { to: '/sumber-benih', label: 'Sumber Benih', icon: Sprout, perm: PERMISSIONS.PRODUCTION_VIEW },
  { to: '/produksi', label: 'Produksi Bibit', icon: Leaf, perm: PERMISSIONS.PRODUCTION_VIEW },
  { to: '/pengajuan', label: 'Pengajuan Sertifikasi', icon: FileText, perm: PERMISSIONS.APPLICATION_VIEW },
  {
    to: '/penugasan',
    label: 'Penugasan',
    icon: ClipboardList,
    perm: PERMISSIONS.APPLICATION_ASSIGN,
  },
  {
    to: '/pemeriksaan',
    label: 'Pemeriksaan Lapangan',
    icon: ClipboardCheck,
    perm: PERMISSIONS.INSPECTION_VIEW,
  },
  {
    to: '/temuan',
    label: 'Temuan',
    icon: AlertTriangle,
    perm: PERMISSIONS.INSPECTION_VIEW,
  },
  { to: '/sertifikat', label: 'Sertifikat', icon: Award, perm: PERMISSIONS.CERTIFICATE_VIEW },
  {
    to: '/label-distribusi',
    label: 'Label & Distribusi',
    icon: Tags,
    anyPerm: [PERMISSIONS.CERTIFICATE_UPLOAD, PERMISSIONS.CERTIFICATE_VERIFY],
  },
  {
    to: '/pengawasan',
    label: 'Pengawasan',
    icon: Shield,
    anyPerm: [PERMISSIONS.APPLICATION_VERIFY, PERMISSIONS.CERTIFICATE_VERIFY],
  },
  { to: '/laporan', label: 'Laporan', icon: BarChart3, perm: PERMISSIONS.REPORT_VIEW },
  {
    to: '/peta',
    label: 'Peta',
    icon: Map,
    anyPerm: [PERMISSIONS.PRODUCER_VIEW, PERMISSIONS.APPLICATION_VERIFY],
  },
  {
    to: '/profil',
    label: 'Profil',
    icon: UserRound,
    roles: [ROLES.PENANGKAR],
  },
  {
    to: '/pengaturan/pengguna',
    label: 'Pengguna',
    icon: UserCog,
    perm: PERMISSIONS.USER_MANAGE,
  },
  {
    to: '/pengaturan',
    label: 'Pengaturan',
    icon: Settings,
    anyPerm: [
      PERMISSIONS.USER_MANAGE,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.PRODUCER_CREATE,
    ],
  },
];

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  /** Mode native penangkar: sidebar hanya di desktop */
  hideOnMobile?: boolean;
};

export function AppSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
  hideOnMobile = false,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);
  const branding = useBrandingStore((s) => s.branding);
  const visible = menus.filter((m) => {
    if (m.roles?.length) {
      return m.roles.some((r) => user?.roles.includes(r));
    }
    if (m.anyPerm) return hasAnyPermission(...m.anyPerm);
    if (m.perm) return hasPermission(m.perm);
    return true;
  });
  const showExpanded = hideOnMobile ? !collapsed : mobileOpen || !collapsed;

  return (
    <>
      {mobileOpen && !hideOnMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-white transition-all duration-200',
          collapsed ? 'lg:w-[72px]' : 'lg:w-64',
          hideOnMobile
            ? 'hidden lg:flex'
            : mobileOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center border-b border-border px-4">
          <BrandLogo size="md" />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white shadow-soft'
                    : 'text-[var(--text-secondary)] hover:bg-primary-light hover:text-primary',
                  !showExpanded && 'justify-center px-2',
                )
              }
              title={item.label}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" size={18} />
              {showExpanded && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {showExpanded && (
          <div className="m-3 rounded-xl border border-border bg-primary-light p-3">
            <div className="text-xs font-semibold text-primary line-clamp-2">
              {branding.officeName}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onToggle}
          className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-white text-[var(--text-secondary)] shadow-soft lg:flex"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>
    </>
  );
}
