# Panduan Penggunaan SIPERBUN

**SIPERBUN** (*Sistem Informasi Perbenihan Perkebunan*) digunakan Dinas Perkebunan / UPTD untuk mengelola data penangkar, produksi bibit, sertifikasi, pemeriksaan lapangan, sertifikat, label, distribusi, dan pengawasan peredaran.

Dokumen ini menjelaskan **cara memakai aplikasi untuk setiap role** dan **alur kerja end-to-end**.

---

## 1. Memulai

### 1.1 Alamat aplikasi

| Layanan | URL (development) |
|---|---|
| Aplikasi web | http://localhost:5173 |
| API / Swagger | http://localhost:3111/api/docs |

### 1.2 Login

1. Buka halaman **Login**.
2. Masukkan email dan password.
3. Klik **Masuk**.
4. Setelah berhasil, Anda diarahkan ke **Dashboard** (menu yang tampil mengikuti permission role).

### 1.3 Navigasi umum

- **Sidebar kiri** — menu modul (disaring menurut permission).
- **Header** — judul halaman, filter ringkas, pencarian, notifikasi, profil, **Keluar**.
- **Bel notifikasi** — pemberitahuan tugas / status (tandai dibaca).
- Di **mobile**, menu menjadi drawer (ikon hamburger).

### 1.4 Akun demo (development)

Password semua akun demo: `password`  
**Wajib diganti sebelum production.**

| Email | Role |
|---|---|
| `admin@siperbun.local` | Super Admin |
| `pimpinan@siperbun.local` | Pimpinan |
| `admin1@siperbun.local` | Admin |
| `admin2@siperbun.local` | Admin |
| `admin.banjar@siperbun.local` | Admin (wilayah Banjar) |
| `admin.tanahlaut@siperbun.local` | Admin (wilayah Tanah Laut) |
| `ahmad@siperbun.local` | PBT — Ahmad Rahman |
| `siti@siperbun.local` | PBT — Siti Rahmah |
| `rudi@siperbun.local` | PBT — Rudiansyah |
| `heri@siperbun.local` | PBT — Heri Kurniawan |
| `fadli@siperbun.local` | PBT — M. Fadli |
| `penangkar1@siperbun.local` … `penangkar10@…` | Penangkar |

---

## 2. Ringkasan role

| Role | Fokus utama | Boleh mengubah data inti? |
|---|---|---|
| **Super Admin** | Seluruh sistem, pengguna, pengaturan, audit | Ya (semua) |
| **Pimpinan** | Monitoring eksekutif, laporan, audit (baca), verifikasi terbatas | Terbatas |
| **Admin** | Operasional sertifikasi: data, verifikasi, penugasan PBT, scan sertifikat | Ya |
| **PBT** | Konfirmasi tugas, pemeriksaan lapangan, temuan, finalisasi | Ya (tugas sendiri) |
| **Penangkar** | Produksi & pengajuan milik sendiri, lihat sertifikat | Ya (milik sendiri); **tidak** unggah scan resmi |

> Menu yang tidak berhak tidak ditampilkan. Keamanan sebenarnya tetap dicek di API.

---

## 3. Panduan per role

### 3.1 Super Admin

**Login:** `admin@siperbun.local`

**Yang dikerjakan**

1. **Pengaturan → Pengguna** — tambah/ubah pengguna, aktifkan/nonaktifkan, tetapkan role.
2. **Pengaturan → Komoditas / Wilayah** — master komoditas, varietas, kabupaten.
3. **Pengaturan → Audit Log** (atau `/audit-log`) — pantau jejak login, ubah data, upload, dll.
4. Seluruh modul bisnis (sama seperti Admin).

**Kapan dipakai:** setup awal, perbaikan data kritis, audit keamanan.

---

### 3.2 Pimpinan

**Login:** `pimpinan@siperbun.local`

**Yang dikerjakan**

