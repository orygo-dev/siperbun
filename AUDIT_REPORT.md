# Laporan Audit dan Stabilisasi SIPERBUN

Tanggal pembaruan audit: 2 September 2026

## Ringkasan eksekutif

Audit mencakup struktur monorepo, API Express/Prisma, frontend React/Vite, keamanan unggahan dan konfigurasi, kualitas build, pengujian otomatis, dependensi, serta pengujian visual desktop dan mobile. Empat risiko prioritas telah diperbaiki: akses langsung ke direktori penyimpanan, validasi berkas berbasis isi, konfigurasi JWT produksi, dan kegagalan build/type-check. Dependensi yang memiliki advisory juga telah diperbarui atau dioverride secara terbatas tanpa merusak Vite.

Status akhir: aplikasi dapat dibangun dan dijalankan; frontend dan API sehat; database terhubung; seluruh 65 pengujian lulus; audit dependensi tidak menemukan kerentanan yang diketahui. Portal publik, formulir pendaftaran penangkar, dan wizard sertifikasi telah diperiksa melalui browser bawaan pada desktop serta mobile.

## Perbaikan yang diterapkan

### 1. Keamanan penyimpanan dan unggahan — selesai

- Menghapus publikasi mentah direktori `/storage` dari Express.
- Mengharuskan file diambil melalui endpoint terkontrol yang sudah memiliki aturan akses.
- Memvalidasi signature biner JPEG, PNG, WebP, dan PDF; tidak lagi mempercayai MIME atau ekstensi dari klien.
- Menolak ketidaksesuaian antara isi file dan MIME yang diklaim.
- Menurunkan ekstensi nama file dari MIME yang terdeteksi.
- Menambahkan pemeriksaan containment agar path traversal tidak dapat keluar dari storage root.
- Menambahkan pengujian regresi untuk signature, mismatch MIME, traversal path, dan larangan akses `/storage`.

### 2. Konfigurasi autentikasi produksi — selesai

- Konfigurasi environment dipisahkan ke fungsi yang dapat diuji.
- `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET` wajib di production dan minimal 32 karakter.
- `CORS_ORIGIN` wajib di production.
- Cookie secure dipaksa aktif di production.
- Menambahkan pengujian untuk secret yang hilang, secret lemah, dan konfigurasi production yang valid.

### 3. Validasi route dan stabilitas TypeScript — selesai

- Menambahkan validator parameter UUID wajib.
- Menerapkannya pada ID listing, foto, dan banner.
- Menghilangkan kemungkinan nilai `undefined` yang sebelumnya menggagalkan kompilasi TypeScript.
- Build dan type-check workspace berhasil.

### 4. Dependensi dan toolchain — selesai untuk advisory aktif

- Memperbarui `react-router-dom` ke 7.18.2.
- Menambahkan override terbatas untuk `deepmerge-ts`, `nanoid`, dan `esbuild` yang dipakai tool build tertentu.
- Mempertahankan versi `esbuild` yang kompatibel dengan Vite agar frontend tetap dapat dibangun.
- Memperbaiki proses postinstall monorepo agar Prisma Client selalu digenerasi.
- Hasil `pnpm audit`: tidak ada kerentanan yang diketahui.

### 5. Reliabilitas pengujian — selesai

- Menjalankan test API secara serial pada level file untuk mencegah kontensi database.
- Menambah batas waktu yang realistis bagi hook API dan test frontend pada mesin pengembangan.
- Hasil baseline: 42 test API dan 7 test frontend lulus.

### 6. Redesign portal institusi dan CMS — selesai

- Mengubah `/portal` menjadi landing page resmi UPTD dengan profil, layanan penangkar, visi dan misi, peta sebaran, serta informasi kontak.
- Mempertahankan katalog bibit pada `/portal/bibit` agar fitur publik lama tidak hilang.
- Menambahkan peta khusus Provinsi Kalimantan Selatan dengan batas 13 kabupaten/kota, tanpa world map, beserta filter kabupaten dan komoditas.
- Menampilkan marker dari data penangkar aktif/terverifikasi yang mempunyai koordinat; angka pada daftar kabupaten berasal dari data API, bukan angka statis.
- Menambahkan menu **Pengaturan → Konten Portal** yang hanya dapat diubah oleh Super Admin, termasuk unggah gambar hero/layanan dan preview langsung.
- Menyimpan konfigurasi menggunakan `AppSetting`, sehingga fitur dapat digunakan tanpa migrasi schema database baru.
- Menyembunyikan tautan navigasi dan footer secara otomatis apabila bagian terkait dinonaktifkan oleh Super Admin.
- Menambahkan empat integration test untuk konten publik, pembatasan role, validasi payload, dan data peta.

### 7. Pendaftaran dan sinkronisasi data penangkar — selesai

