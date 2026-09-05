# Arsitektur SIPERBUN

## Ringkasan

SIPERBUN memakai monorepo PNPM. React tidak mengakses MySQL langsung.

```
Browser (apps/web)
  → REST API Express (apps/api)  /api/v1
    → Middleware: auth, permission, validate, rate-limit
    → Service layer + Prisma ORM
      → MySQL
    → File storage lokal (apps/api/storage)
```

## Paket

| Paket | Peran |
|---|---|
| `apps/web` | Dashboard dinas, modul Stage 1–6, auth store (Zustand), React Query |
| `apps/api` | Auth JWT, CRUD & workflow, dashboard aggregasi, upload file |
| `packages/shared` | Role, `PERMISSIONS`, status enum, zod schema, konstanta |
| `packages/ui` | Utilitas `cn` dan komponen dasar |
| `packages/config` | Basis TypeScript config |

## Alur request tipikal

1. UI memanggil `VITE_API_URL` (default `http://localhost:3111/api/v1`)
2. Access token dikirim di header `Authorization: Bearer …`
3. Refresh token HTTP-only cookie (`siperbun_refresh`, path `/api/v1/auth`) dirotasi via `POST /auth/refresh`
4. Middleware `authenticate` + `requirePermission` / `requireAnyPermission`
5. Service menulis ke DB; operasi penting dicatat ke `AuditLog` / `ActivityLog` / notifikasi. Notifikasi penting juga dikirim ke perangkat Android lewat FCM jika token perangkat sudah terdaftar.

## Modul backend (Stage 1–6)

| Stage | Modul |
|---|---|
| 1 | Auth, roles/permissions, dashboard, layout web |
| 2 | Producers, nurseries, seed-gardens, regions, commodities, varieties |
| 3 | Seed-sources, production-batches, certification-applications |
| 4 | Field-assignments, field-inspections, findings, checklists |
| 5 | Certificates (+ upload scan / versioning), files |
| 6 | Seed-labels, seed-distributions, circulation, reports, audit-logs, map, notifications |
| 7 | Tes, optimasi query, responsive UI, dokumentasi & deployment |

## Model autentikasi

- Access JWT singkat di memori client (Zustand)
- Refresh token di DB (hash) + cookie; rotasi saat refresh
- `SUPER_ADMIN` bypass permission check di store & middleware
- Frontend `PermissionGuard` / menu hanya menyembunyikan UI; otorisasi nyata di API

## Storage

- Upload (scan sertifikat, foto inspeksi, dokumen) disimpan di `STORAGE_PATH` (default `./storage`)
- Metadata di tabel `StoredFile`; unduh via `GET /files/:id` (auth + permission)