1. Buka **Dashboard** — statistik penangkar, bibit, pengajuan, scan sertifikat, peta, kinerja PBT.
2. Buka **Laporan** — filter periode/wilayah/komoditas, **Ekspor CSV** bila perlu.
3. Buka **Peta** — sebaran lokasi pembibitan / kebun sumber / status.
4. Pantau **Pengajuan**, **Pemeriksaan**, **Sertifikat**, **Pengawasan** (umumnya read-only; verifikasi terbatas bila berwenang).
5. Buka **Audit Log** untuk meninjau jejak aktivitas.

**Tidak perlu:** mengisi pemeriksaan lapangan atau mengunggah scan.

---

### 3.3 Admin

**Login:** `admin1@siperbun.local` / `admin2@siperbun.local`  
(Admin wilayah: `admin.banjar@…` / `admin.tanahlaut@…`)

Role operasional utama: data master, alur sertifikasi, penugasan PBT, dan scan sertifikat.

**Alur harian**

1. **Penangkar / Lokasi / Kebun Sumber / Produksi** — CRUD sesuai kebutuhan.
2. **Pengajuan** — verifikasi administrasi (**Lolos** / **Minta Perbaikan**).
3. Setelah lolos → **Tugaskan PBT** (petugas, tanggal, instruksi).
4. Setelah PBT finalisasi → **Validasi** hasil pemeriksaan (Lulus / Tidak Lulus).
5. **Sertifikat** — catat penerbitan, **unggah scan**, **verifikasi** / ganti scan.
6. **Label & Distribusi**, **Pengawasan**, **Laporan**.

**Penting:** Hanya Admin (dan Super Admin) yang boleh mengunggah scan resmi. Penangkar **tidak** boleh.

---

### 3.4 PBT (Pengawas Benih Tanaman)

**Login contoh:** `ahmad@siperbun.local`

**Alur tugas**

1. Login → buka **Penugasan**.  
   - Lihat jadwal yang ditugaskan ke Anda.
2. Buka detail penugasan → **Konfirmasi** (opsional) → **Mulai Pemeriksaan**.
3. Di **Pemeriksaan → Detail**:
   - Isi jumlah populasi/sampel/lulus/tidak lulus/afkir.
   - Isi GPS bila tersedia.
   - Isi **checklist** parameter (asal benih, tinggi, kesehatan, dll.).
   - **Unggah foto** bukti lapangan.
   - Catat **temuan** bila ada ketidaksesuaian.
4. **Finalisasi** dengan pilihan:
   - **PASS / FAIL** → menunggu validasi Admin.
   - **REVISION** → penangkar harus perbaikan (`FIELD_REVISION_REQUIRED`).
5. Setelah finalisasi, data pemeriksaan **terkunci** (tidak bisa diubah langsung).

**Temuan & perbaikan**

- Buka **Temuan** untuk memantau status.
- Verifikasi bukti perbaikan penangkar (terima / tolak) bila berwenang.

---

### 3.5 Penangkar

**Login:** `penangkar1@siperbun.local` (dst.)

**Yang dikerjakan**

1. Lihat / kelola data usaha terkait (sesuai akses).
2. **Sumber Benih** & **Produksi Bibit** — catat batch, log pertumbuhan.
3. **Pengajuan Sertifikasi**  
   - Buat draft → lengkapi → **Ajukan**.  
   - Jika diminta perbaikan administrasi → perbaiki → ajukan ulang.
4. Pantau **jadwal pemeriksaan** dan hasil.
5. Jika ada **temuan**:
   - Unggah **bukti perbaikan** di modul Temuan.
6. Lihat / **unduh scan sertifikat** milik sendiri setelah terbit.
7. **Tidak dapat** mengunggah atau mengganti scan sertifikat resmi dinas.

---

## 4. Alur kerja utama (end-to-end)

Berikut alur bisnis inti dari data penangkar sampai sertifikat aktif dan distribusi.

