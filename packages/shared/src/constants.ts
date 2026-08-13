export const APP_NAME = 'SIPERBUN';
export const APP_FULL_NAME = 'Sistem Informasi Perbenihan Perkebunan';
export const OFFICE_NAME = 'Dinas Perkebunan Provinsi Kalimantan Selatan';

export const API_PREFIX = '/api/v1';

export const KALSEL_MAP_CENTER = {
  lat: -3.0,
  lng: 115.0,
  zoom: 8,
} as const;

export const REFRESH_COOKIE_NAME = 'siperbun_refresh';

/** Kategori temuan pengawasan peredaran */
export const CirculationFindingCategory = {
  NO_CERTIFICATE: 'NO_CERTIFICATE',
  CERT_MISMATCH: 'CERT_MISMATCH',
  LABEL_MISMATCH: 'LABEL_MISMATCH',
  CERT_EXPIRED: 'CERT_EXPIRED',
  QTY_MISMATCH: 'QTY_MISMATCH',
  UNCLEAR_ORIGIN: 'UNCLEAR_ORIGIN',
  SUSPICIOUS_DOCS: 'SUSPICIOUS_DOCS',
  OTHER: 'OTHER',
} as const;

export type CirculationFindingCategory =
  (typeof CirculationFindingCategory)[keyof typeof CirculationFindingCategory];

export const CIRCULATION_FINDING_CATEGORY_LABELS: Record<
  CirculationFindingCategory,
  string
> = {
  NO_CERTIFICATE: 'Tidak ada sertifikat',
  CERT_MISMATCH: 'Sertifikat tidak sesuai',
  LABEL_MISMATCH: 'Label tidak sesuai',
  CERT_EXPIRED: 'Sertifikat kedaluwarsa',
  QTY_MISMATCH: 'Jumlah tidak sesuai',
  UNCLEAR_ORIGIN: 'Asal-usul tidak jelas',
  SUSPICIOUS_DOCS: 'Dokumen mencurigakan',
  OTHER: 'Lainnya',
};

export const REPORT_TYPES = [
  'producers',
  'production',
  'applications',
  'inspections',
  'certificates',
  'distributions',
  'circulation',
  'pbt-performance',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  producers: 'Laporan Penangkar',
  production: 'Laporan Produksi',
  applications: 'Laporan Pengajuan',
  inspections: 'Laporan Pemeriksaan',
  certificates: 'Laporan Sertifikat',
  distributions: 'Laporan Distribusi',
  circulation: 'Laporan Pengawasan Peredaran',
  'pbt-performance': 'Kinerja PBT',
};
