import { z } from 'zod';
import {
  ApplicationStatus,
  AssignmentStatus,
  CertificateStatus,
  FindingStatus,
  ProductionStatus,
  ProducerStatus,
  Severity,
} from './statuses';

export const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const profileUpdateSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(191),
  phone: z
    .string()
    .max(30)
    .optional()
    .nullable()
    .transform((v) => (v === '' || v == null ? null : v)),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

const optionalEmail = z
  .union([z.string().email('Email tidak valid'), z.literal('')])
  .optional()
  .nullable()
  .transform((v) => (v === '' ? null : v));

const optionalString = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v === '' ? null : v));

const optionalNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null;
  if (typeof val === 'number' && Number.isNaN(val)) return null;
  return val;
}, z.coerce.number().nullable().optional());

const producerStatusEnum = z.enum([
  ProducerStatus.DRAFT,
  ProducerStatus.PENDING_VERIFICATION,
  ProducerStatus.VERIFIED,
  ProducerStatus.ACTIVE,
  ProducerStatus.INACTIVE,
  ProducerStatus.REJECTED,
]);

export const landOwnershipStatusSchema = z.enum(
  ['RENTED', 'BORROWED', 'OWNED'],
  { required_error: 'Status kepemilikan lahan wajib dipilih' },
);

export type LandOwnershipStatus = z.infer<typeof landOwnershipStatusSchema>;

export const producerCreateSchema = z.object({
  registrationNumber: optionalString,
  businessName: z.string().min(1, 'Nama usaha wajib diisi').max(191),
  businessType: optionalString,
  ownerName: z.string().min(1, 'Nama penanggung jawab wajib diisi').max(191),
  nik: optionalString,
  nib: optionalString,
  phone: optionalString,
  email: optionalEmail,
  address: optionalString,
  nurseryAddress: optionalString,
  landOwnershipStatus: landOwnershipStatusSchema.optional().nullable(),
  kabupatenId: optionalString,
  nurseryKabupatenId: optionalString,
  kecamatan: optionalString,
  desa: optionalString,
  latitude: optionalNumber,
  longitude: optionalNumber,
  productionCapacity: optionalNumber,
  status: producerStatusEnum.optional(),
  isActive: z.boolean().optional(),
  notes: optionalString,
});

export type ProducerCreateInput = z.infer<typeof producerCreateSchema>;

export const producerUpdateSchema = producerCreateSchema.partial().extend({
  businessName: z.string().min(1, 'Nama usaha wajib diisi').max(191).optional(),
  ownerName: z
    .string()
    .min(1, 'Nama penanggung jawab wajib diisi')
    .max(191)
    .optional(),
});

export type ProducerUpdateInput = z.infer<typeof producerUpdateSchema>;

export const nurseryCreateSchema = z.object({
  producerId: z.string().uuid('Penangkar wajib dipilih'),
  commodityId: optionalString,
  regionId: optionalString,
  name: z.string().min(1, 'Nama lokasi wajib diisi').max(191),
  address: optionalString,
  landOwnershipStatus: landOwnershipStatusSchema.optional().nullable(),
  latitude: optionalNumber,
  longitude: optionalNumber,
  areaHa: optionalNumber,
  capacity: optionalNumber,
  waterSource: optionalString,
  facilities: optionalString,
  status: z.string().max(30).optional().default('ACTIVE'),
  notes: optionalString,
});

export type NurseryCreateInput = z.infer<typeof nurseryCreateSchema>;

export const nurseryUpdateSchema = nurseryCreateSchema.partial().extend({
  producerId: z.string().uuid('Penangkar wajib dipilih').optional(),
  name: z.string().min(1, 'Nama lokasi wajib diisi').max(191).optional(),
});

export type NurseryUpdateInput = z.infer<typeof nurseryUpdateSchema>;

export const seedGardenCreateSchema = z.object({
  producerId: optionalString,
  commodityId: z.string().uuid('Komoditas wajib dipilih'),
  varietyId: optionalString,
  regionId: optionalString,
  name: z.string().min(1, 'Nama kebun wajib diisi').max(191),
  ownerName: optionalString,
  address: optionalString,
  latitude: optionalNumber,
  longitude: optionalNumber,
  areaHa: optionalNumber,
  clone: optionalString,
  plantingYear: optionalNumber,
  motherTreeCount: optionalNumber,
  estimatedYield: optionalNumber,
  decreeNumber: optionalString,
  decreeDate: optionalString,
  validUntil: optionalString,
  status: z.string().max(30).optional().default('ACTIVE'),
});