```text
[1] Master data
    Penangkar → Lokasi Pembibitan → Kebun Sumber → Sumber Benih
        ↓
[2] Produksi
    Batch produksi + log (persiapan → siap diperiksa)
        ↓
[3] Pengajuan sertifikasi
    Draft → Ajukan → Verifikasi admin
        ├─ Perbaikan ──┐
        └─ Lolos → Siap dijadwalkan
        ↓
[4] Penugasan & pemeriksaan
    Admin tugaskan PBT → PBT periksa lapangan
        ├─ Perlu perbaikan lapangan ──┐
        └─ Finalisasi → Validasi koordinator
              ├─ Tidak lulus → ditolak / selesai gagal
              └─ Lulus
        ↓
[5] Sertifikat
    Catat penerbitan manual → Unggah scan → Verifikasi → Aktif
        ↓
[6] Label, distribusi, pengawasan
    Label → Distribusi bibit → Inspeksi peredaran (opsional)
        ↓
[7] Laporan & monitoring pimpinan
    Dashboard / Peta / Laporan / Audit
```

### 4.1 Langkah detail dengan aktor

| No | Langkah | Aktor utama | Menu | Hasil status pengajuan (inti) |
|---|---|---|---|---|
| 1 | Daftarkan / verifikasi penangkar | Admin Sertifikasi / Kab | Penangkar | — |
| 2 | Catat lokasi & sumber benih | Admin / Penangkar | Lokasi, Sumber Benih | — |
| 3 | Buat batch produksi | Admin / Penangkar | Produksi | — |
| 4 | Buat & ajukan sertifikasi | Penangkar / Admin | Pengajuan | `ADMIN_REVIEW` |
| 5 | Verifikasi administrasi | Admin | Pengajuan | `WAITING_ASSIGNMENT` atau perbaikan |
| 6 | Tugaskan PBT | Admin | Pengajuan / Penugasan | `INSPECTION_SCHEDULED` |
| 7 | Pemeriksaan lapangan | PBT | Penugasan / Pemeriksaan | `WAITING_RESULT_VALIDATION` atau perbaikan lapangan |
| 8 | Validasi hasil | Admin | Pemeriksaan | `INSPECTION_PASSED` / `FAILED` |
| 9 | Catat sertifikat + upload scan | Admin | Sertifikat | menuju `COMPLETED` |
| 10 | Verifikasi scan | Admin | Sertifikat | Sertifikat `ACTIVE` |
| 11 | Label & distribusi | Admin | Label & Distribusi | — |
| 12 | Pengawasan peredaran | Admin / Petugas | Pengawasan | — |
| 13 | Monitoring & laporan | Pimpinan | Dashboard, Laporan, Peta | — |

### 4.2 Diagram status pengajuan (sederhana)

```text
DRAFT
  → SUBMITTED → ADMIN_REVIEW
       ├─ ADMIN_REVISION_REQUIRED → (perbaiki) → ajukan lagi
       ├─ REJECTED / CANCELLED
       └─ DOCUMENT_COMPLETE → WAITING_ASSIGNMENT
              → INSPECTION_SCHEDULED
              → INSPECTION_IN_PROGRESS
                   ├─ FIELD_REVISION_REQUIRED → perbaiki → lanjut inspeksi
                   └─ WAITING_RESULT_VALIDATION
                        ├─ INSPECTION_FAILED → REJECTED/CANCELLED
                        └─ INSPECTION_PASSED
                             → CERTIFICATE_ISSUED_MANUALLY
                             → WAITING_CERTIFICATE_SCAN
                             → CERTIFICATE_SCAN_UPLOADED
                             → COMPLETED
```

Detail teknis transisi: lihat `docs/certification-workflow.md`.

---

## 5. Panduan singkat per modul

### Dashboard (`/dashboard`)
Ringkasan angka, chart status, prioritas kerja, peta, jadwal hari ini, kinerja PBT, pengajuan terbaru, monitoring scan, aktivitas. Klik item prioritas untuk menuju data terkait.

### Penangkar (`/penangkar`)
Daftar → **Tambah** → isi identitas usaha → simpan. Detail: verifikasi, aktifkan/nonaktifkan, edit.

### Lokasi Pembibitan (`/lokasi-pembibitan`)
Hubungkan ke penangkar, koordinat, kapasitas, komoditas, status.

### Kebun Sumber (`/kebun-sumber`)
Data kebun induk, penetapan, masa berlaku, komoditas/varietas.

