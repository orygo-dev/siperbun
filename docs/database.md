# Database

Provider: **MySQL** via Prisma.

## Domain utama

| Domain | Model |
|---|---|
| Auth | User, Role, Permission, UserRole, RolePermission, RefreshToken |
| Master | Office, Region, Commodity, Variety, SeedStandard |
| Penangkar | Producer, NurseryLocation, SeedGarden, SeedSource (+ dokumen) |
| Produksi | ProductionBatch, ProductionLog |
| Sertifikasi | CertificationApplication, ApplicationStatusHistory, FieldAssignment, FieldInspection |
| Temuan | Finding, CorrectiveAction, InspectionChecklist* |
| Sertifikat | Certificate, CertificateVersion, StoredFile |
| Distribusi & pengawasan | SeedLabel, SeedDistribution, CirculationInspection |
| Sistem | Notification, ActivityLog, AuditLog, AppSetting |

## Catatan desain

- **UUID** (`Char(36)`) sebagai primary key
- **Soft delete** lewat kolom `deletedAt` pada entitas bisnis
- **BigInt** untuk jumlah bibit / stok
- **Decimal** untuk koordinat & luas
- Enum Prisma untuk status aplikasi, penugasan, sertifikat, temuan, produksi

## Migrasi & development

| Lingkungan | Pendekatan |
|---|---|
| Development | `pnpm db:push` (cepat, tanpa history migrasi) |
| Production | Disarankan `prisma migrate` setelah **baseline** skema pertama kali |

Setelah skema stabil:

```bash
# contoh baseline (sesuaikan tim)
pnpm --filter @siperbun/api exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
pnpm --filter @siperbun/api exec prisma migrate resolve --applied 0_init
```

Validasi schema:

```bash
pnpm prisma:validate
```

## Seed

`pnpm db:seed` mengisi roles/permissions, wilayah Kalsel, komoditas, user demo, data contoh penangkar–sertifikat.