export type SeedGardenCreateInput = z.infer<typeof seedGardenCreateSchema>;

export const seedGardenUpdateSchema = seedGardenCreateSchema.partial().extend({
  commodityId: z.string().uuid('Komoditas wajib dipilih').optional(),
  name: z.string().min(1, 'Nama kebun wajib diisi').max(191).optional(),
});

export type SeedGardenUpdateInput = z.infer<typeof seedGardenUpdateSchema>;

export const commodityCreateSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi').max(20),
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  scientificName: optionalString,
  unit: z.string().max(30).optional().default('batang'),
  isActive: z.boolean().optional().default(true),
});

export type CommodityCreateInput = z.infer<typeof commodityCreateSchema>;

export const commodityUpdateSchema = commodityCreateSchema.partial();

export type CommodityUpdateInput = z.infer<typeof commodityUpdateSchema>;

export const varietyCreateSchema = z.object({
  commodityId: z.string().uuid('Komoditas wajib dipilih'),
  code: z.string().min(1, 'Kode wajib diisi').max(30),
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  clone: optionalString,
  description: optionalString,
  isActive: z.boolean().optional().default(true),
});

export type VarietyCreateInput = z.infer<typeof varietyCreateSchema>;

export const varietyUpdateSchema = varietyCreateSchema.partial().extend({
  commodityId: z.string().uuid('Komoditas wajib dipilih').optional(),
});

export type VarietyUpdateInput = z.infer<typeof varietyUpdateSchema>;

export const regionCreateSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi').max(20),
  name: z.string().min(1, 'Nama wajib diisi').max(150),
  type: z.enum(['PROVINSI', 'KABUPATEN', 'KECAMATAN', 'DESA']),
  parentId: optionalString,
  latitude: optionalNumber,
  longitude: optionalNumber,
});

export type RegionCreateInput = z.infer<typeof regionCreateSchema>;

export const regionUpdateSchema = regionCreateSchema.partial();

export type RegionUpdateInput = z.infer<typeof regionUpdateSchema>;

export const userCreateSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  name: z.string().min(1, 'Nama wajib diisi').max(191),
  phone: optionalString,
  officeId: optionalString,
  regionId: optionalString,
  producerId: optionalString,
  isActive: z.boolean().optional().default(true),
  roleIds: z.array(z.string().uuid()).min(1, 'Minimal satu role wajib dipilih'),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  email: z.string().email('Email tidak valid').optional(),
  password: z
    .string()
    .min(6, 'Password minimal 6 karakter')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  name: z.string().min(1, 'Nama wajib diisi').max(191).optional(),
  phone: optionalString,
  officeId: optionalString,
  regionId: optionalString,
  producerId: optionalString,
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

const productionStatusEnum = z.enum([
  ProductionStatus.PREPARATION,
  ProductionStatus.SOWING,
  ProductionStatus.GROWING,
  ProductionStatus.READY_FOR_INSPECTION,
  ProductionStatus.UNDER_INSPECTION,
  ProductionStatus.PASSED,
  ProductionStatus.FAILED,
  ProductionStatus.COMPLETED,
  ProductionStatus.CANCELLED,
]);

const applicationStatusEnum = z.enum([
  ApplicationStatus.DRAFT,
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.ADMIN_REVIEW,
  ApplicationStatus.ADMIN_REVISION_REQUIRED,
  ApplicationStatus.DOCUMENT_COMPLETE,
  ApplicationStatus.WAITING_ASSIGNMENT,
  ApplicationStatus.INSPECTION_SCHEDULED,
  ApplicationStatus.INSPECTION_IN_PROGRESS,
  ApplicationStatus.FIELD_REVISION_REQUIRED,
  ApplicationStatus.WAITING_RESULT_VALIDATION,
  ApplicationStatus.INSPECTION_PASSED,
  ApplicationStatus.INSPECTION_FAILED,
  ApplicationStatus.WAITING_LHP_INVOICE,
  ApplicationStatus.WAITING_PAYMENT,
  ApplicationStatus.PAYMENT_VERIFICATION,
  ApplicationStatus.PAYMENT_REJECTED,
  ApplicationStatus.PAYMENT_VERIFIED,
  ApplicationStatus.CERTIFICATE_ISSUED_MANUALLY,
  ApplicationStatus.WAITING_CERTIFICATE_SCAN,
  ApplicationStatus.CERTIFICATE_SCAN_UPLOADED,
  ApplicationStatus.COMPLETED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.CANCELLED,
]);

