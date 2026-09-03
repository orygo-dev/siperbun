export const APP_NAME = 'SIPERBUN';
export const APP_FULL_NAME = 'Sistem Informasi Perbenihan Perkebunan';
export const OFFICE_NAME =
  'UPTD Balai Pengawasan Sertifikasi Benih dan Proteksi Tanaman Perkebunan Provinsi Kalimantan Selatan';

export const API_PREFIX = '/api/v1';

export const KALSEL_MAP_CENTER = {
  lat: -3.0,
  lng: 115.0,
  zoom: 8,
} as const;

/** Nama kabupaten/kota resmi Kalsel (selaras seed wilayah & peta dashboard) */
export const KALSEL_DISTRICTS = [
  'Balangan',
  'Banjar',
  'Banjarbaru',
  'Banjarmasin',
  'Barito Kuala',
  'Hulu Sungai Selatan',
  'Hulu Sungai Tengah',
  'Hulu Sungai Utara',
  'Kotabaru',
  'Tabalong',
  'Tanah Bumbu',
  'Tanah Laut',
  'Tapin',
] as const;

export type KalselDistrict = (typeof KALSEL_DISTRICTS)[number];

function normalizeDistrictKey(value: string) {
  return value.toLocaleLowerCase('id-ID').replace(/[^a-z0-9]/g, '');
}

export function canonicalizeKalselDistrict(
  value: string,
): KalselDistrict | null {
  const key = normalizeDistrictKey(value.trim());
  if (!key) return null;
  return KALSEL_DISTRICTS.find((d) => normalizeDistrictKey(d) === key) ?? null;
}

export const REFRESH_COOKIE_NAME = 'siperbun_refresh';

export const APPLICATION_DOCUMENT_TITLES = [
  'Surat permohonan',
  'Surat izin usaha produksi benih dan/atau perizinan perusahaan berbasis risiko',
  'Sertifikat standar',
  'Sertifikat mutu benih',
  'Daftar persilangan atau kode persilangan',
  'Dokumen (data dan berita acara) seleksi pembenihan di Pre Nursery / Main Nursery',
  'Surat pengantar / Delivery Order (DO) asal-usul kecambah',
  'Ketersediaan tenaga yang kompeten di kebun',
  'Dokumen status kepemilikan kebun perbenihan',
  'Rekam pemeliharaan kebun perbenihan',
] as const;

export type ApplicationDocumentTitle =
  (typeof APPLICATION_DOCUMENT_TITLES)[number];

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
