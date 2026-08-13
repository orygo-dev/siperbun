import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ROLES } from '@siperbun/shared';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { MobileBottomNav } from './MobileBottomNav';

const titles: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': {
    title: 'Dashboard Dinas',
    subtitle: 'Monitoring layanan perbenihan dan sertifikasi bibit perkebunan',
  },
  '/penangkar': { title: 'Penangkar', subtitle: 'Data penangkar bibit perkebunan' },
  '/penangkar/tambah': { title: 'Tambah Penangkar', subtitle: 'Formulir data penangkar baru' },
  '/lokasi-pembibitan': {
    title: 'Lokasi Pembibitan',
    subtitle: 'Peta dan data lokasi pembibitan',
  },
  '/lokasi-pembibitan/tambah': {
    title: 'Tambah Lokasi',
    subtitle: 'Formulir lokasi pembibitan baru',
  },
  '/kebun-sumber': { title: 'Kebun Sumber', subtitle: 'Data kebun sumber benih' },
  '/kebun-sumber/tambah': {
    title: 'Tambah Kebun Sumber',
    subtitle: 'Formulir kebun sumber baru',
  },
  '/sumber-benih': { title: 'Sumber Benih', subtitle: 'Stok dan asal sumber benih' },
  '/sumber-benih/tambah': {
    title: 'Tambah Sumber Benih',
    subtitle: 'Formulir sumber benih baru',
  },
  '/produksi': { title: 'Produksi Bibit', subtitle: 'Batch produksi bibit' },
  '/produksi/tambah': {
    title: 'Tambah Batch Produksi',
    subtitle: 'Formulir batch produksi baru',
  },
  '/pengajuan': { title: 'Pengajuan Sertifikasi', subtitle: 'Permohonan sertifikasi bibit' },
  '/pengajuan/tambah': {
    title: 'Tambah Pengajuan',
    subtitle: 'Formulir pengajuan sertifikasi baru',
  },
  '/penugasan': { title: 'Penugasan PBT', subtitle: 'Jadwal dan penugasan pemeriksaan' },
  '/pemeriksaan': { title: 'Pemeriksaan Lapangan', subtitle: 'Hasil dan progres pemeriksaan PBT' },
  '/temuan': { title: 'Temuan', subtitle: 'Temuan dan tindakan perbaikan' },
  '/sertifikat': { title: 'Sertifikat', subtitle: 'Penerbitan dan scan sertifikat' },
  '/sertifikat/tambah': {
    title: 'Tambah Sertifikat',
    subtitle: 'Buat sertifikat dari pengajuan yang lulus',
  },
  '/label-distribusi': { title: 'Label & Distribusi', subtitle: 'Label dan distribusi bibit' },
  '/pengawasan': { title: 'Pengawasan', subtitle: 'Pengawasan peredaran bibit' },
  '/laporan': { title: 'Laporan', subtitle: 'Laporan operasional dan kinerja' },
  '/peta': { title: 'Peta', subtitle: 'Peta persebaran perbenihan' },
  '/profil': { title: 'Profil', subtitle: 'Kelola akun dan keamanan' },
  '/audit-log': { title: 'Audit Log', subtitle: 'Riwayat perubahan data sistem' },
  '/pengaturan': { title: 'Pengaturan', subtitle: 'Konfigurasi sistem' },
  '/pengaturan/branding': {
    title: 'Branding Aplikasi',
    subtitle: 'Nama aplikasi, instansi, dan logo',
  },
  '/pengaturan/pengguna': { title: 'Pengguna', subtitle: 'Kelola akun dan role' },
  '/pengaturan/komoditas': {
    title: 'Komoditas & Varietas',
    subtitle: 'Master data komoditas',
  },
  '/pengaturan/wilayah': { title: 'Wilayah', subtitle: 'Data wilayah administratif' },
};