export const seedSourceCreateSchema = z.object({
  producerId: z.string().uuid('Penangkar wajib dipilih'),
  seedGardenId: optionalString,
  commodityId: z.string().uuid('Komoditas wajib dipilih'),
  varietyId: optionalString,
  lotNumber: z.string().min(1, 'Nomor lot wajib diisi').max(50),
  receivedAt: optionalString,
  quantity: z.coerce.number().positive('Jumlah harus lebih dari 0'),
  unit: z.string().max(30).optional().default('kg'),
  supplier: optionalString,
  originDocumentNumber: optionalString,
  sourceCertificateNo: optionalString,
  usedQuantity: z.coerce.number().min(0).optional().default(0),
  verificationStatus: z.string().max(30).optional().default('PENDING'),
  notes: optionalString,
});

export type SeedSourceCreateInput = z.infer<typeof seedSourceCreateSchema>;

export const seedSourceUpdateSchema = seedSourceCreateSchema.partial().extend({
  producerId: z.string().uuid('Penangkar wajib dipilih').optional(),
  commodityId: z.string().uuid('Komoditas wajib dipilih').optional(),
  lotNumber: z.string().min(1, 'Nomor lot wajib diisi').max(50).optional(),
  quantity: z.coerce.number().positive('Jumlah harus lebih dari 0').optional(),
  remainingStock: optionalNumber,
});

export type SeedSourceUpdateInput = z.infer<typeof seedSourceUpdateSchema>;

export const productionBatchCreateSchema = z.object({
  batchNumber: optionalString,
  producerId: z.string().uuid('Penangkar wajib dipilih'),
  nurseryId: optionalString,
  seedSourceId: optionalString,
  commodityId: z.string().uuid('Komoditas wajib dipilih'),
  varietyId: optionalString,
  startedAt: optionalString,
  initialCount: z.coerce.number().int().min(0).optional().default(0),
  grownCount: z.coerce.number().int().min(0).optional(),
  deadCount: z.coerce.number().int().min(0).optional(),
  rejectedCount: z.coerce.number().int().min(0).optional(),
  activeCount: z.coerce.number().int().min(0).optional(),
  readyCount: z.coerce.number().int().min(0).optional(),
  status: productionStatusEnum.optional().default(ProductionStatus.PREPARATION),
  notes: optionalString,
});

export type ProductionBatchCreateInput = z.infer<
  typeof productionBatchCreateSchema
>;

export const productionBatchUpdateSchema = productionBatchCreateSchema
  .partial()
  .extend({
    producerId: z.string().uuid('Penangkar wajib dipilih').optional(),
    commodityId: z.string().uuid('Komoditas wajib dipilih').optional(),
  });

export type ProductionBatchUpdateInput = z.infer<
  typeof productionBatchUpdateSchema
>;

export const productionLogCreateSchema = z.object({
  stage: z.string().min(1, 'Tahap wajib diisi').max(50),
  activity: z.string().min(1, 'Aktivitas wajib diisi').max(255),
  loggedAt: optionalString,
  countChange: optionalNumber,
  condition: optionalString,
  notes: optionalString,
  grownCount: optionalNumber,
  deadCount: optionalNumber,
  rejectedCount: optionalNumber,
  activeCount: optionalNumber,
  readyCount: optionalNumber,
});

export type ProductionLogCreateInput = z.infer<typeof productionLogCreateSchema>;

export const productionStatusChangeSchema = z.object({
  status: productionStatusEnum,
  notes: optionalString,
});

export type ProductionStatusChangeInput = z.infer<
  typeof productionStatusChangeSchema
>;

export const certificationApplicationCreateSchema = z.object({
  producerId: z.string().uuid('Penangkar wajib dipilih'),
  batchId: optionalString,
  commodityId: z.string().uuid('Komoditas wajib dipilih'),
  varietyId: optionalString,
  nurseryId: optionalString,
  seedlingCount: z.coerce
    .number()
    .int()
    .positive('Jumlah bibit harus lebih dari 0'),
  readyAt: optionalString,
  inspectionType: optionalString,
  notes: optionalString,
});

export type CertificationApplicationCreateInput = z.infer<
  typeof certificationApplicationCreateSchema
>;