### Sumber Benih (`/sumber-benih`)
Lot benih masuk, jumlah, sisa stok, dokumen asal, verifikasi.

### Produksi (`/produksi`)
Batch `PB-YYYY-…`. Update jumlah tumbuh/mati/afkir lewat **log**. Ubah status batch sesuai tahap.

### Pengajuan (`/pengajuan`)
Nomor otomatis `SBN-YYYY-#####`. Pilih penangkar, batch, komoditas, jumlah bibit. Aksi: Ajukan, Verifikasi, Minta Perbaikan, Tugaskan PBT.

### Penugasan (`/penugasan`)
Daftar tugas PBT. Konfirmasi / mulai pemeriksaan.

### Pemeriksaan (`/pemeriksaan`)
Form hasil, checklist, foto, temuan, finalisasi, validasi koordinator.

### Temuan (`/temuan`)
Daftar temuan + severity. Penangkar unggah bukti perbaikan; petugas verifikasi.

### Sertifikat (`/sertifikat`)
Metadata penerbitan manual → upload scan → verifikasi/ganti/batalkan → unduh aman.

### Label & Distribusi (`/label-distribusi`)
Tab label (serial awal–akhir, sisa) dan distribusi bibit ke pembeli.

### Pengawasan (`/pengawasan`)
Inspeksi peredaran `WAS-YYYY-…` + kategori temuan (tanpa sertifikat, label tidak sesuai, kedaluwarsa, dll.).

### Laporan (`/laporan`)
Pilih jenis → filter → tabel → **Ekspor CSV**.

### Peta (`/peta`)
Peta Kalimantan Selatan; filter jenis marker.

### Pengaturan (`/pengaturan`)
Pengguna, komoditas/varietas, wilayah. Super Admin penuh.

### Audit Log (`/audit-log`)
Jejak aksi sistem (login, ubah data, upload, dll.).

---

## 6. Skenario latihan cepat (disarankan)

Gunakan dua browser/profil atau logout–login bergantian.

| Urutan | Login sebagai | Tindakan |
|---|---|---|
| 1 | `admin1@…` | Buat/ pastikan penangkar & batch produksi siap |
| 2 | `penangkar1@…` | Buat pengajuan → Ajukan |
| 3 | `admin1@…` | Verifikasi Lolos → Tugaskan `ahmad@…` |
| 4 | `ahmad@…` | Mulai pemeriksaan → isi hasil → Finalisasi PASS |
| 5 | `admin1@…` | Validasi Lulus |
| 6 | `admin1@…` | Buat sertifikat → Unggah scan → Verifikasi |
| 7 | `pimpinan@…` | Lihat Dashboard & Laporan |

---

## 7. Tips & aturan penting

1. **Status dikontrol sistem** — tidak semua tombol muncul di setiap tahap; jangan memaksa loncat status.
2. **Setelah finalisasi pemeriksaan**, data terkunci; koreksi harus lewat prosedur resmi / perbaikan.
3. **Sertifikat resmi** diterbitkan di luar sistem (fisik); SIPERBUN menyimpan metadata + scan.
4. **Penangkar tidak mengunggah scan resmi.**
5. File scan disimpan di server (`storage/…`), bukan di database sebagai Base64.
6. Ganti password demo sebelum production.
7. Untuk data demo lengkap ulang: `pnpm db:seed` (menghapus & mengisi ulang data seed). Jangan dijalankan di production kecuali `ALLOW_DB_SEED=true`.

---

## 8. Dokumen terkait

| Dokumen | Isi |
|---|---|
| `README.md` | Instalasi & menjalankan |
| `docs/certification-workflow.md` | Peta transisi status teknis |
| `docs/roles-permissions.md` | Daftar permission |
| `docs/api.md` | Referensi endpoint |
| `docs/deployment.md` | Deployment production |
| `docs/testing.md` | Cara menjalankan tes |

---

*Dokumen ini mengikuti perilaku aplikasi SIPERBUN Stage 1–7 (Dinas Perkebunan Provinsi Kalimantan Selatan — environment demo).*