function resolveTitle(pathname: string, isPenangkar: boolean) {
  if (pathname === '/dashboard' && isPenangkar) {
    return {
      title: 'Beranda',
      subtitle: 'Ringkasan produksi dan pengajuan Anda',
    };
  }
  if (titles[pathname]) return titles[pathname];
  const keys = Object.keys(titles).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (pathname.startsWith(`${key}/`)) {
      if (key === '/penangkar') {
        if (pathname.endsWith('/edit')) {
          return { title: 'Edit Penangkar', subtitle: 'Ubah data penangkar' };
        }
        return { title: 'Detail Penangkar', subtitle: 'Informasi penangkar' };
      }
      if (key === '/lokasi-pembibitan') {
        if (pathname.endsWith('/edit')) {
          return { title: 'Edit Lokasi', subtitle: 'Ubah lokasi pembibitan' };
        }
        return { title: 'Detail Lokasi', subtitle: 'Informasi lokasi pembibitan' };
      }
      if (key === '/kebun-sumber') {
        if (pathname.endsWith('/edit')) {
          return { title: 'Edit Kebun Sumber', subtitle: 'Ubah data kebun sumber' };
        }
        return { title: 'Detail Kebun Sumber', subtitle: 'Informasi kebun sumber' };
      }
      if (key === '/sumber-benih') {
        if (pathname.endsWith('/edit')) {
          return { title: 'Edit Sumber Benih', subtitle: 'Ubah data sumber benih' };
        }
        return { title: 'Detail Sumber Benih', subtitle: 'Informasi sumber benih' };
      }
      if (key === '/produksi') {
        if (pathname.endsWith('/edit')) {
          return { title: 'Edit Batch Produksi', subtitle: 'Ubah data produksi' };
        }
        return { title: 'Detail Produksi', subtitle: 'Informasi batch produksi' };
      }
      if (key === '/pengajuan') {
        return { title: 'Detail Pengajuan', subtitle: 'Informasi pengajuan sertifikasi' };
      }
      if (key === '/penugasan') {
        return { title: 'Detail Penugasan', subtitle: 'Informasi penugasan PBT' };
      }
      if (key === '/pemeriksaan') {
        return { title: 'Detail Pemeriksaan', subtitle: 'Hasil pemeriksaan lapangan' };
      }
      if (key === '/temuan') {
        return { title: 'Detail Temuan', subtitle: 'Temuan dan perbaikan' };
      }
      if (key === '/sertifikat') {
        if (pathname.endsWith('/upload-scan')) {
          return {
            title: 'Unggah Scan Sertifikat',
            subtitle: 'Unggah berkas scan sertifikat',
          };
        }
        if (pathname.endsWith('/tambah')) {
          return {
            title: 'Tambah Sertifikat',
            subtitle: 'Buat sertifikat dari pengajuan yang lulus',
          };
        }
        return { title: 'Detail Sertifikat', subtitle: 'Informasi dan versi scan' };
      }
      if (key === '/label-distribusi') {
        if (pathname.includes('/label/tambah')) {
          return { title: 'Tambah Label', subtitle: 'Formulir label baru' };
        }
        if (pathname.includes('/distribusi/tambah')) {
          return {
            title: 'Tambah Distribusi',
            subtitle: 'Formulir distribusi bibit',
          };
        }
        if (pathname.includes('/distribusi/')) {
          return { title: 'Detail Distribusi', subtitle: 'Informasi distribusi bibit' };
        }
        if (pathname.includes('/label/')) {
          return { title: 'Detail Label', subtitle: 'Informasi label sertifikat' };
        }
        return titles[key]!;
      }
      if (key === '/pengawasan') {
        if (pathname.endsWith('/tambah')) {
          return { title: 'Tambah Pengawasan', subtitle: 'Formulir pengawasan peredaran' };
        }
        return { title: 'Detail Pengawasan', subtitle: 'Hasil pengawasan peredaran' };
      }
      if (key === '/laporan') {
        return { title: 'Detail Laporan', subtitle: 'Tabel dan ekspor laporan' };
      }
      return titles[key]!;
    }
  }
  return { title: 'SIPERBUN', subtitle: undefined };
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isPenangkar = user?.roles.includes(ROLES.PENANGKAR) ?? false;
  const nativeMobile = isPenangkar;
  const meta = resolveTitle(location.pathname, isPenangkar);

  return (
    <div
      className={cn(
        'min-h-screen',
        nativeMobile ? 'bg-[#f2f4f6] lg:bg-background' : 'bg-background',
      )}
    >
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        hideOnMobile={nativeMobile}
      />
      <div
        className={cn(
          'min-h-screen transition-all duration-200',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-64',
        )}
      >
        <AppHeader
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setMobileOpen(true)}
          nativeMobile={nativeMobile}
          hideTitleOnMobile={
            nativeMobile && location.pathname === '/dashboard'
          }
        />
        <main
          className={cn(
            nativeMobile
              ? 'px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-3 lg:p-6 lg:pb-6'
              : 'p-4 lg:p-6',
          )}
        >
          <Outlet />
        </main>
      </div>
      {nativeMobile && <MobileBottomNav />}
    </div>
  );
}
