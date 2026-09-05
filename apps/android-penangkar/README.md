# SIPERBUN Penangkar (Android)

Aplikasi Android khusus role **Penangkar**. Terhubung ke API yang sama dengan web (`/api/v1`).

## Buka di Android Studio

1. Install Android Studio (Ladybug / Koala atau lebih baru) + JDK 17
2. **File → Open** → pilih folder `apps/android-penangkar`
3. Biarkan Gradle sync (pertama kali mengunduh Gradle 8.9)
4. Jika diminta gradle wrapper: Android Studio akan menawari *Create Gradle Wrapper*
5. Jalankan di **MEmu** (disarankan di PC ini), emulator Android Studio, atau HP

Package: `id.go.kalsel.siperbun.penangkar`

## Jalankan di MEmu

MEmu tampil sebagai perangkat ADB `127.0.0.1:21503` (bukan daftar emulator Android Studio).

1. Nyalakan MEmu
2. Sambungkan:

```bat
"C:\Program Files\Microvirt\MEmu\adb.exe" connect 127.0.0.1:21503
```

3. Di Android Studio pilih perangkat `127.0.0.1:21503`, atau install APK debug:

```bat
gradlew.bat assembleDebug
adb -s 127.0.0.1:21503 install -r app\build\outputs\apk\debug\app-debug.apk
adb -s 127.0.0.1:21503 shell am start -n id.go.kalsel.siperbun.penangkar.debug/id.go.kalsel.siperbun.penangkar.MainActivity
```

Instance MEmu kedua biasanya port `21513`.

## API

Default mengarah ke production:

`https://siperbun.rebornpartner.xyz/api/v1/`

Untuk API lokal (emulator), ubah `API_BASE_URL_DEBUG` di `app/build.gradle.kts` menjadi `http://10.0.2.2:3111/api/v1/`.

Hanya akun **PENANGKAR** yang bisa masuk. Admin/PBT ditolak di layar login.

### Akun demo penangkar

Setelah seed (penuh atau additive), masuk dengan:

- Email: `demo.penangkar@siperbun.local`
- Password: `password`

Atau ketuk **Masuk Demo** di layar login. Seed additive (aman, tidak menghapus data lain):

```bat
pnpm db:seed:demo-penangkar
```

Di server production, jalankan perintah yang sama dari folder repo (bukan `pnpm db:seed` penuh). Akun ini berisi contoh semua status pengajuan, pembayaran, produksi, sertifikat, distribusi, dan notifikasi.

## Fitur

- Login + sesi JWT / cookie refresh
- Beranda, produksi, pengajuan (status aktual), distribusi, profil
- Unggah bukti pembayaran
- Inbox notifikasi
- Siap daftar token FCM ke `POST /notifications/devices` setelah `google-services.json` ditambahkan

## Push FCM

1. Buat app Android di Firebase
2. Letakkan `google-services.json` di `app/`
3. Aktifkan plugin Google Services di Gradle (lihat `docs/push-notifications-android.md`)
4. Setelah login, panggil `repository.registerPushToken(fcmToken)`