export const certificationApplicationUpdateSchema =
  certificationApplicationCreateSchema.partial().extend({
    producerId: z.string().uuid('Penangkar wajib dipilih').optional(),
    commodityId: z.string().uuid('Komoditas wajib dipilih').optional(),
    seedlingCount: z.coerce
      .number()
      .int()
      .positive('Jumlah bibit harus lebih dari 0')
      .optional(),
  });

export type CertificationApplicationUpdateInput = z.infer<
  typeof certificationApplicationUpdateSchema
>;

export const invoiceCreateSchema = z.object({
  reportNumber: z.string().trim().min(3, 'Nomor LHP wajib diisi').max(50),
  invoiceNumber: z.string().trim().min(3, 'Nomor invoice wajib diisi').max(50),
  amount: z.coerce.number().positive('Nominal harus lebih dari 0'),
  dueDate: z.string().min(1, 'Batas pembayaran wajib diisi'),
  paymentInstructions: optionalString,
  notes: optionalString,
});

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;

export const paymentProofCreateSchema = z.object({
  notes: optionalString,
});

export const paymentVerificationSchema = z.object({
  decision: z.enum(['ACCEPTED', 'REJECTED']),
  notes: optionalString,
}).superRefine((value, context) => {
  if (value.decision === 'REJECTED' && !value.notes?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'Alasan penolakan pembayaran wajib diisi',
    });
  }
});

export const applicationStatusChangeSchema = z.object({
  toStatus: applicationStatusEnum,
  notes: optionalString,
}).superRefine((value, context) => {
  if (value.toStatus === ApplicationStatus.REJECTED && !value.notes?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'Alasan penolakan pengajuan wajib diisi',
    });
  }
});

export type ApplicationStatusChangeInput = z.infer<
  typeof applicationStatusChangeSchema
>;

export const assignInspectorSchema = z.object({
  inspectorId: z.string().uuid('PBT wajib dipilih'),
  scheduledDate: z.string().min(1, 'Tanggal jadwal wajib diisi'),
  scheduledTime: optionalString,
  instructions: optionalString,
  locationNotes: optionalString,
});

export type AssignInspectorInput = z.infer<typeof assignInspectorSchema>;

export const applicationNotesSchema = z.object({
  notes: optionalString,
});

export type ApplicationNotesInput = z.infer<typeof applicationNotesSchema>;

export const applicationRevisionSchema = z.object({
  notes: z
    .string()
    .trim()
    .min(5, 'Catatan perbaikan minimal 5 karakter')
    .max(2000, 'Catatan perbaikan maksimal 2000 karakter'),
});

export type ApplicationRevisionInput = z.infer<
  typeof applicationRevisionSchema
>;

const assignmentStatusEnum = z.enum([
  AssignmentStatus.SCHEDULED,
  AssignmentStatus.CONFIRMED,
  AssignmentStatus.EN_ROUTE,
  AssignmentStatus.INSPECTING,
  AssignmentStatus.COMPLETED,
  AssignmentStatus.RESCHEDULED,
  AssignmentStatus.CANCELLED,
]);

const findingStatusEnum = z.enum([
  FindingStatus.OPEN,
  FindingStatus.IN_PROGRESS,
  FindingStatus.WAITING_VERIFICATION,
  FindingStatus.ACCEPTED,
  FindingStatus.REJECTED,
  FindingStatus.CLOSED,
]);

const severityEnum = z.enum([
  Severity.LOW,
  Severity.MEDIUM,
  Severity.HIGH,
  Severity.CRITICAL,
]);

export const fieldAssignmentUpdateSchema = z.object({
  status: assignmentStatusEnum.optional(),
  scheduledDate: optionalString,
  scheduledTime: optionalString,
  instructions: optionalString,
  locationNotes: optionalString,
});

export type FieldAssignmentUpdateInput = z.infer<
  typeof fieldAssignmentUpdateSchema
>;

export const fieldInspectionCreateSchema = z.object({
  assignmentId: z.string().uuid('Penugasan wajib dipilih'),
  latitude: optionalNumber,
  longitude: optionalNumber,
  gpsAccuracy: optionalNumber,
  populationCount: optionalNumber,
  sampleCount: optionalNumber,
  passedCount: optionalNumber,
  failedCount: optionalNumber,
  rejectedCount: optionalNumber,
});

export type FieldInspectionCreateInput = z.infer<
  typeof fieldInspectionCreateSchema
