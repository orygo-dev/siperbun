# Panduan Deploy SIPERBUN — aaPanel + Apache

Panduan lengkap untuk server Ubuntu + aaPanel (Apache), contoh path & domain:

| Item | Nilai |
|---|---|
| Domain | `siperbun.rebornpartner.xyz` |
| Root project | `/www/wwwroot/siperbun.rebornpartner.xyz` |
| Document root (frontend) | `/www/wwwroot/siperbun.rebornpartner.xyz/apps/web/dist` |
| API (PM2) | `127.0.0.1:3111` |

Sesuaikan nama domain/path jika berbeda.

---

## Arsitektur singkat

```text
Browser
  → Apache (HTTPS :443)
       → static: apps/web/dist
       → /api/*  proxy → Node/PM2 :3111
            → MySQL
```

---

## 0. Persiapan di aaPanel (GUI)

1. **App Store** → pastikan terpasang:
   - **Apache**
   - **MySQL 8** (atau MariaDB)
   - **Node.js Version Manager** / Node.js **20.x** (wajib ≥ 20)
   - **PM2 Manager** (opsional; bisa juga install PM2 via npm)
2. **Website** → Add site → domain `siperbun.rebornpartner.xyz`
3. **Database** → Add database + user → catat:
   - nama database
   - username
   - password
4. **SSL** → Let’s Encrypt untuk domain tersebut (HTTPS)
5. Apache modules (penting):
   - `mod_rewrite`
   - `mod_proxy`
   - `mod_proxy_http`
   - `mod_headers`

Cek via SSH:

```bash
apachectl -M 2>/dev/null | grep -E 'rewrite|proxy|headers' || httpd -M 2>/dev/null | grep -E 'rewrite|proxy|headers'
```

---

## 1. Install Node.js 20 + pnpm (perbaiki error `corepack: command not found`)

Error yang muncul:

```text
corepack: command not found
Command 'pnpm' not found
```

Artinya Node.js 20 belum aktif di shell (atau belum terpasang). Pilih **salah satu** cara di bawah.

### Cara A — Node dari aaPanel (disarankan)

1. aaPanel → **App Store** → **Node.js Version Manager** → install **Node 20.x**
2. Set sebagai default versi 20
3. SSH ulang / reload PATH, lalu cek:

```bash
node -v    # harus v20.x.x atau lebih tinggi
npm -v
which node
```

Jika `node -v` masih kosong/lama, cari binary aaPanel (path bisa berbeda):

```bash
ls /www/server/nodejs/
# contoh aktifkan (sesuaikan versi folder):
export PATH="/www/server/nodejs/v20.18.0/bin:$PATH"
echo 'export PATH="/www/server/nodejs/v20.18.0/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
node -v
```

Lalu aktifkan pnpm:

```bash
# Node 20+ biasanya punya corepack
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm -v
```

Jika `corepack` tetap tidak ada:

```bash
npm install -g pnpm@9.15.9
pnpm -v
```

