import { FileSearch, Image, Images, LayoutTemplate, Leaf, MapPinned, Smartphone, Sprout, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { PermissionGuard } from '../../components/common/PermissionGuard';
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '@siperbun/shared';

const cards: Array<{
  to: string;
  title: string;
  description: string;
  icon: typeof Users;
  permission: string;
  superAdminOnly?: boolean;
}> = [
  {
    to: '/pengaturan/konten-portal',
    title: 'Konten Portal',
    description: 'Kelola landing page publik, layanan, visi, misi, dan kontak',
    icon: LayoutTemplate,
    permission: PERMISSIONS.USER_MANAGE,
    superAdminOnly: true,
  },
  {
    to: '/pengaturan/pengguna',
    title: 'Pengguna',
    description: 'Tambah akun, atur role, aktif/nonaktifkan akses',
    icon: Users,
    permission: PERMISSIONS.USER_MANAGE,
  },
  {
    to: '/pengaturan/branding',
    title: 'Branding Aplikasi',
    description: 'Nama aplikasi, nama instansi, dan logo',
    icon: Image,
    permission: PERMISSIONS.USER_MANAGE,
  },
  {
    to: '/pengaturan/banner',
    title: 'Banner Dashboard',
    description: 'Slide pengumuman di halaman dashboard dinas',
    icon: Images,
    permission: PERMISSIONS.USER_MANAGE,
  },
  {
    to: '/pengaturan/banner-mobile',
    title: 'Banner Slide Mobile',
    description: 'Slide banner untuk portal publik dan penangkar',
    icon: Smartphone,
    permission: PERMISSIONS.USER_MANAGE,
  },
  {
    to: '/pengaturan/katalog',
    title: 'Katalog Bibit Portal',
    description: 'Listing bibit publik dengan foto thumbnail',
    icon: Sprout,
    permission: PERMISSIONS.PRODUCER_CREATE,
  },
  {
    to: '/pengaturan/pendaftaran-penangkar',
    title: 'Pendaftaran Calon Penangkar',
    description: 'Antrian pendaftaran dari portal publik',
    icon: UserPlus,
    permission: PERMISSIONS.PRODUCER_CREATE,
  },
  {
    to: '/pengaturan/komoditas',
    title: 'Komoditas & Varietas',
    description: 'Master data komoditas dan varietas bibit',
    icon: Leaf,
    permission: PERMISSIONS.USER_MANAGE,
  },
  {
    to: '/pengaturan/wilayah',
    title: 'Wilayah',
    description: 'Data wilayah administratif Kalimantan Selatan',
    icon: MapPinned,
    permission: PERMISSIONS.USER_MANAGE,
  },
  {
    to: '/audit-log',
    title: 'Audit Log',
    description: 'Riwayat perubahan data dan aktivitas sistem',
    icon: FileSearch,
    permission: PERMISSIONS.AUDIT_VIEW,
  },
];

export function SettingsHubPage() {
  const hasAny = useAuthStore((s) => s.hasAnyPermission);
  const user = useAuthStore((s) => s.user);

  if (
    !hasAny(
      PERMISSIONS.USER_MANAGE,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.PRODUCER_CREATE,
    )
  ) {
    return (
      <div className="text-sm text-[var(--text-secondary)]">
        Anda tidak memiliki akses ke pengaturan.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Pengaturan"
        subtitle="Konfigurasi master data dan pengguna sistem"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.filter((card) => !card.superAdminOnly || user?.roles.includes('SUPER_ADMIN')).map((card) => (
          <PermissionGuard key={card.to} permission={card.permission}>
            <Link
              to={card.to}
              className="rounded-xl border border-border bg-white p-5 shadow-soft transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <card.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">{card.title}</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {card.description}
              </p>
            </Link>
          </PermissionGuard>
        ))}
      </div>
    </div>
  );
}