>;

const checklistResultItemSchema = z.object({
  checklistId: z.string().uuid('Checklist wajib dipilih'),
  value: optionalString,
  isPassed: z.boolean().optional().nullable(),
  notes: optionalString,
});

export const fieldInspectionUpdateSchema = z.object({
  startedAt: optionalString,
  finishedAt: optionalString,
  latitude: optionalNumber,
  longitude: optionalNumber,
  gpsAccuracy: optionalNumber,
  populationCount: optionalNumber,
  sampleCount: optionalNumber,
  passedCount: optionalNumber,
  failedCount: optionalNumber,
  rejectedCount: optionalNumber,
  conclusion: optionalString,
  recommendation: optionalString,
  notes: optionalString,
  results: z.array(checklistResultItemSchema).optional(),
});

export type FieldInspectionUpdateInput = z.infer<
  typeof fieldInspectionUpdateSchema
>;

export const inspectionResultsUpsertSchema = z.object({
  results: z.array(checklistResultItemSchema).min(1, 'Minimal satu hasil'),
});

export type InspectionResultsUpsertInput = z.infer<
  typeof inspectionResultsUpsertSchema
>;

export const inspectionFindingCreateSchema = z.object({
  findingType: z.string().min(1, 'Jenis temuan wajib diisi').max(100),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  severity: severityEnum.optional().default(Severity.MEDIUM),
  recommendation: optionalString,
  dueDate: optionalString,
  applicationId: optionalString,
});

export type InspectionFindingCreateInput = z.infer<
  typeof inspectionFindingCreateSchema
>;

export const findingUpdateSchema = z.object({
  status: findingStatusEnum.optional(),
  description: z.string().min(1).optional(),
  findingType: z.string().min(1).max(100).optional(),
  severity: severityEnum.optional(),
  recommendation: optionalString,
  dueDate: optionalString,
});

export type FindingUpdateInput = z.infer<typeof findingUpdateSchema>;

export const correctiveActionCreateSchema = z.object({
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  evidenceNotes: optionalString,
});

export type CorrectiveActionCreateInput = z.infer<
  typeof correctiveActionCreateSchema
>;

export const verifyCorrectiveActionSchema = z.object({
  decision: z.enum(['ACCEPTED', 'REJECTED']),
  notes: optionalString,
});

export type VerifyCorrectiveActionInput = z.infer<
  typeof verifyCorrectiveActionSchema
>;

export const finalizeInspectionSchema = z.object({
  result: z.enum(['PASS', 'FAIL', 'REVISION']),
  conclusion: optionalString,
  notes: optionalString,
});

export type FinalizeInspectionInput = z.infer<typeof finalizeInspectionSchema>;

export const validateResultSchema = z.object({
  passed: z.boolean(),
  notes: optionalString,
});

export type ValidateResultInput = z.infer<typeof validateResultSchema>;

export const validateInspectionSchema = z.object({
  decision: z.enum(['PASS', 'FAIL']),
  notes: optionalString,
});

export type ValidateInspectionInput = z.infer<typeof validateInspectionSchema>;

const certificateStatusEnum = z.enum([
  CertificateStatus.WAITING_ISSUANCE,
  CertificateStatus.ISSUED_MANUALLY,
  CertificateStatus.WAITING_SCAN,
  CertificateStatus.SCAN_UPLOADED,
  CertificateStatus.WAITING_VERIFICATION,
  CertificateStatus.ACTIVE,
  CertificateStatus.REJECTED,
  CertificateStatus.REPLACED,
  CertificateStatus.CANCELLED,
  CertificateStatus.EXPIRED,
]);

export const certificateCreateSchema = z.object({
  applicationId: z.string().uuid('Pengajuan wajib dipilih'),
  certificateNumber: optionalString,
  issuedAt: optionalString,
  expiresAt: optionalString,
  certifiedCount: optionalNumber,
  signatoryName: optionalString,
  signatoryTitle: optionalString,
  notes: optionalString,
  status: certificateStatusEnum.optional(),
});

export type CertificateCreateInput = z.infer<typeof certificateCreateSchema>;

export const certificateUpdateSchema = z.object({
  certificateNumber: optionalString,
  issuedAt: optionalString,
  expiresAt: optionalString,
  certifiedCount: optionalNumber,
  signatoryName: optionalString,
  signatoryTitle: optionalString,
  notes: optionalString,
  status: certificateStatusEnum.optional(),
});