- Mengganti formulir publik dengan identitas akun, nama penangkar/organisasi, nomor HP, alamat kantor, alamat pembibitan, serta status kepemilikan lahan.
- Mewajibkan sembilan dokumen/foto pendukung dengan batas 10 MB, allowlist JPG/PNG/WebP/PDF, dan pemeriksaan signature berkas di server.
- Meng-hash password saat pendaftaran dan memastikan hash tidak pernah dikirim kembali melalui respons API.
- Menambahkan penyimpanan dokumen pendaftaran yang terstruktur dan unduhan terautentikasi bagi petugas yang berwenang.
- Menyempurnakan layar verifikasi Super Admin agar seluruh data dan sembilan dokumen dapat ditinjau sebelum persetujuan.
- Saat disetujui, sistem membuat akun role Penangkar, data penangkar, lokasi pembibitan utama, dan dokumen terkait dalam satu transaksi database.
- Menyinkronkan alamat serta status kepemilikan antara data penangkar dan lokasi pembibitan utama pada proses tambah, ubah, pindah, dan hapus.
- Menambahkan enam pengujian baru untuk validasi form, multipart lengkap, keamanan password, persetujuan, role akun, dan sinkronisasi lokasi.
- Menambahkan kabupaten kantor dan kabupaten lokasi pembibitan sebagai dua data terpisah; kabupaten pembibitan diteruskan ke lokasi pembibitan utama.
- Menggunakan formulir lengkap yang sama pada menu **Penangkar → Tambah Penangkar** untuk Super Admin, termasuk akun dan sembilan dokumen. Data yang valid langsung menghasilkan penangkar, lokasi pembibitan, dokumen, dan akun role Penangkar.

### 8. Wizard pengajuan sertifikat dan pembayaran — selesai

- Menambahkan wizard lima tahap: Pengajuan, Pemeriksaan, LHP & Invoice, Pembayaran, dan Sertifikat.
- Menambahkan status terkontrol untuk LHP/invoice, menunggu pembayaran, verifikasi pembayaran, pembayaran ditolak, dan pembayaran lunas.
- Admin dapat menerbitkan LHP beserta invoice; sistem mencegah nomor LHP/invoice ganda dan menyediakan unduhan invoice PDF.
- Penangkar hanya dapat mengakses pengajuan miliknya, mengunggah bukti pembayaran, dan mengunggah ulang jika pembayaran ditolak.
- Admin wajib memberi alasan saat menolak pengajuan atau bukti pembayaran; loncat status finansial melalui endpoint umum ditolak.
- Penerbitan sertifikat hanya tersedia setelah pembayaran diverifikasi lunas.
- Menambahkan notifikasi untuk penerbitan invoice, unggah bukti, dan hasil verifikasi pembayaran.
- Menambahkan pengujian integrasi alur lengkap, kontrol akses invoice, validasi alasan penolakan, anti-duplikasi nomor, dan pencegahan bypass status.

## Hasil verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| Type-check workspace | Lulus |
| Build workspace | Lulus |
| Build Vite setelah override final | Lulus |
| Test API | 47/47 lulus |
| Test frontend | 10/10 lulus |
| Prisma schema validation | Lulus |
| Audit dependensi | 0 kerentanan diketahui |
| API health | `ok`, database `up` |
| Portal desktop | HTTP 200, navigasi jangkar, katalog, dan filter peta berfungsi; tanpa error konsol baru |
| Portal mobile 390×844 | HTTP 200, menu responsif berfungsi, tanpa overflow horizontal |
| Form pendaftaran desktop/mobile | Seluruh field dan 9 unggahan tampil; validasi kosong aktif; tanpa warning/error konsol dan tanpa overflow horizontal |

QA visual dijalankan melalui browser bawaan pada viewport desktop dan mobile 390×844. Hero, layanan, peta Kalimantan Selatan, navigasi, filter Banjar, katalog bibit, menu mobile, formulir pendaftaran, sembilan kontrol unggah, dan validasi pengiriman kosong diperiksa secara langsung.

## Temuan tersisa dan rekomendasi

### Prioritas tinggi

1. Implementasikan alur lupa/reset password secara lengkap, termasuk token sekali pakai, masa berlaku, invalidasi, rate limit, dan audit log.
2. Tambahkan pipeline CI wajib untuk install frozen lockfile, type-check, test, build, audit, dan validasi Prisma pada setiap pull request.
3. Tetapkan strategi migrasi database production; jangan mengandalkan `db push` untuk perubahan schema yang perlu jejak dan rollback.

### Prioritas menengah

1. Pecah bundle frontend. Chunk JavaScript utama sekitar 1.36 MB (sekitar 365 KB gzip), melewati ambang peringatan Vite 500 KB. Gunakan lazy route, dynamic import, dan pemisahan modul vendor yang terukur.
2. Tingkatkan cakupan test untuk autentikasi, otorisasi per role, unggah/download berkas, laporan, dan operasi mutasi kritis.
3. Tambahkan linting yang benar-benar memeriksa style dan defect; script lint saat ini pada dasarnya hanya type-check.
4. Tambahkan pengujian aksesibilitas otomatis dan E2E untuk alur pengguna utama.

### Pemeliharaan

1. Rencanakan migrasi dari Multer 1.x dan Recharts 2.x yang sudah ditandai deprecated oleh package manager.
2. Pindahkan konfigurasi Prisma dari `package.json` ke format konfigurasi yang direkomendasikan versi Prisma berikutnya.
3. Tambahkan observability production: structured error reporting, metrik latency/error rate, health/readiness terpisah, dan kebijakan retensi log.

## Cara menjalankan

Pada kondisi pengembangan saat ini:

```powershell
pnpm dev
```

Portal tersedia di `http://localhost:5173/portal`, API health di `http://localhost:3000/api/v1/health`, dan dokumentasi API di `http://localhost:3000/api/docs`.
