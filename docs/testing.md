# Pengujian SIPERBUN

## Menjalankan tes

Prasyarat API tests: MySQL jalan, schema ter-push, seed sudah dijalankan.

```powershell
Set-Location -LiteralPath "C:\Users\Baenk's\Documents\siperbun"
pnpm db:push
pnpm db:seed
pnpm test
```

Per paket:

```powershell
pnpm --filter @siperbun/api test
pnpm --filter @siperbun/web test
pnpm --filter @siperbun/web test:watch
```

## Cakupan API (`apps/api/tests`)

| File | Fokus |
|---|---|
| `auth.test.ts` | Health, login invalid/valid |
| `producers.test.ts` | List/create producer, regions |
| `stage3.test.ts` | Seed source, production, submit application |
| `stage4.test.ts` | Assignment / inspection flow |
| `stage5.test.ts` | Certificate upload & verify |
| `stage6.test.ts` | Labels, distribusi, circulation, reports, audit |
| `stage7.test.ts` | Refresh token, dashboard auth, 403 penangkar, producer update, verify flow, file auth |

Stage 7 **gagal keras** jika login demo gagal (DB harus ter-seed).

## Cakupan Web (`apps/web`)

| File | Fokus |
|---|---|
| `StatusBadge.test.tsx` | Label status dikenal |
| `PermissionGuard.test.tsx` | Sembunyi/tampil berdasarkan permission |
| `LoginPage.test.tsx` | Validasi form (email/password) |

Stack: Vitest + Testing Library + jsdom. Leaflet di-mock di `src/test/setup.ts`.

## Catatan lint

`pnpm lint` di api/web/shared/ui menjalankan `tsc --noEmit` (typecheck jujur). ESLint flat config penuh belum diwajibkan di Stage 7.
