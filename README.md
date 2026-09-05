# SIPERBUN — Sistem Informasi Perbenihan Perkebunan

Monorepo PNPM untuk manajemen perbenihan perkebunan Dinas Perkebunan Provinsi Kalimantan Selatan.

> **Peringatan keamanan:** Akun demo memakai password `password`. **Wajib diganti** sebelum production.

Stage **1–7 selesai**: fondasi, master data, produksi & pengajuan, inspeksi, sertifikat, label/distribusi/laporan, serta polish pengujian & deployment.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Android Penangkar:** Kotlin + Jetpack Compose (`apps/android-penangkar`)
- **Backend:** Express + Prisma + MySQL
- **Shared:** `@siperbun/shared`, `@siperbun/ui`, `@siperbun/config`

## Modul

| Modul | Path UI | API |
|---|---|---|
| Auth & role/permission | `/login` | `/auth/*` |
| Dashboard | `/dashboard` | `/dashboard/*` |
| Penangkar | `/penangkar` | `/producers` |
| Lokasi pembibitan | `/lokasi-pembibitan` | `/nursery-locations` |
| Kebun sumber | `/kebun-sumber` | `/seed-gardens` |
| Sumber benih | `/sumber-benih` | `/seed-sources` |
| Produksi | `/produksi` | `/production-batches` |
| Pengajuan sertifikasi | `/pengajuan` | `/certification-applications` |
| Penugasan & pemeriksaan | `/penugasan`, `/pemeriksaan` | `/field-assignments`, `/field-inspections` |
| Temuan | `/temuan` | `/findings` |
| Sertifikat | `/sertifikat` | `/certificates` |
| Label & distribusi | `/label-distribusi` | `/seed-labels`, `/seed-distributions` |
| Pengawasan peredaran | `/pengawasan` | `/circulation-inspections` |
| Laporan | `/laporan` | `/reports` |
| Peta | `/peta` | `/map` |
| Audit log | `/audit-log` | `/audit-logs` |
| Pengaturan | `/pengaturan` | `/users`, `/roles`, `/commodities`, `/regions` |

## Persyaratan

- Node.js >= 20
- PNPM 9 (`corepack enable` lalu `corepack prepare pnpm@9.15.9 --activate`)
- MySQL 8 (XAMPP disarankan di Windows)

## Instalasi

```powershell
Set-Location -LiteralPath "C:\Users\Baenk's\Documents\siperbun"
pnpm install
```

> Path dengan apostrophe (`Baenk's`) di PowerShell: selalu pakai `Set-Location -LiteralPath`.

## MySQL (XAMPP)

1. Jalankan MySQL dari XAMPP Control Panel, atau:
   ```powershell
   C:\xampp\mysql_start.bat
   ```
2. Buat database:
   ```sql
   CREATE DATABASE siperbun CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Salin env:
   - `apps/api/.env` dari `apps/api/.env.example`
   - `apps/web/.env` dari `apps/web/.env.example`
4. Default XAMPP:
   ```env
   DATABASE_URL="mysql://root:@127.0.0.1:3306/siperbun"
   ```

## Prisma & seed

```powershell
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm prisma:validate
```

Catatan: development memakai `db push`. Production sebaiknya baseline migrate setelah skema stabil (lihat `docs/database.md`).

## Menjalankan development

```powershell
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3111
- Swagger: http://localhost:3111/api/docs

## Akun demo

| Email | Password | Role |
|---|---|---|
| admin@siperbun.local | password | Super Admin |
| pimpinan@siperbun.local | password | Pimpinan |
| admin1@siperbun.local | password | Admin |
| ahmad@siperbun.local | password | PBT |
| penangkar1@siperbun.local | password | Penangkar |
| demo.penangkar@siperbun.local | password | Penangkar (demo semua alur aplikasi) |

Akun `demo.penangkar@siperbun.local` dibuat oleh seed utama atau seed additive `pnpm db:seed:demo-penangkar` (aman, tidak menghapus data lain). Isinya contoh semua status pengajuan, pembayaran, produksi, sertifikat, distribusi, dan notifikasi. Di aplikasi Android Penangkar ketuk **Masuk Demo**.
| demo.penangkar@siperbun.local | password | Penangkar (demo semua alur aplikasi) |

Akun `demo.penangkar@siperbun.local` dibuat oleh seed utama atau seed additive `pnpm db:seed:demo-penangkar` (aman, tidak menghapus data lain). Isinya contoh semua status pengajuan, pembayaran, produksi, sertifikat, distribusi, dan notifikasi. Di aplikasi Android Penangkar ketuk **Masuk Demo**.

## Perintah penting

```powershell
pnpm build              # build shared → ui → api → web
pnpm typecheck          # TypeScript di semua paket
pnpm lint               # saat ini = typecheck (honest alias)
pnpm test               # API (Vitest+supertest) + Web (Vitest+Testing Library)
pnpm prisma:validate    # validasi schema Prisma
```

## Production (ringkas)

```powershell
pnpm install
pnpm build
pnpm --filter @siperbun/api start   # API: node dist/server.js
pnpm --filter @siperbun/web preview # atau serve apps/web/dist via nginx/IIS
```

Detail Windows/Linux, PM2, SSL, backup: lihat [`docs/deployment.md`](docs/deployment.md).

## Struktur

```
apps/web          Frontend React
apps/api          Backend Express + Prisma + storage/
packages/shared   Enum, permission, schema bersama
packages/ui       Komponen UI dasar
packages/config   Shared tsconfig
docs/             Dokumentasi
ecosystem.config.cjs   Contoh PM2
```

## Dokumentasi

| File | Isi |
|---|---|
| [`docs/panduan-pengguna.md`](docs/panduan-pengguna.md) | **Panduan pakai per role + alur kerja lengkap** |
| [`docs/architecture.md`](docs/architecture.md) | Monorepo & alur request |
| [`docs/api.md`](docs/api.md) | Ringkasan endpoint |
| [`docs/database.md`](docs/database.md) | Model & soft delete |
| [`docs/roles-permissions.md`](docs/roles-permissions.md) | Role & PERMISSIONS |
| [`docs/certification-workflow.md`](docs/certification-workflow.md) | Alur status pengajuan |
| [`docs/deployment.md`](docs/deployment.md) | Deploy Windows/Linux |
| [`docs/deployment-aapanel-apache.md`](docs/deployment-aapanel-apache.md) | **Deploy aaPanel + Apache (lengkap)** |
| [`docs/testing.md`](docs/testing.md) | Cara menjalankan tes |
| [`apps/android-penangkar/README.md`](apps/android-penangkar/README.md) | Aplikasi Android Penangkar |
| [`docs/changelog-stages.md`](docs/changelog-stages.md) | Ringkasan Stage 1–7 |

## Troubleshooting

- **Port 3111 dipakai:** ubah `PORT` di `apps/api/.env` hanya jika diperlukan dan selaraskan konfigurasi PM2 serta Apache.
- **ECONNREFUSED MySQL:** pastikan XAMPP MySQL jalan dan DB `siperbun` ada.
- **Login gagal setelah seed:** jalankan ulang `pnpm db:seed`.
- **CORS / cookie refresh:** `CORS_ORIGIN` harus cocok dengan origin web; frontend memakai `withCredentials`.
- **Path apostrophe (Windows):** `Set-Location -LiteralPath "C:\Users\Baenk's\Documents\siperbun"`.
- **Upload file 404:** pastikan folder `apps/api/storage` writable (ada `.gitkeep`).
- **`pnpm lint`:** sengaja menjalankan `tsc --noEmit` (bukan ESLint penuh) — lihat catatan di README ini.
