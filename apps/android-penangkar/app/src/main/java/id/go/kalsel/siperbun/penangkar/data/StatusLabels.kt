package id.go.kalsel.siperbun.penangkar.data

data class StatusStyle(val label: String, val container: Long, val content: Long)

object StatusLabels {
    private val fallback = StatusStyle("Status", 0xFFF1F5F9, 0xFF475569)

    private val application = mapOf(
        "DRAFT" to StatusStyle("Draft", 0xFFF1F5F9, 0xFF475569),
        "SUBMITTED" to StatusStyle("Diajukan", 0xFFFEF3C7, 0xFFB45309),
        "ADMIN_REVIEW" to StatusStyle("Verifikasi Dokumen", 0xFFFEF3C7, 0xFFB45309),
        "ADMIN_REVISION_REQUIRED" to StatusStyle("Perbaikan Dokumen", 0xFFFFEDD5, 0xFFC2410C),
        "DOCUMENT_COMPLETE" to StatusStyle("Dokumen Lengkap", 0xFFDBEAFE, 0xFF1D4ED8),
        "WAITING_ASSIGNMENT" to StatusStyle("Siap Dijadwalkan", 0xFFDBEAFE, 0xFF1D4ED8),
        "INSPECTION_SCHEDULED" to StatusStyle("Pemeriksaan Dijadwalkan", 0xFFE0E7FF, 0xFF4338CA),
        "INSPECTION_IN_PROGRESS" to StatusStyle("Sedang Diperiksa", 0xFFE0E7FF, 0xFF4338CA),
        "FIELD_REVISION_REQUIRED" to StatusStyle("Perbaikan Lapangan", 0xFFFFEDD5, 0xFFC2410C),
        "WAITING_RESULT_VALIDATION" to StatusStyle("Validasi Hasil Pemeriksaan", 0xFFF3E8FF, 0xFF7E22CE),
        "INSPECTION_PASSED" to StatusStyle("Lulus Pemeriksaan", 0xFFD1FAE5, 0xFF047857),
        "INSPECTION_FAILED" to StatusStyle("Tidak Lulus", 0xFFFEE2E2, 0xFFB91C1C),
        "WAITING_LHP_INVOICE" to StatusStyle("Menunggu LHP & Invoice", 0xFFFEF3C7, 0xFFB45309),
        "WAITING_PAYMENT" to StatusStyle("Menunggu Pembayaran", 0xFFDBEAFE, 0xFF1D4ED8),
        "PAYMENT_VERIFICATION" to StatusStyle("Verifikasi Pembayaran", 0xFFFEF3C7, 0xFFB45309),
        "PAYMENT_REJECTED" to StatusStyle("Pembayaran Ditolak", 0xFFFEE2E2, 0xFFB91C1C),
        "PAYMENT_VERIFIED" to StatusStyle("Pembayaran Lunas", 0xFFD1FAE5, 0xFF047857),
        "CERTIFICATE_ISSUED_MANUALLY" to StatusStyle("Sertifikat Diterbitkan", 0xFFDBEAFE, 0xFF1D4ED8),
        "WAITING_CERTIFICATE_SCAN" to StatusStyle("Menunggu Scan", 0xFFF3E8FF, 0xFF7E22CE),
        "CERTIFICATE_SCAN_UPLOADED" to StatusStyle("Scan Terunggah", 0xFFD1FAE5, 0xFF047857),
        "COMPLETED" to StatusStyle("Selesai", 0xFFD1FAE5, 0xFF047857),
        "REJECTED" to StatusStyle("Ditolak", 0xFFFEE2E2, 0xFFB91C1C),
        "CANCELLED" to StatusStyle("Dibatalkan", 0xFFF1F5F9, 0xFF475569),
    )

    private val production = mapOf(
        "PREPARATION" to StatusStyle("Persiapan", 0xFFF1F5F9, 0xFF475569),
        "SOWING" to StatusStyle("Semai", 0xFFFEF3C7, 0xFFB45309),
        "GROWING" to StatusStyle("Tumbuh", 0xFFDBEAFE, 0xFF1D4ED8),
        "READY_FOR_INSPECTION" to StatusStyle("Siap Diperiksa", 0xFFE0E7FF, 0xFF4338CA),
        "UNDER_INSPECTION" to StatusStyle("Dalam Pemeriksaan", 0xFFE0E7FF, 0xFF4338CA),
        "PASSED" to StatusStyle("Lulus", 0xFFD1FAE5, 0xFF047857),
        "FAILED" to StatusStyle("Tidak Lulus", 0xFFFEE2E2, 0xFFB91C1C),
        "COMPLETED" to StatusStyle("Selesai", 0xFFD1FAE5, 0xFF047857),
        "CANCELLED" to StatusStyle("Dibatalkan", 0xFFF1F5F9, 0xFF475569),
    )

    private val certificate = mapOf(
        "WAITING_ISSUANCE" to StatusStyle("Menunggu Penerbitan", 0xFFF1F5F9, 0xFF475569),
        "ISSUED_MANUALLY" to StatusStyle("Diterbitkan", 0xFFDBEAFE, 0xFF1D4ED8),
        "WAITING_SCAN" to StatusStyle("Menunggu Scan", 0xFFF3E8FF, 0xFF7E22CE),
        "SCAN_UPLOADED" to StatusStyle("Scan Terunggah", 0xFFE0E7FF, 0xFF4338CA),
        "WAITING_VERIFICATION" to StatusStyle("Menunggu Verifikasi", 0xFFFEF3C7, 0xFFB45309),
        "ACTIVE" to StatusStyle("Aktif", 0xFFD1FAE5, 0xFF047857),
        "REJECTED" to StatusStyle("Ditolak", 0xFFFEE2E2, 0xFFB91C1C),
        "REPLACED" to StatusStyle("Diganti", 0xFFFEF3C7, 0xFFB45309),
        "CANCELLED" to StatusStyle("Dibatalkan", 0xFFF1F5F9, 0xFF475569),
        "EXPIRED" to StatusStyle("Kedaluwarsa", 0xFFF1F5F9, 0xFF475569),
    )

    fun application(status: String?) = application[status] ?: fallback.copy(label = status ?: "—")
    fun production(status: String?) = production[status] ?: fallback.copy(label = status ?: "—")
    fun certificate(status: String?) = certificate[status] ?: fallback.copy(label = status ?: "—")
}

val KalselDistricts = listOf(
    "Balangan",
    "Banjar",
    "Banjarbaru",
    "Banjarmasin",
    "Barito Kuala",
    "Hulu Sungai Selatan",
    "Hulu Sungai Tengah",
    "Hulu Sungai Utara",
    "Kotabaru",
    "Tabalong",
    "Tanah Bumbu",
    "Tanah Laut",
    "Tapin",
)
