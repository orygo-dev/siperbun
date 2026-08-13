# Referensi API SIPERBUN

Base: `/api/v1` · Swagger UI: `/api/docs`

Hampir semua endpoint (kecuali health & auth login/refresh/forgot) membutuhkan Bearer token.

## Health

| Method | Path | Keterangan |
|---|---|---|
| GET | `/health` | Status API + ping DB |

## Auth

| Method | Path | Keterangan |
|---|---|---|
| POST | `/auth/login` | Login + set refresh cookie |
| POST | `/auth/refresh` | Rotasi refresh + access baru |
| POST | `/auth/logout` | Revoke refresh cookie |
| POST | `/auth/logout-all` | Revoke semua sesi (auth) |
| GET | `/auth/me` | Profil + roles/permissions |
| POST | `/auth/forgot-password` | Stub reset |
| POST | `/auth/reset-password` | Stub reset |

## Dashboard

Butuh `dashboard.view`.

| Method | Path |
|---|---|
| GET | `/dashboard/summary` |
| GET | `/dashboard/certification-status` |
| GET | `/dashboard/priorities` |
| GET | `/dashboard/production-by-commodity` |
| GET | `/dashboard/distribution-map` |
| GET | `/dashboard/today-inspections` |
| GET | `/dashboard/inspector-performance` |
| GET | `/dashboard/recent-applications` |
| GET | `/dashboard/certificate-scans` |
| GET | `/dashboard/recent-activities` |

## Producers

| Method | Path |
|---|---|
| GET | `/producers` |
| POST | `/producers` |
| GET | `/producers/:id` |
| PUT | `/producers/:id` |
| DELETE | `/producers/:id` |

## Nurseries

| Method | Path |
|---|---|
| GET/POST | `/nursery-locations` |
| GET/PUT/DELETE | `/nursery-locations/:id` |

## Seed gardens

| Method | Path |
|---|---|
| GET/POST | `/seed-gardens` |
| GET/PUT/DELETE | `/seed-gardens/:id` |

## Seed sources

| Method | Path |
|---|---|
| GET/POST | `/seed-sources` |
| GET/PUT/DELETE | `/seed-sources/:id` |

## Production batches

| Method | Path |
|---|---|
| GET/POST | `/production-batches` |
| GET/PUT/DELETE | `/production-batches/:id` |

## Certification applications

| Method | Path |
|---|---|
| GET/POST | `/certification-applications` |
| GET/PUT | `/certification-applications/:id` |
| POST | `/certification-applications/:id/submit` |
| POST | `/certification-applications/:id/verify` |
| POST | `/certification-applications/:id/request-revision` |
| POST | `/certification-applications/:id/assign` |

## Field assignments

| Method | Path |
|---|---|
| GET/POST | `/field-assignments` |
| GET/PUT | `/field-assignments/:id` |
| POST | `/field-assignments/:id/confirm` · `/reschedule` · `/cancel` |

## Field inspections

| Method | Path |
|---|---|
| GET | `/field-inspections` |
| GET | `/field-inspections/:id` |
| POST | `/field-inspections/:id/start` · `/checklist` · `/photos` · `/finalize` |

## Findings

| Method | Path |
|---|---|
| GET | `/findings` |
| GET/PUT | `/findings/:id` |
| POST | `/findings/:id/corrective-actions` |

## Certificates

| Method | Path |
|---|---|
| GET/POST | `/certificates` |
| GET | `/certificates/:id` |
| POST | `/certificates/:id/upload-scan` |
| POST | `/certificates/:id/verify-scan` |
| POST | `/certificates/:id/replace-scan` |

## Seed labels

| Method | Path |
|---|---|
| GET/POST | `/seed-labels` |
| GET/PUT | `/seed-labels/:id` |
| POST | `/seed-labels/:id/issue` · `/void` |

## Seed distributions

| Method | Path |
|---|---|
| GET/POST | `/seed-distributions` |
| GET/PUT/DELETE | `/seed-distributions/:id` |

## Circulation

| Method | Path |
|---|---|
| GET/POST | `/circulation-inspections` |
| GET/PUT | `/circulation-inspections/:id` |

## Reports

| Method | Path |
|---|---|
| GET | `/reports/summary` |
| GET | `/reports/certificates` · `/producers` · `/production` · `/inspections` |
| GET | `/reports/*/export?format=csv` |

## Audit logs

| Method | Path |
|---|---|
| GET | `/audit-logs` |

## Map

| Method | Path |
|---|---|
| GET | `/map/markers` |

## Notifications

| Method | Path |
|---|---|
| GET | `/notifications` |
| POST | `/notifications/:id/read` |
| POST | `/notifications/read-all` |

## Files

| Method | Path |
|---|---|
| GET | `/files/:id` | Stream file (auth) |

## Regions · Commodities · Varieties

| Method | Path |
|---|---|
| GET/POST/PUT/DELETE | `/regions`, `/commodities`, `/varieties` |

## Users · Roles

| Method | Path |
|---|---|
| GET/POST/PUT | `/users` |
| GET | `/users/inspectors` |
| GET | `/roles` |
