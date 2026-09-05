# Push notifikasi Android (FCM)

SIPERBUN mengirim notifikasi ke aplikasi Android lewat **Firebase Cloud Messaging**. Inbox di web tetap jalan meski FCM belum dikonfigurasi.

## 1. Firebase

1. Buat project di [Firebase Console](https://console.firebase.google.com)
2. Tambah aplikasi Android (`package name` sesuai app, mis. `id.go.kalsel.siperbun`)
3. Unduh `google-services.json` ke project Android
4. Project settings → **Service accounts** → Generate new private key (JSON)

Isi `apps/api/.env` di server:

```env
FCM_PROJECT_ID=nama-project-firebase
FCM_CLIENT_EMAIL=firebase-adminsdk-...@nama-project.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n.....\n-----END PRIVATE KEY-----\n"
```

Baris baru di private key wajib `\n`. Lalu:

```bash
pnpm db:generate
pnpm db:push
pnpm build
pm2 restart siperbun-api --update-env
```

## 2. Alur aplikasi Android

1. User login ke API (`POST /api/v1/auth/login`) → simpan `accessToken`
2. Ambil FCM token perangkat (`FirebaseMessaging.getInstance().token`)
3. Daftarkan ke SIPERBUN:

```http
POST /api/v1/notifications/devices
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "token": "<fcm-device-token>",
  "platform": "ANDROID",
  "deviceId": "optional-android-id",
  "appVersion": "1.0.0"
}
```

4. Saat logout:

```http
DELETE /api/v1/notifications/devices
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "token": "<fcm-device-token>" }
```

5. Inbox tetap bisa diambil: `GET /api/v1/notifications`

Payload push:

| Field | Isi |
|---|---|
| `notification.title` | Judul |
| `notification.body` | Isi |
| `data.type` | Kode peristiwa, mis. `ASSIGNMENT_CREATED` |
| `data.link` | Path web, mis. `/penugasan` |

Buka layar sesuai `data.link` saat notifikasi diketuk.

Channel Android yang diharapkan: `siperbun_default` (importance high).

## 3. Peristiwa yang sudah dikirim

| Tipe | Penerima |
|---|---|
| `ASSIGNMENT_CREATED` | PBT yang ditugaskan |
| `INVOICE_ISSUED` | Akun penangkar |
| `PAYMENT_SUBMITTED` | Admin / super admin |
| `PAYMENT_ACCEPTED` / `PAYMENT_REJECTED` | Akun penangkar |

## 4. Contoh Kotlin (inti)

```kotlin
FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
  api.post("/notifications/devices", mapOf(
    "token" to token,
    "platform" to "ANDROID"
  ))
}
```

Tambahkan `google-services` plugin dan dependency `com.google.firebase:firebase-messaging`.
