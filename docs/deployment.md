# Deployment SIPERBUN

## Build lokal

```powershell
Set-Location -LiteralPath "C:\Users\Baenk's\Documents\siperbun"
pnpm install
pnpm db:generate
pnpm build
```

Artefak:

- API: `apps/api/dist`
- Web: `apps/web/dist`

---

## Windows + XAMPP

### 1. MySQL

1. Jalankan MySQL dari XAMPP Control Panel (atau `C:\xampp\mysql_start.bat`).
2. Buat database:
   ```sql
   CREATE DATABASE siperbun CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### 2. Environment

`apps/api/.env` (contoh):

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/siperbun"
JWT_ACCESS_SECRET=<rahasia-panjang>
JWT_REFRESH_SECRET=<rahasia-panjang-lain>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
PORT=3111
NODE_ENV=production
CORS_ORIGIN=https://siperbun.example.go.id
COOKIE_SECURE=true
STORAGE_PATH=./storage
```

`apps/web/.env` (saat build):

```env
VITE_API_URL=https://siperbun.example.go.id/api/v1
```

### 3. Install & skema

```powershell
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed   # jangan dijalankan di production: seed menghapus seluruh tabel kecuali ALLOW_DB_SEED=true
pnpm build
```

### 4. Jalankan API

```powershell
pnpm --filter @siperbun/api start
# atau: node apps/api/dist/server.js
```

Opsi service Windows:

- **NSSM** — wrap `node dist/server.js` sebagai Windows Service
- **pm2-windows** — `pm2 start ecosystem.config.cjs`

### 5. Serve frontend

Opsi:

1. `pnpm --filter @siperbun/web preview` (cepat, bukan ideal production)
2. **Nginx for Windows** — root ke `apps/web/dist`, proxy `/api` ke `127.0.0.1:3111`
3. **IIS** — Static site ke `dist` + URL Rewrite / ARR reverse proxy ke API

---

## Linux aaPanel + Apache (lengkap)

Panduan langkah demi langkah (Node 20, pnpm, MySQL, PM2 port 3111, reverse proxy Apache):

→ [`docs/deployment-aapanel-apache.md`](deployment-aapanel-apache.md)

Domain contoh di dokumen: `siperbun.rebornpartner.xyz`.

---

## Linux (nginx + PM2)

### Contoh nginx

```nginx
server {
  listen 443 ssl http2;
  server_name siperbun.example.go.id;

  ssl_certificate     /etc/ssl/certs/siperbun.crt;
  ssl_certificate_key /etc/ssl/private/siperbun.key;

  root /var/www/siperbun/apps/web/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3111;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### PM2

File `ecosystem.config.cjs` di root repo:

```bash
pnpm build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### SSL, cookie, CORS

- Aktifkan HTTPS
- `COOKIE_SECURE=true` di production
- `CORS_ORIGIN` harus tepat (origin frontend, termasuk skema)
- Refresh cookie path: `/api/v1/auth` — pastikan reverse proxy tidak memutus path

### Storage

```bash
mkdir -p apps/api/storage
chown -R www-data:www-data apps/api/storage   # sesuaikan user proses Node
chmod 750 apps/api/storage
```

---

## Checklist production

- [ ] Ganti semua password demo (`admin@…`, `penangkar1@…`, dll.)
- [ ] JWT secrets kuat & unik
- [ ] HTTPS + `COOKIE_SECURE=true`
- [ ] CORS origin production
- [ ] Folder `storage/` writable + backup
- [ ] Backup MySQL terjadwal (`mysqldump` / snapshot)
- [ ] Monitoring proses (PM2 / NSSM) + log rotasi
- [ ] Rate limit auth aktif (sudah di kode)
- [ ] Setelah baseline: prefer `prisma migrate deploy` daripada `db push`

## Backup singkat

```bash
mysqldump -u root -p siperbun > backup-siperbun-$(date +%F).sql
tar -czf storage-$(date +%F).tar.gz apps/api/storage
```