### Cara B — NodeSource (jika aaPanel Node bermasalah)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v
npm install -g pnpm@9.15.9 pm2
pnpm -v
pm2 -v
```

### Install PM2 (jika belum)

```bash
npm install -g pm2
pm2 -v
```

---

## 2. Clone project

Jika folder situs aaPanel masih berisi file default (`index.html`, dll.):

```bash
cd /www/wwwroot/siperbun.rebornpartner.xyz
# backup isi default bila perlu
mkdir -p /root/backup-siperbun-site
mv ./* ./.[!.]* /root/backup-siperbun-site/ 2>/dev/null || true

git clone https://github.com/orygo-dev/siperbun.git .
```

Jika sudah di-clone (seperti log Anda), lanjut dari langkah Node/pnpm saja:

```bash
cd /www/wwwroot/siperbun.rebornpartner.xyz
ls   # harus terlihat: apps, packages, ecosystem.config.cjs, package.json, ...
```

Install dependency:

```bash
pnpm install
```

> Catatan: `postinstall` menjalankan `prisma generate`. Jika gagal karena `.env` belum ada, lanjut buat `.env` dulu (langkah 3), lalu `pnpm install` / `pnpm db:generate` ulang.

---

## 3. Environment

### 3.1 API — `apps/api/.env`

```bash
cd /www/wwwroot/siperbun.rebornpartner.xyz
cp apps/api/.env.example apps/api/.env
nano apps/api/.env
```

Generate secret kuat dulu (**wajib ≥ 32 karakter** di production; kalau lebih pendek API crash):

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Isi contoh (ganti nilai rahasia & DB):

```env
DATABASE_URL="mysql://USER_DB:PASSWORD_DB@127.0.0.1:3306/NAMA_DB"
JWT_ACCESS_SECRET=<hasil-openssl-1>
JWT_REFRESH_SECRET=<hasil-openssl-2>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
PORT=3111
NODE_ENV=production
CORS_ORIGIN=https://siperbun.rebornpartner.xyz
COOKIE_SECURE=true
STORAGE_PATH=./storage
```

Tips:

- Jangan pakai nilai contoh `.env.example` (`change-me-access-secret`) — terlalu pendek.
- Password di `DATABASE_URL`: karakter khusus (`@`, `#`, `%`, dll.) harus di-URL-encode.

### 3.2 Web — `apps/web/.env`

**Wajib diisi sebelum `pnpm build`.**

```bash
cp apps/web/.env.example apps/web/.env
nano apps/web/.env
```

```env
VITE_API_URL=https://siperbun.rebornpartner.xyz/api/v1
```

---

## 4. Database, storage, build

```bash
cd /www/wwwroot/siperbun.rebornpartner.xyz

pnpm db:generate
pnpm db:push
# Jangan seed di production: perintah ini menghapus seluruh tabel.
# Hanya jika sadar risikonya: ALLOW_DB_SEED=true pnpm db:seed
# pnpm db:seed

mkdir -p apps/api/storage
chmod 750 apps/api/storage

pnpm build
```

Pastikan hasil build ada:

```bash
ls apps/api/dist/server.js
ls apps/web/dist/index.html
```

---

## 5. Jalankan API dengan PM2 (port 3111)

```bash
cd /www/wwwroot/siperbun.rebornpartner.xyz

pm2 delete siperbun-api 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
# jalankan perintah `sudo env PATH=...` yang ditampilkan pm2 startup

curl -s http://127.0.0.1:3111/api/v1/health
pm2 status
pm2 logs siperbun-api --lines 30
```

`ecosystem.config.cjs` sudah set `PORT: 3111`. Pastikan `apps/api/.env` juga `PORT=3111`.

Jika ubah `.env` setelah PM2 jalan:

```bash
pm2 restart siperbun-api --update-env
```

---

## 6. Apache — Document Root

aaPanel → **Website** → `siperbun.rebornpartner.xyz` → **Root directory**:

```text
/www/wwwroot/siperbun.rebornpartner.xyz/apps/web/dist
```

Simpan.

---

## 7. Apache — reverse proxy `/api` + SPA

aaPanel → situs → **Config** (edit VirtualHost). Di dalam blok site (HTTP dan/atau HTTPS), pastikan ada konfigurasi setara berikut.

### Opsi A — ProxyPass (paling jelas)

```apache
DocumentRoot "/www/wwwroot/siperbun.rebornpartner.xyz/apps/web/dist"

<Directory "/www/wwwroot/siperbun.rebornpartner.xyz/apps/web/dist">
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted

    RewriteEngine On
    # SPA: file/folder tidak ada → index.html
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} !^/api/
    RewriteRule ^ index.html [L]
</Directory>

ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"
ProxyPass        /api/ http://127.0.0.1:3111/api/
ProxyPassReverse /api/ http://127.0.0.1:3111/api/
```

### Opsi B — Rewrite `[P]` (jika ProxyPass diblok panel)

```apache
DocumentRoot "/www/wwwroot/siperbun.rebornpartner.xyz/apps/web/dist"

<Directory "/www/wwwroot/siperbun.rebornpartner.xyz/apps/web/dist">
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted

    RewriteEngine On
    RewriteBase /

    RewriteCond %{REQUEST_URI} ^/api/ [NC]
    RewriteRule ^api/(.*)$ http://127.0.0.1:3111/api/$1 [P,L]

    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.html [L]
</Directory>

ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"
```

Lalu **Save** + **Reload Apache**.

---

## 8. Verifikasi

| Cek | Perintah / URL |
|---|---|
| Node | `node -v` → v20+ |
| pnpm | `pnpm -v` → 9.x |
| PM2 | `pm2 status` → `siperbun-api` online |
| API lokal | `curl -s http://127.0.0.1:3111/api/v1/health` |
| API publik | https://siperbun.rebornpartner.xyz/api/v1/health |
| Frontend | https://siperbun.rebornpartner.xyz |
| Login | https://siperbun.rebornpartner.xyz/login |

Akun seed (ganti password segera setelah live):

| Email | Password | Role |
|---|---|---|
| admin@siperbun.local | password | Super Admin |

---

## 9. Update kode di kemudian hari

```bash
cd /www/wwwroot/siperbun.rebornpartner.xyz
git pull
pnpm install
pnpm db:generate
pnpm db:push
pnpm build
pm2 restart siperbun-api --update-env
```

Setiap ubah `apps/web/.env` (`VITE_API_URL`) → **wajib `pnpm build` ulang**.

---

## 10. Checklist production

- [ ] Node ≥ 20, pnpm 9, PM2 online di port **3111**
- [ ] Apache DocumentRoot = `apps/web/dist`
- [ ] `/api/` diproxy ke `127.0.0.1:3111`
- [ ] SSL aktif, `COOKIE_SECURE=true`
- [ ] `CORS_ORIGIN=https://siperbun.rebornpartner.xyz`
- [ ] JWT secrets diganti (bukan contoh)
- [ ] Password akun demo diganti
- [ ] `apps/api/storage` writable
- [ ] Backup MySQL terjadwal

Backup singkat:

```bash
mysqldump -u USER_DB -p NAMA_DB > /root/backup-siperbun-$(date +%F).sql
tar -czf /root/storage-siperbun-$(date +%F).tar.gz \
  /www/wwwroot/siperbun.rebornpartner.xyz/apps/api/storage
```

---

## 11. Troubleshooting

| Gejala | Penyebab / perbaikan |
|---|---|
| `corepack: command not found` | Node 20 belum di PATH → pasang Node 20 (langkah 1), atau `npm i -g pnpm@9.15.9` |
| `pnpm: command not found` | Sama seperti di atas |
| `pnpm install` gagal Prisma | Buat `apps/api/.env` dulu, lalu `pnpm db:generate` |
| `JWT_ACCESS_SECRET must contain at least 32 characters` | Edit `apps/api/.env`, set secret ≥ 32 char (`openssl rand -hex 32`), lalu `pm2 restart siperbun-api --update-env` |
| API 502 / proxy error | `pm2 status`, `curl 127.0.0.1:3111/api/v1/health`, cek ProxyPass ke **3111** (bukan 3000) |
| Halaman refresh 404 | Aktifkan `mod_rewrite` + rule SPA ke `index.html` |
| Frontend call API ke localhost | `VITE_API_URL` salah / belum rebuild web |
| CORS / refresh token gagal | Samakan `CORS_ORIGIN` dengan origin HTTPS domain |
| Upload file gagal | Permission `apps/api/storage` |
| Port 3111 dipakai | `ss -tlnp \| grep 3111` lalu matikan proses bentrok |

Cek port:

```bash
ss -tlnp | grep 3111
curl -s http://127.0.0.1:3111/api/v1/health
pm2 logs siperbun-api --lines 100
```

---

## Urutan perintah ringkas (copy-paste setelah Node 20 siap)

```bash
export PATH="/www/server/nodejs/v20.18.0/bin:$PATH"   # sesuaikan versi folder Anda
hash -r
node -v && npm -v

# pnpm
corepack enable 2>/dev/null || true
corepack prepare pnpm@9.15.9 --activate 2>/dev/null || npm install -g pnpm@9.15.9
npm install -g pm2

cd /www/wwwroot/siperbun.rebornpartner.xyz
# pastikan apps/api/.env dan apps/web/.env sudah benar

pnpm install
pnpm db:generate
pnpm db:push
# pnpm db:seed   # opsional
mkdir -p apps/api/storage && chmod 750 apps/api/storage
pnpm build

pm2 delete siperbun-api 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

curl -s http://127.0.0.1:3111/api/v1/health
```

Lalu set DocumentRoot + Apache proxy (langkah 6–7), reload Apache, buka domain di browser.