export type CertificateUpdateInput = z.infer<typeof certificateUpdateSchema>;

export const certificateVerifyScanSchema = z.object({
  approved: z.boolean(),
  notes: optionalString,
});

export type CertificateVerifyScanInput = z.infer<
  typeof certificateVerifyScanSchema
>;

export const certificateReplaceScanSchema = z.object({
  reason: optionalString,
});

export type CertificateReplaceScanInput = z.infer<
  typeof certificateReplaceScanSchema
>;

export const certificateCancelSchema = z.object({
  reason: optionalString,
});

export type CertificateCancelInput = z.infer<typeof certificateCancelSchema>;

// ─── Stage 6: Labels, Distributions, Circulation ─────────────────────────────

export const seedLabelCreateSchema = z.object({
  certificateId: z.string().uuid('Sertifikat wajib dipilih'),
  serialStart: z.string().min(1, 'Serial awal wajib diisi').max(50),
  serialEnd: z.string().min(1, 'Serial akhir wajib diisi').max(50),
  quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1'),
  receivedAt: optionalString,
  handedOverAt: optionalString,
  recipient: optionalString,
  usedCount: optionalNumber,
  damagedCount: optionalNumber,
  cancelledCount: optionalNumber,
  notes: optionalString,
});

export type SeedLabelCreateInput = z.infer<typeof seedLabelCreateSchema>;

export const seedLabelUpdateSchema = seedLabelCreateSchema
  .omit({ certificateId: true })
  .partial()
  .extend({
    certificateId: z.string().uuid().optional(),
    serialStart: z.string().min(1).max(50).optional(),
    serialEnd: z.string().min(1).max(50).optional(),
    quantity: z.coerce.number().int().min(1).optional(),
  });

export type SeedLabelUpdateInput = z.infer<typeof seedLabelUpdateSchema>;

export const labelDistributionCreateSchema = z.object({
  producerId: optionalString,
  quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1'),
  notes: optionalString,
});

export type LabelDistributionCreateInput = z.infer<
  typeof labelDistributionCreateSchema
>;

export const seedDistributionCreateSchema = z.object({
  producerId: z.string().uuid('Penangkar wajib dipilih').optional(),
  certificateId: optionalString,
  batchId: optionalString,
  buyerName: z.string().min(1, 'Nama pembeli wajib diisi').max(191),
  buyerAddress: optionalString,
  destinationKab: z
    .string()
    .min(1, 'Kabupaten tujuan wajib dipilih')
    .max(191),
  quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1'),
  distributedAt: z.string().min(1, 'Tanggal distribusi wajib diisi'),
  deliveryNoteNo: optionalString,
  notes: optionalString,
});

export type SeedDistributionCreateInput = z.infer<
  typeof seedDistributionCreateSchema
>;

export const seedDistributionUpdateSchema = seedDistributionCreateSchema
  .partial()
  .extend({
    producerId: z.string().uuid().optional(),
    buyerName: z.string().min(1).max(191).optional(),
    quantity: z.coerce.number().int().min(1).optional(),
    distributedAt: z.string().min(1).optional(),
  });

export type SeedDistributionUpdateInput = z.infer<
  typeof seedDistributionUpdateSchema
>;

const circulationFindingCategoryEnum = z.enum([
  'NO_CERTIFICATE',
  'CERT_MISMATCH',
  'LABEL_MISMATCH',
  'CERT_EXPIRED',
  'QTY_MISMATCH',
  'UNCLEAR_ORIGIN',
  'SUSPICIOUS_DOCS',
  'OTHER',
]);

export const circulationFindingItemSchema = z.object({
  category: circulationFindingCategoryEnum,
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  severity: severityEnum.optional().default(Severity.MEDIUM),
});

export type CirculationFindingItemInput = z.infer<
  typeof circulationFindingItemSchema
>;

export const circulationInspectionCreateSchema = z.object({
  inspectorName: optionalString,
  inspectedAt: z.string().min(1, 'Tanggal pengawasan wajib diisi'),
  location: optionalString,
  latitude: optionalNumber,
  longitude: optionalNumber,
  businessName: optionalString,
  ownerName: optionalString,
  commodityName: optionalString,
  seedlingCount: optionalNumber,
  certificateNumber: optionalString,
  certificateStatus: optionalString,
  labelStatus: optionalString,
  actionTaken: optionalString,
  recommendation: optionalString,
  followUp: optionalString,
  findings: z.array(circulationFindingItemSchema).optional(),
});

