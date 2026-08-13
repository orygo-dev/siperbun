# Roles & Permissions

Sumber kebenaran:
- `packages/shared/src/roles.ts`
- `packages/shared/src/permissions.ts`
- `packages/shared/src/rolePermissions.ts`
- sync DB: `apps/api/prisma/migrate-roles.ts` / seed

## Roles (5)

| Role | Fokus | Menu utama |
|---|---|---|
| `SUPER_ADMIN` | Seluruh akses + pengguna/pengaturan | Semua |
| `PIMPINAN` | Monitoring & laporan (tanpa penugasan/upload scan) | Dashboard, data master view, pengajuan, pemeriksaan, sertifikat, laporan, peta, audit |
| `ADMIN` | Operasional sertifikasi | Semua operasional + penugasan + label + pengawasan + katalog portal |
| `PBT` | Pemeriksaan lapangan sendiri | Dashboard, penangkar (lihat), pengajuan, pemeriksaan, temuan, sertifikat, peta |
| `PENANGKAR` | Data & pengajuan milik sendiri | Dashboard, produksi, pengajuan, pemeriksaan, sertifikat, peta |

### Pemetaan dari role lama

| Lama | Baru |
|---|---|
| `KEPALA_DINAS`, `KEPALA_UPTD` | `PIMPINAN` |
| `KOORDINATOR`, `ADMIN_SERTIFIKASI`, `ADMIN_KABUPATEN` | `ADMIN` |
| `SUPER_ADMIN`, `PBT`, `PENANGKAR` | tetap |

Migrasi in-place: `pnpm exec tsx prisma/migrate-roles.ts` (dari `apps/api`).

## Dashboard per role

| Role | Isi dashboard |
|---|---|
| Super Admin / Admin / Pimpinan | Ringkasan eksekutif global + prioritas operasional + peta + kinerja PBT + antrian scan |
| PBT | Jadwal & tugas sendiri + prioritas lapangan + pengajuan terkait tugas |
| Penangkar | Produksi/pengajuan/sertifikat milik sendiri + peta lokasi sendiri |

API dashboard mem-filter otomatis lewat `producerId` / `inspectorId` dari user login.

## Catatan

- Frontend (`PermissionGuard`, sidebar) hanya menyembunyikan UI.
- Otorisasi sebenarnya di middleware API (`requirePermission` / `requireAnyPermission`).
- `SUPER_ADMIN` dianggap memiliki semua permission.
- Label & distribusi: `certificate.upload` / `certificate.verify` (Admin).
- Pengaturan katalog portal: `producer.create` (Admin), bukan sekadar `producer.view`.
