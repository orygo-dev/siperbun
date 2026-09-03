/** Status pengajuan sertifikasi */
export const ApplicationStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  ADMIN_REVIEW: 'ADMIN_REVIEW',
  ADMIN_REVISION_REQUIRED: 'ADMIN_REVISION_REQUIRED',
  DOCUMENT_COMPLETE: 'DOCUMENT_COMPLETE',
  WAITING_ASSIGNMENT: 'WAITING_ASSIGNMENT',
  INSPECTION_SCHEDULED: 'INSPECTION_SCHEDULED',
  INSPECTION_IN_PROGRESS: 'INSPECTION_IN_PROGRESS',
  FIELD_REVISION_REQUIRED: 'FIELD_REVISION_REQUIRED',
  WAITING_RESULT_VALIDATION: 'WAITING_RESULT_VALIDATION',
  INSPECTION_PASSED: 'INSPECTION_PASSED',
  INSPECTION_FAILED: 'INSPECTION_FAILED',
  WAITING_LHP_INVOICE: 'WAITING_LHP_INVOICE',
  WAITING_PAYMENT: 'WAITING_PAYMENT',
  PAYMENT_VERIFICATION: 'PAYMENT_VERIFICATION',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  PAYMENT_VERIFIED: 'PAYMENT_VERIFIED',
  CERTIFICATE_ISSUED_MANUALLY: 'CERTIFICATE_ISSUED_MANUALLY',
  WAITING_CERTIFICATE_SCAN: 'WAITING_CERTIFICATE_SCAN',
  CERTIFICATE_SCAN_UPLOADED: 'CERTIFICATE_SCAN_UPLOADED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type ApplicationStatus =
  (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan',
  ADMIN_REVIEW: 'Verifikasi',
  ADMIN_REVISION_REQUIRED: 'Perbaikan',
  DOCUMENT_COMPLETE: 'Dokumen Lengkap',
  WAITING_ASSIGNMENT: 'Siap Dijadwalkan',
  INSPECTION_SCHEDULED: 'Dijadwalkan',
  INSPECTION_IN_PROGRESS: 'Pemeriksaan',
  FIELD_REVISION_REQUIRED: 'Perbaikan Lapangan',
  WAITING_RESULT_VALIDATION: 'Validasi Hasil',
  INSPECTION_PASSED: 'Lulus Pemeriksaan',
  INSPECTION_FAILED: 'Tidak Lulus',
  WAITING_LHP_INVOICE: 'Menunggu LHP & Invoice',
  WAITING_PAYMENT: 'Menunggu Pembayaran',
  PAYMENT_VERIFICATION: 'Verifikasi Pembayaran',
  PAYMENT_REJECTED: 'Pembayaran Ditolak',
  PAYMENT_VERIFIED: 'Pembayaran Lunas',
  CERTIFICATE_ISSUED_MANUALLY: 'Sertifikat Diterbitkan',
  WAITING_CERTIFICATE_SCAN: 'Menunggu Scan',
  CERTIFICATE_SCAN_UPLOADED: 'Scan Terunggah',
  COMPLETED: 'Selesai',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
};

/** Mapping status ke kategori chart dashboard */
export const DASHBOARD_STATUS_GROUPS = {
  Verifikasi: [ApplicationStatus.ADMIN_REVIEW, ApplicationStatus.SUBMITTED],
  Perbaikan: [
    ApplicationStatus.ADMIN_REVISION_REQUIRED,
    ApplicationStatus.FIELD_REVISION_REQUIRED,
  ],
  'Siap Dijadwalkan': [
    ApplicationStatus.DOCUMENT_COMPLETE,
    ApplicationStatus.WAITING_ASSIGNMENT,
  ],
  Pemeriksaan: [
    ApplicationStatus.INSPECTION_SCHEDULED,
    ApplicationStatus.INSPECTION_IN_PROGRESS,
    ApplicationStatus.WAITING_RESULT_VALIDATION,
  ],
  'Menunggu Scan': [
    ApplicationStatus.CERTIFICATE_ISSUED_MANUALLY,
    ApplicationStatus.WAITING_CERTIFICATE_SCAN,
  ],
  Pembayaran: [
    ApplicationStatus.WAITING_LHP_INVOICE,
    ApplicationStatus.WAITING_PAYMENT,
    ApplicationStatus.PAYMENT_VERIFICATION,
    ApplicationStatus.PAYMENT_REJECTED,
    ApplicationStatus.PAYMENT_VERIFIED,
  ],
  Selesai: [
    ApplicationStatus.CERTIFICATE_SCAN_UPLOADED,
    ApplicationStatus.COMPLETED,
  ],
} as const;