export type CirculationInspectionCreateInput = z.infer<
  typeof circulationInspectionCreateSchema
>;

export const circulationInspectionUpdateSchema =
  circulationInspectionCreateSchema
    .omit({ findings: true })
    .partial()
    .extend({
      inspectedAt: z.string().min(1).optional(),
    });

export type CirculationInspectionUpdateInput = z.infer<
  typeof circulationInspectionUpdateSchema
>;

export const circulationFindingCreateSchema = circulationFindingItemSchema;

export type CirculationFindingCreateInput = z.infer<
  typeof circulationFindingCreateSchema
>;

export const brandingUpdateSchema = z.object({
  appName: z
    .string()
    .min(2, 'Nama aplikasi minimal 2 karakter')
    .max(80, 'Nama aplikasi maksimal 80 karakter'),
  fullName: z
    .string()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(200, 'Nama lengkap maksimal 200 karakter'),
  officeName: z
    .string()
    .min(2, 'Nama instansi minimal 2 karakter')
    .max(200, 'Nama instansi maksimal 200 karakter'),
});

export type BrandingUpdateInput = z.infer<typeof brandingUpdateSchema>;

const portalLinkSchema = z
  .string()
  .min(1, 'Tautan wajib diisi')
  .max(500, 'Tautan maksimal 500 karakter')
  .refine(
    (value) =>
      value.startsWith('/') ||
      value.startsWith('#') ||
      /^https?:\/\//i.test(value) ||
      /^(mailto|tel):/i.test(value),
    'Gunakan path internal, anchor, URL http(s), email, atau telepon',
  );

const portalServiceSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().min(5).max(300),
  link: portalLinkSchema,
});

export const portalContentSchema = z.object({
  hero: z.object({
    enabled: z.boolean(),
    title: z.string().min(10).max(160),
    description: z.string().min(10).max(400),
    primaryLabel: z.string().min(2).max(40),
    primaryLink: portalLinkSchema,
    secondaryLabel: z.string().min(2).max(40),
    secondaryLink: portalLinkSchema,
  }),
  profile: z.object({
    enabled: z.boolean(),
    title: z.string().min(5).max(140),
    body: z.string().min(20).max(1500),
    secondaryBody: z.string().max(1500),
    responsibilities: z.array(z.string().min(5).max(240)).min(1).max(8),
  }),
  services: z.object({
    enabled: z.boolean(),
    title: z.string().min(5).max(120),
    intro: z.string().min(10).max(400),
    items: z.array(portalServiceSchema).min(1).max(6),
  }),
  visionMission: z.object({
    enabled: z.boolean(),
    vision: z.string().min(20).max(700),
    missions: z.array(z.string().min(10).max(400)).min(1).max(8),
  }),
  map: z.object({
    enabled: z.boolean(),
    title: z.string().min(5).max(140),
    description: z.string().min(10).max(400),
  }),
  contact: z.object({
    enabled: z.boolean(),
    title: z.string().min(5).max(180),
    primaryLabel: z.string().min(2).max(50),
    primaryLink: portalLinkSchema,
    secondaryLabel: z.string().min(2).max(50),
    secondaryLink: portalLinkSchema,
    address: z.string().min(5).max(500),
    hours: z.string().min(5).max(160),
    phone: z.string().min(5).max(40),
    email: z.string().email('Email tidak valid').max(191),
  }),
});

export type PortalContentInput = z.infer<typeof portalContentSchema>;

const optionalDateTime = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null;
  return val;
}, z.coerce.date().nullable().optional());

const optionalLinkUrl = z
  .string()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => (v === '' || v == null ? null : v))
  .refine(
    (v) => v == null || v.startsWith('/') || /^https?:\/\//i.test(v),
    'Link harus berupa path internal (/...) atau URL http(s)',
  );

export const BANNER_PLACEMENTS = {
  DASHBOARD: 'DASHBOARD',
  MOBILE: 'MOBILE',
} as const;

export type BannerPlacement =
  (typeof BANNER_PLACEMENTS)[keyof typeof BANNER_PLACEMENTS];

export const BANNER_PLACEMENT_LABELS: Record<BannerPlacement, string> = {
  DASHBOARD: 'Dashboard Dinas',
  MOBILE: 'Slide Mobile (Portal & Penangkar)',
};

