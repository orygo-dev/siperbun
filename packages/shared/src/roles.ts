export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PIMPINAN: 'PIMPINAN',
  ADMIN: 'ADMIN',
  PBT: 'PBT',
  PENANGKAR: 'PENANGKAR',
} as const;

export type RoleSlug = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<RoleSlug, string> = {
  SUPER_ADMIN: 'Super Admin',
  PIMPINAN: 'Pimpinan',
  ADMIN: 'Admin',
  PBT: 'Pengawas Benih Tanaman',
  PENANGKAR: 'Penangkar',
};

/** Pemetaan role lama → role baru (untuk migrasi) */
export const LEGACY_ROLE_MAP: Record<string, RoleSlug> = {
  KEPALA_DINAS: ROLES.PIMPINAN,
  KEPALA_UPTD: ROLES.PIMPINAN,
  KOORDINATOR: ROLES.ADMIN,
  ADMIN_SERTIFIKASI: ROLES.ADMIN,
  ADMIN_KABUPATEN: ROLES.ADMIN,
};