export const AssignmentStatus = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  EN_ROUTE: 'EN_ROUTE',
  INSPECTING: 'INSPECTING',
  COMPLETED: 'COMPLETED',
  RESCHEDULED: 'RESCHEDULED',
  CANCELLED: 'CANCELLED',
} as const;

export type AssignmentStatus =
  (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  SCHEDULED: 'Dijadwalkan',
  CONFIRMED: 'Dikonfirmasi',
  EN_ROUTE: 'Dalam Perjalanan',
  INSPECTING: 'Sedang Diperiksa',
  COMPLETED: 'Selesai',
  RESCHEDULED: 'Dijadwalkan Ulang',
  CANCELLED: 'Dibatalkan',
};

export const CertificateStatus = {
  WAITING_ISSUANCE: 'WAITING_ISSUANCE',
  ISSUED_MANUALLY: 'ISSUED_MANUALLY',
  WAITING_SCAN: 'WAITING_SCAN',
  SCAN_UPLOADED: 'SCAN_UPLOADED',
  WAITING_VERIFICATION: 'WAITING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  REJECTED: 'REJECTED',
  REPLACED: 'REPLACED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type CertificateStatus =
  (typeof CertificateStatus)[keyof typeof CertificateStatus];

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
  WAITING_ISSUANCE: 'Menunggu Penerbitan',
  ISSUED_MANUALLY: 'Telah Diterbitkan Manual',
  WAITING_SCAN: 'Menunggu Upload Scan',
  SCAN_UPLOADED: 'Scan Terunggah',
  WAITING_VERIFICATION: 'Menunggu Verifikasi',
  ACTIVE: 'Aktif',
  REJECTED: 'Ditolak',
  REPLACED: 'Diganti',
  CANCELLED: 'Dibatalkan',
  EXPIRED: 'Kedaluwarsa',
};

export const FindingStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_VERIFICATION: 'WAITING_VERIFICATION',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CLOSED: 'CLOSED',
} as const;

export type FindingStatus = (typeof FindingStatus)[keyof typeof FindingStatus];

export const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  OPEN: 'Terbuka',
  IN_PROGRESS: 'Dalam Perbaikan',
  WAITING_VERIFICATION: 'Menunggu Verifikasi',
  ACCEPTED: 'Diterima',
  REJECTED: 'Ditolak',
  CLOSED: 'Ditutup',
};

export const ProductionStatus = {
  PREPARATION: 'PREPARATION',
  SOWING: 'SOWING',
  GROWING: 'GROWING',
  READY_FOR_INSPECTION: 'READY_FOR_INSPECTION',
  UNDER_INSPECTION: 'UNDER_INSPECTION',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type ProductionStatus =
  (typeof ProductionStatus)[keyof typeof ProductionStatus];

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  PREPARATION: 'Persiapan',
  SOWING: 'Penyemaian',
  GROWING: 'Pembesaran',
  READY_FOR_INSPECTION: 'Siap Diperiksa',
  UNDER_INSPECTION: 'Dalam Pemeriksaan',
  PASSED: 'Lulus',
  FAILED: 'Tidak Lulus',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export const ProducerStatus = {
  DRAFT: 'DRAFT',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  REJECTED: 'REJECTED',
} as const;

export type ProducerStatus = (typeof ProducerStatus)[keyof typeof ProducerStatus];

export const PRODUCER_STATUS_LABELS: Record<ProducerStatus, string> = {
  DRAFT: 'Draft',
  PENDING_VERIFICATION: 'Menunggu Verifikasi',
  VERIFIED: 'Terverifikasi',
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif',
  REJECTED: 'Ditolak',
};

export const ACTIVE_PRODUCTION_STATUSES: ProductionStatus[] = [
  ProductionStatus.PREPARATION,
  ProductionStatus.SOWING,
  ProductionStatus.GROWING,
  ProductionStatus.READY_FOR_INSPECTION,
  ProductionStatus.UNDER_INSPECTION,
];

export const Severity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type Severity = (typeof Severity)[keyof typeof Severity];

export const SEVERITY_LABELS: Record<Severity, string> = {
  LOW: 'Rendah',
  MEDIUM: 'Sedang',
  HIGH: 'Tinggi',
  CRITICAL: 'Kritis',
};