const dashboardBannerFields = z.object({
  title: z
    .string()
    .max(120, 'Judul maksimal 120 karakter')
    .optional()
    .nullable()
    .transform((v) => (v == null ? '' : String(v).trim())),
  subtitle: z
    .string()
    .max(255, 'Subjudul maksimal 255 karakter')
    .optional()
    .nullable()
    .transform((v) => (v === '' || v == null ? null : v)),
  linkUrl: optionalLinkUrl,
  placement: z
    .enum([BANNER_PLACEMENTS.DASHBOARD, BANNER_PLACEMENTS.MOBILE])
    .default(BANNER_PLACEMENTS.DASHBOARD),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  startsAt: optionalDateTime,
  endsAt: optionalDateTime,
});

export const dashboardBannerCreateSchema = dashboardBannerFields.superRefine(
  (data, ctx) => {
    if (data.placement === BANNER_PLACEMENTS.MOBILE) return;
    if (data.title.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['title'],
        message: 'Judul minimal 2 karakter',
      });
    }
  },
);

export type DashboardBannerCreateInput = z.infer<
  typeof dashboardBannerFields
>;

export const dashboardBannerUpdateSchema = dashboardBannerFields.partial();

export type DashboardBannerUpdateInput = z.infer<
  typeof dashboardBannerUpdateSchema
>;

export const publicListingCreateSchema = z.object({
  producerId: z.string().uuid('Penangkar wajib dipilih'),
  nurseryId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .transform((v) => (v === '' || v == null ? null : v)),
  commodityId: z.string().uuid('Komoditas wajib dipilih'),
  varietyId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .transform((v) => (v === '' || v == null ? null : v)),
  title: z
    .string()
    .min(3, 'Judul minimal 3 karakter')
    .max(160, 'Judul maksimal 160 karakter'),
  description: optionalString,
  availableQty: optionalNumber,
  ageMonths: z.coerce
    .number()
    .int()
    .min(0, 'Usia tidak valid')
    .max(120, 'Usia maksimal 120 bulan')
    .optional()
    .nullable(),
  unit: z.string().max(30).default('batang'),
  priceHint: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((v) => (v === '' || v == null ? null : v)),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

export type PublicListingCreateInput = z.infer<typeof publicListingCreateSchema>;

export const publicListingUpdateSchema = publicListingCreateSchema.partial();

export type PublicListingUpdateInput = z.infer<typeof publicListingUpdateSchema>;

export const producerRegistrationSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, 'Nama perusahaan/lembaga/perorangan minimal 2 karakter')
    .max(191),
  producerName: z
    .string()
    .trim()
    .min(2, 'Nama penangkar minimal 2 karakter')
    .max(191),
  email: z.string().trim().email('Email tidak valid').max(191),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(72, 'Password maksimal 72 karakter')
    .regex(/[A-Za-z]/, 'Password harus memuat huruf')
    .regex(/[0-9]/, 'Password harus memuat angka'),
  phone: z.string().trim().min(8, 'Nomor HP wajib diisi').max(30),
  officeAddress: z
    .string()
    .trim()
    .min(5, 'Alamat kantor wajib diisi')
    .max(2000),
  kabupatenId: z.string().uuid('Kabupaten kantor wajib dipilih'),
  nurseryAddress: z
    .string()
    .trim()
    .min(5, 'Alamat lokasi pembibitan wajib diisi')
    .max(2000),
  nurseryKabupatenId: z
    .string()
    .uuid('Kabupaten lokasi pembibitan wajib dipilih'),
  landOwnershipStatus: landOwnershipStatusSchema,
});

export type ProducerRegistrationInput = z.infer<
  typeof producerRegistrationSchema
>;

export const pushPlatformSchema = z.enum(['ANDROID', 'IOS', 'WEB']);

export const registerDeviceSchema = z.object({
  token: z.string().trim().min(10, 'Token FCM wajib diisi').max(512),
  platform: pushPlatformSchema,
  deviceId: z
    .string()
    .trim()
    .max(191)
    .optional()
    .nullable()
    .transform((v) => (v === '' || v == null ? null : v)),
  appVersion: z
    .string()
    .trim()
    .max(50)
    .optional()
    .nullable()
    .transform((v) => (v === '' || v == null ? null : v)),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

export const unregisterDeviceSchema = z.object({
  token: z.string().trim().min(10).max(512),
});

export type UnregisterDeviceInput = z.infer<typeof unregisterDeviceSchema>;
