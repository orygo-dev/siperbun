import {
  APPLICATION_DOCUMENT_TITLES,
  ApplicationStatus as AppStatusShared,
  type ApplicationStatusChangeInput,
  type AssignInspectorInput,
  type CertificationApplicationCreateInput,
  type CertificationApplicationUpdateInput,
  type InvoiceCreateInput,
} from '@siperbun/shared';
import {
  ApplicationStatus,
  DocumentKind,
  InvoiceStatus,
  PaymentProofStatus,
  Prisma,
} from '@prisma/client';
import path from 'path';
import { prisma } from '../../config/database';
import {
  type AccessUser,
  isInspectorUser,
  isProducerUser,
  requireProducerId,
} from '../../utils/access-scope';
import { AppError } from '../../utils/errors';
import { saveMulterFile, serializeStoredFile } from '../../utils/storage';

export const REQUIRED_APPLICATION_DOCUMENTS = APPLICATION_DOCUMENT_TITLES;

export const ALLOWED_TRANSITIONS: Record<
  ApplicationStatus,
  ApplicationStatus[]
> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['ADMIN_REVIEW', 'CANCELLED'],
  ADMIN_REVIEW: [
    'ADMIN_REVISION_REQUIRED',
    'DOCUMENT_COMPLETE',
    'REJECTED',
  ],
  ADMIN_REVISION_REQUIRED: ['SUBMITTED', 'CANCELLED'],
  DOCUMENT_COMPLETE: ['WAITING_ASSIGNMENT'],
  WAITING_ASSIGNMENT: ['INSPECTION_SCHEDULED', 'CANCELLED'],
  INSPECTION_SCHEDULED: ['INSPECTION_IN_PROGRESS', 'WAITING_ASSIGNMENT'],
  INSPECTION_IN_PROGRESS: [
    'FIELD_REVISION_REQUIRED',
    'WAITING_RESULT_VALIDATION',
  ],
  FIELD_REVISION_REQUIRED: ['INSPECTION_IN_PROGRESS', 'CANCELLED'],
  WAITING_RESULT_VALIDATION: ['INSPECTION_PASSED', 'INSPECTION_FAILED'],
  INSPECTION_PASSED: ['WAITING_LHP_INVOICE'],
  INSPECTION_FAILED: ['REJECTED', 'CANCELLED'],
  WAITING_LHP_INVOICE: ['WAITING_PAYMENT'],
  WAITING_PAYMENT: ['PAYMENT_VERIFICATION', 'CANCELLED'],
  PAYMENT_VERIFICATION: ['PAYMENT_REJECTED', 'PAYMENT_VERIFIED'],
  PAYMENT_REJECTED: ['PAYMENT_VERIFICATION', 'CANCELLED'],
  PAYMENT_VERIFIED: ['CERTIFICATE_ISSUED_MANUALLY'],
  CERTIFICATE_ISSUED_MANUALLY: ['WAITING_CERTIFICATE_SCAN'],
  WAITING_CERTIFICATE_SCAN: ['CERTIFICATE_SCAN_UPLOADED'],
  CERTIFICATE_SCAN_UPLOADED: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

function serializeApp<T extends Record<string, unknown>>(item: T) {
  const row = item as T & {
    seedlingCount?: bigint | number;
    batch?: {
      id: string;
      batchNumber: string;
      status: string;
      activeCount?: bigint | number | null;
    } | null;
  };
  return {
    ...row,
    seedlingCount:
      row.seedlingCount != null ? Number(row.seedlingCount) : 0,
    batch: row.batch
      ? {
          ...row.batch,
          activeCount:
            row.batch.activeCount != null
              ? Number(row.batch.activeCount)
              : 0,
        }
      : row.batch,
  };
}

const listInclude = {
  producer: {
    select: {
      id: true,
      businessName: true,
      registrationNumber: true,
      verifiedAt: true,
    },
  },
  commodity: { select: { id: true, name: true, code: true } },
  variety: { select: { id: true, name: true, code: true } },
  nursery: { select: { id: true, name: true } },
  batch: {
    select: { id: true, batchNumber: true, status: true, activeCount: true },
  },
  certificate: { select: { id: true, certificateNumber: true, status: true } },
} as const;

const detailInclude = {
  ...listInclude,
  statusHistory: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      changedBy: { select: { id: true, name: true, email: true } },
    },
  },
  assignments: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' as const },
    include: {
      inspector: { select: { id: true, name: true, email: true } },
    },
  },
  documents: {
    where: { deletedAt: null, fileId: { not: null } },
    orderBy: { createdAt: 'asc' as const },
    include: { file: true },
  },
  inspectionReport: { include: { file: true } },
  invoice: {
    include: {
      paymentProofs: {
        where: { deletedAt: null },
        orderBy: { submittedAt: 'desc' as const },
        include: { file: true },
      },
    },
  },
};

function applicationAccessWhere(user: AccessUser): Prisma.CertificationApplicationWhereInput {
  if (isProducerUser(user)) {
    return { producerId: requireProducerId(user) };
  }
  if (isInspectorUser(user)) {
    return { assignments: { some: { inspectorId: user.id, deletedAt: null } } };
  }
  return {};
}

function serializeDetail<T extends Record<string, unknown>>(item: T) {
  const serialized = serializeApp(item) as T & {
    documents?: Array<Record<string, unknown> & { file?: Parameters<typeof serializeStoredFile>[0] | null }>;
  };
  const documents = (serialized.documents ?? []).map((document) => ({
    ...document,
    file: document.file ? serializeStoredFile(document.file) : null,
  }));
  const detail = serialized as typeof serialized & {
    inspectionReport?: Record<string, unknown> & {
      file?: Parameters<typeof serializeStoredFile>[0] | null;
    };
    invoice?: Record<string, unknown> & {
      amount?: Prisma.Decimal | number;
      paymentProofs?: Array<Record<string, unknown> & {
        file?: Parameters<typeof serializeStoredFile>[0] | null;
      }>;
    };
  };
  const uploadedTitles = new Set(
    documents.map((document) =>
      String((document as Record<string, unknown>).title),
    ),
  );
  const missingDocuments = REQUIRED_APPLICATION_DOCUMENTS.filter(
    (title) => !uploadedTitles.has(title),
  );
  return {
    ...serialized,
    documents,
    inspectionReport: detail.inspectionReport
      ? {
          ...detail.inspectionReport,
          file: detail.inspectionReport.file
            ? serializeStoredFile(detail.inspectionReport.file)
            : null,
        }
      : null,
    invoice: detail.invoice
      ? {
          ...detail.invoice,
          amount: Number(detail.invoice.amount ?? 0),
          paymentProofs: (detail.invoice.paymentProofs ?? []).map((proof) => ({
            ...proof,
            file: proof.file ? serializeStoredFile(proof.file) : null,
          })),
        }
      : null,
    documentCompliance: {
      required: REQUIRED_APPLICATION_DOCUMENTS,
      missing: missingDocuments,
      complete: missingDocuments.length === 0,
      legacyVerified: false,
    },
  };
}

async function validateApplicationRelations(input: {
  producerId: string;
  batchId?: string | null;
  commodityId: string;
  varietyId?: string | null;
  nurseryId?: string | null;
  seedlingCount: number;
}) {
  const producer = await prisma.producer.findFirst({
    where: {
      id: input.producerId,
      deletedAt: null,
      isActive: true,
    },
  });
  if (!producer) {
    throw new AppError('Penangkar tidak aktif atau tidak ditemukan', 400);
  }

  const commodity = await prisma.commodity.findFirst({
    where: { id: input.commodityId, isActive: true },
  });
  if (!commodity) throw new AppError('Komoditas tidak aktif atau tidak ditemukan', 400);

  if (input.varietyId) {
    const variety = await prisma.variety.findFirst({
      where: { id: input.varietyId, commodityId: input.commodityId, isActive: true },
    });
    if (!variety) throw new AppError('Varietas tidak sesuai dengan komoditas', 400);
  }

  if (input.nurseryId) {
    const nursery = await prisma.nurseryLocation.findFirst({
      where: {
        id: input.nurseryId,
        producerId: input.producerId,
        deletedAt: null,
        status: 'ACTIVE',
      },
    });
    if (!nursery) throw new AppError('Lokasi pembibitan tidak aktif atau bukan milik penangkar', 400);
    if (nursery.commodityId && nursery.commodityId !== input.commodityId) {
      throw new AppError('Komoditas tidak sesuai dengan lokasi pembibitan', 400);
    }
  }

  if (input.batchId) {
    const batch = await prisma.productionBatch.findFirst({
      where: {
        id: input.batchId,
        producerId: input.producerId,
        commodityId: input.commodityId,
        deletedAt: null,
      },
    });
    if (!batch) throw new AppError('Batch tidak sesuai dengan penangkar atau komoditas', 400);
    if (input.nurseryId && batch.nurseryId && batch.nurseryId !== input.nurseryId) {
      throw new AppError('Batch tidak berasal dari lokasi pembibitan yang dipilih', 400);
    }
    if (input.varietyId && batch.varietyId && batch.varietyId !== input.varietyId) {
      throw new AppError('Varietas tidak sesuai dengan batch produksi', 400);
    }
    const available = Number(batch.readyCount > 0n ? batch.readyCount : batch.activeCount);
    if (input.seedlingCount > available) {
      throw new AppError(`Jumlah bibit melebihi stok batch yang tersedia (${available})`, 400);
    }
  }

  return producer;
}

async function nextApplicationNumber() {
  const year = new Date().getFullYear();
  const prefix = `SBN-${year}-`;
  const latest = await prisma.certificationApplication.findFirst({
    where: { applicationNumber: { startsWith: prefix } },
    orderBy: { applicationNumber: 'desc' },
    select: { applicationNumber: true },
  });
  let seq = 1;
  if (latest?.applicationNumber) {
    const part = latest.applicationNumber.split('-').pop();
    const n = Number(part);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

async function nextAssignmentNumber() {
  const year = new Date().getFullYear();
  const prefix = `ST-${year}-`;
  const latest = await prisma.fieldAssignment.findFirst({
    where: { assignmentNumber: { startsWith: prefix } },
    orderBy: { assignmentNumber: 'desc' },
    select: { assignmentNumber: true },
  });
  let seq = 1;
  if (latest?.assignmentNumber) {
    const part = latest.assignmentNumber.split('-').pop();
    const n = Number(part);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

function assertTransition(from: ApplicationStatus, to: ApplicationStatus) {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(
      `Transisi status dari ${from} ke ${to} tidak diizinkan`,
      400,
    );
  }
}

async function applyTransitions(
  id: string,
  steps: Array<{ to: ApplicationStatus; notes?: string | null }>,
  changedById: string,
  extra?: Prisma.CertificationApplicationUpdateInput,
) {
  return prisma.$transaction(async (tx) => {
    let current = await tx.certificationApplication.findFirst({
      where: { id, deletedAt: null },
    });
    if (!current) throw new AppError('Pengajuan tidak ditemukan', 404);

    for (const step of steps) {
      assertTransition(current!.status, step.to);
      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          fromStatus: current!.status,
          toStatus: step.to,
          changedById,
          notes: step.notes ?? null,
        },
      });
      current = await tx.certificationApplication.update({
        where: { id },
        data: {
          status: step.to,
          ...extra,
        },
      });
      extra = undefined;
    }

    return tx.certificationApplication.findFirst({
      where: { id },
      include: detailInclude,
    });
  });
}

export const certificationApplicationsService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    producerId?: string;
    commodityId?: string;
  }, user: AccessUser) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = String(query.search ?? '').trim();

    const accessWhere = applicationAccessWhere(user);
    const requestedProducerId = isProducerUser(user)
      ? requireProducerId(user)
      : query.producerId;
    const where: Prisma.CertificationApplicationWhereInput = {
      deletedAt: null,
      ...accessWhere,
      ...(requestedProducerId ? { producerId: requestedProducerId } : {}),
      ...(query.commodityId ? { commodityId: query.commodityId } : {}),
      ...(query.status
        ? { status: query.status as ApplicationStatus }
        : {}),
      ...(search
        ? {
            OR: [
              { applicationNumber: { contains: search } },
              { producer: { businessName: { contains: search } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.certificationApplication.count({ where }),
      prisma.certificationApplication.findMany({
        where,
        include: listInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((i) => serializeApp(i)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string, user: AccessUser) {
    const item = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null, ...applicationAccessWhere(user) },
      include: detailInclude,
    });
    if (!item) throw new AppError('Pengajuan tidak ditemukan', 404);
    return serializeDetail(item);
  },

  async create(
    input: CertificationApplicationCreateInput,
    user: AccessUser,
  ) {
    const producerId = isProducerUser(user)
      ? requireProducerId(user)
      : input.producerId;
    if (isProducerUser(user) && input.producerId !== producerId) {
      throw new AppError('Penangkar hanya dapat membuat pengajuan sendiri', 403);
    }
    await validateApplicationRelations({ ...input, producerId });

    const applicationNumber = await nextApplicationNumber();

    const item = await prisma.$transaction(async (tx) => {
      const app = await tx.certificationApplication.create({
        data: {
          applicationNumber,
          producerId,
          batchId: input.batchId ?? null,
          commodityId: input.commodityId,
          varietyId: input.varietyId ?? null,
          nurseryId: input.nurseryId ?? null,
          seedlingCount: BigInt(Math.round(input.seedlingCount)),
          readyAt: input.readyAt ? new Date(input.readyAt) : null,
          inspectionType: input.inspectionType ?? null,
          status: ApplicationStatus.DRAFT,
          notes: input.notes ?? null,
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: app.id,
          fromStatus: null,
          toStatus: ApplicationStatus.DRAFT,
          changedById: user.id,
          notes: 'Pengajuan dibuat',
        },
      });

      return tx.certificationApplication.findFirst({
        where: { id: app.id },
        include: detailInclude,
      });
    });

    if (!item) throw new AppError('Gagal membuat pengajuan', 500);
    return serializeDetail(item);
  },

  async update(id: string, input: CertificationApplicationUpdateInput, user: AccessUser) {
    const existing = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null, ...applicationAccessWhere(user) },
    });
    if (!existing) throw new AppError('Pengajuan tidak ditemukan', 404);

    if (
      existing.status !== ApplicationStatus.DRAFT &&
      existing.status !== ApplicationStatus.ADMIN_REVISION_REQUIRED
    ) {
      throw new AppError(
        'Pengajuan hanya dapat diubah pada status Draft atau Perbaikan',
        400,
      );
    }

    if (isProducerUser(user) && input.producerId && input.producerId !== existing.producerId) {
      throw new AppError('Penangkar tidak dapat mengubah pemilik pengajuan', 403);
    }

    const relationInput = {
      producerId: isProducerUser(user)
        ? requireProducerId(user)
        : (input.producerId ?? existing.producerId),
      batchId: input.batchId === undefined ? existing.batchId : input.batchId,
      commodityId: input.commodityId ?? existing.commodityId,
      varietyId: input.varietyId === undefined ? existing.varietyId : input.varietyId,
      nurseryId: input.nurseryId === undefined ? existing.nurseryId : input.nurseryId,
      seedlingCount: input.seedlingCount ?? Number(existing.seedlingCount),
    };
    await validateApplicationRelations(relationInput);

    const item = await prisma.certificationApplication.update({
      where: { id },
      data: {
        ...(input.producerId !== undefined
          ? { producerId: input.producerId }
          : {}),
        ...(input.batchId !== undefined ? { batchId: input.batchId } : {}),
        ...(input.commodityId !== undefined
          ? { commodityId: input.commodityId }
          : {}),
        ...(input.varietyId !== undefined ? { varietyId: input.varietyId } : {}),
        ...(input.nurseryId !== undefined ? { nurseryId: input.nurseryId } : {}),
        ...(input.seedlingCount !== undefined
          ? { seedlingCount: BigInt(Math.round(input.seedlingCount)) }
          : {}),
        ...(input.readyAt !== undefined
          ? { readyAt: input.readyAt ? new Date(input.readyAt) : null }
          : {}),
        ...(input.inspectionType !== undefined
          ? { inspectionType: input.inspectionType }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: detailInclude,
    });
    return serializeDetail(item);
  },

  async submit(id: string, user: AccessUser, notes?: string | null) {
    const existing = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null, ...applicationAccessWhere(user) },
      include: {
        documents: { where: { deletedAt: null, fileId: { not: null } } },
      },
    });
    if (!existing) throw new AppError('Pengajuan tidak ditemukan', 404);

    if (
      existing.status !== ApplicationStatus.DRAFT &&
      existing.status !== ApplicationStatus.ADMIN_REVISION_REQUIRED
    ) {
      throw new AppError(
        'Hanya pengajuan Draft atau Perbaikan yang dapat diajukan',
        400,
      );
    }

    const titles = new Set(existing.documents.map((document) => document.title));
    const missing = REQUIRED_APPLICATION_DOCUMENTS.filter((title) => !titles.has(title));
    if (missing.length > 0) {
      throw new AppError(
        `Dokumen pengajuan belum lengkap: ${missing.join(', ')}`,
        400,
      );
    }

    const item = await applyTransitions(
      id,
      [
        {
          to: ApplicationStatus.SUBMITTED,
          notes: notes ?? 'Pengajuan diajukan',
        },
        {
          to: ApplicationStatus.ADMIN_REVIEW,
          notes: 'Masuk antrean verifikasi admin',
        },
      ],
      user.id,
      { submittedAt: new Date() },
    );

    if (!item) throw new AppError('Pengajuan tidak ditemukan', 404);
    return serializeDetail(item);
  },

  async uploadDocument(
    id: string,
    title: string,
    file: Express.Multer.File,
    user: AccessUser,
  ) {
    if (!REQUIRED_APPLICATION_DOCUMENTS.includes(title as (typeof REQUIRED_APPLICATION_DOCUMENTS)[number])) {
      throw new AppError('Jenis dokumen pengajuan tidak valid', 400);
    }
    const application = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null, ...applicationAccessWhere(user) },
    });
    if (!application) throw new AppError('Pengajuan tidak ditemukan', 404);
    if (
      application.status !== ApplicationStatus.DRAFT &&
      application.status !== ApplicationStatus.ADMIN_REVISION_REQUIRED
    ) {
      throw new AppError('Dokumen hanya dapat diubah pada status Draft atau Perbaikan', 400);
    }

    const stored = await saveMulterFile(file, {
      relativeDir: path.join(
        'applications',
        String(new Date().getFullYear()),
        application.applicationNumber.replace(/[^\w.-]+/g, '_'),
      ),
      uploadedById: user.id,
    });
    const kindByTitle: Record<string, DocumentKind> = {
      'Surat izin usaha produksi benih dan/atau perizinan perusahaan berbasis risiko': DocumentKind.SIUP,
      'Sertifikat standar': DocumentKind.SERTIFIKAT,
      'Sertifikat mutu benih': DocumentKind.SERTIFIKAT,
      'Dokumen status kepemilikan kebun perbenihan': DocumentKind.SURAT_TANAH,
    };

    await prisma.$transaction(async (tx) => {
      await tx.applicationDocument.updateMany({
        where: { applicationId: id, title, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      await tx.applicationDocument.create({
        data: {
          applicationId: id,
          title,
          kind: kindByTitle[title] ?? DocumentKind.LAINNYA,
          fileId: stored.id,
        },
      });
    });

    return this.getById(id, user);
  },

  async removeDocument(id: string, documentId: string, user: AccessUser) {
    const application = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null, ...applicationAccessWhere(user) },
    });
    if (!application) throw new AppError('Pengajuan tidak ditemukan', 404);
    if (
      application.status !== ApplicationStatus.DRAFT &&
      application.status !== ApplicationStatus.ADMIN_REVISION_REQUIRED
    ) {
      throw new AppError('Dokumen hanya dapat diubah pada status Draft atau Perbaikan', 400);
    }
    const document = await prisma.applicationDocument.findFirst({
      where: { id: documentId, applicationId: id, deletedAt: null },
    });
    if (!document) throw new AppError('Dokumen tidak ditemukan', 404);
    await prisma.applicationDocument.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });
    return this.getById(id, user);
  },

  async createLhpAndInvoice(
    id: string,
    input: InvoiceCreateInput,
    file: Express.Multer.File,
    user: AccessUser,
  ) {
    const application = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null },
      include: { inspectionReport: true, invoice: true },
    });
    if (!application) throw new AppError('Pengajuan tidak ditemukan', 404);
    if (application.status !== ApplicationStatus.INSPECTION_PASSED) {
      throw new AppError('LHP dan invoice hanya dapat dibuat setelah pemeriksaan lulus', 400);
    }
    if (application.inspectionReport || application.invoice) {
      throw new AppError('LHP atau invoice sudah tersedia', 400);
    }
    const duplicateNumber = await prisma.$transaction([
      prisma.inspectionReport.findUnique({ where: { reportNumber: input.reportNumber }, select: { id: true } }),
      prisma.applicationInvoice.findUnique({ where: { invoiceNumber: input.invoiceNumber }, select: { id: true } }),
    ]);
    if (duplicateNumber[0]) throw new AppError('Nomor LHP sudah digunakan', 409);
    if (duplicateNumber[1]) throw new AppError('Nomor invoice sudah digunakan', 409);
    const dueDate = new Date(input.dueDate);
    if (Number.isNaN(dueDate.getTime())) throw new AppError('Batas pembayaran tidak valid', 400);

    const stored = await saveMulterFile(file, {
      relativeDir: path.join('lhp', String(new Date().getFullYear()), application.applicationNumber),
      uploadedById: user.id,
    });

    await prisma.$transaction(async (tx) => {
      await tx.inspectionReport.create({
        data: {
          applicationId: id,
          reportNumber: input.reportNumber,
          fileId: stored.id,
          notes: input.notes ?? null,
          createdById: user.id,
        },
      });
      await tx.applicationInvoice.create({
        data: {
          applicationId: id,
          invoiceNumber: input.invoiceNumber,
          amount: input.amount,
          dueDate,
          paymentInstructions: input.paymentInstructions ?? null,
          issuedById: user.id,
          status: InvoiceStatus.ISSUED,
        },
      });
      await tx.applicationStatusHistory.createMany({
        data: [
          {
            applicationId: id,
            fromStatus: ApplicationStatus.INSPECTION_PASSED,
            toStatus: ApplicationStatus.WAITING_LHP_INVOICE,
            changedById: user.id,
            notes: 'LHP hasil pemeriksaan diterbitkan',
          },
          {
            applicationId: id,
            fromStatus: ApplicationStatus.WAITING_LHP_INVOICE,
            toStatus: ApplicationStatus.WAITING_PAYMENT,
            changedById: user.id,
            notes: `Invoice ${input.invoiceNumber} diterbitkan`,
          },
        ],
      });
      await tx.certificationApplication.update({
        where: { id },
        data: { status: ApplicationStatus.WAITING_PAYMENT },
      });
      const recipients = await tx.user.findMany({
        where: { producerId: application.producerId, deletedAt: null, isActive: true },
        select: { id: true },
      });
      if (recipients.length) {
        await tx.notification.createMany({
          data: recipients.map((recipient) => ({
            userId: recipient.id,
            type: 'INVOICE_ISSUED',
            title: 'LHP dan invoice tersedia',
            body: `Invoice ${input.invoiceNumber} menunggu pembayaran.`,
            link: `/pengajuan/${id}`,
          })),
        });
      }
    });
    return this.getById(id, user);
  },

  async uploadPaymentProof(
    id: string,
    notes: string | null | undefined,
    file: Express.Multer.File,
    user: AccessUser,
  ) {
    const application = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null, ...applicationAccessWhere(user) },
      include: { invoice: true },
    });
    if (!application?.invoice) throw new AppError('Invoice tidak ditemukan', 404);
    if (
      application.status !== ApplicationStatus.WAITING_PAYMENT &&
      application.status !== ApplicationStatus.PAYMENT_REJECTED
    ) {
      throw new AppError('Bukti pembayaran tidak dapat diunggah pada status ini', 400);
    }
    const stored = await saveMulterFile(file, {
      relativeDir: path.join('payments', String(new Date().getFullYear()), application.applicationNumber),
      uploadedById: user.id,
    });
    await prisma.$transaction(async (tx) => {
      await tx.paymentProof.create({
        data: {
          invoiceId: application.invoice!.id,
          fileId: stored.id,
          submittedById: user.id,
          notes: notes ?? null,
          status: PaymentProofStatus.SUBMITTED,
        },
      });
      await tx.applicationInvoice.update({
        where: { id: application.invoice!.id },
        data: { status: InvoiceStatus.PAYMENT_SUBMITTED },
      });
      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          fromStatus: application.status,
          toStatus: ApplicationStatus.PAYMENT_VERIFICATION,
          changedById: user.id,
          notes: 'Bukti pembayaran diunggah',
        },
      });
      await tx.certificationApplication.update({
        where: { id },
        data: { status: ApplicationStatus.PAYMENT_VERIFICATION },
      });
      const admins = await tx.user.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          userRoles: { some: { role: { slug: { in: ['SUPER_ADMIN', 'ADMIN'] } } } },
        },
        select: { id: true },
      });
      if (admins.length) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: 'PAYMENT_SUBMITTED',
            title: 'Bukti pembayaran baru',
            body: `${application.applicationNumber} menunggu verifikasi pembayaran.`,
            link: `/pengajuan/${id}`,
          })),
        });
      }
    });
    return this.getById(id, user);
  },

  async verifyPayment(
    id: string,
    decision: 'ACCEPTED' | 'REJECTED',
    notes: string | null | undefined,
    user: AccessUser,
  ) {
    const application = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null, status: ApplicationStatus.PAYMENT_VERIFICATION },
      include: {
        invoice: {
          include: {
            paymentProofs: {
              where: { deletedAt: null, status: PaymentProofStatus.SUBMITTED },
              orderBy: { submittedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    const proof = application?.invoice?.paymentProofs[0];
    if (!application?.invoice || !proof) throw new AppError('Bukti pembayaran tidak ditemukan', 404);
    if (decision === 'REJECTED' && !notes?.trim()) {
      throw new AppError('Alasan penolakan pembayaran wajib diisi', 400);
    }
    const accepted = decision === 'ACCEPTED';
    const nextStatus = accepted
      ? ApplicationStatus.PAYMENT_VERIFIED
      : ApplicationStatus.PAYMENT_REJECTED;
    await prisma.$transaction(async (tx) => {
      await tx.paymentProof.update({
        where: { id: proof.id },
        data: {
          status: accepted ? PaymentProofStatus.ACCEPTED : PaymentProofStatus.REJECTED,
          verifiedById: user.id,
          verifiedAt: new Date(),
          verificationNotes: notes ?? null,
        },
      });
      await tx.applicationInvoice.update({
        where: { id: application.invoice!.id },
        data: {
          status: accepted ? InvoiceStatus.PAID : InvoiceStatus.PAYMENT_REJECTED,
          paidAt: accepted ? new Date() : null,
        },
      });
      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          fromStatus: ApplicationStatus.PAYMENT_VERIFICATION,
          toStatus: nextStatus,
          changedById: user.id,
          notes: accepted ? 'Pembayaran diverifikasi lunas' : notes!.trim(),
        },
      });
      await tx.certificationApplication.update({ where: { id }, data: { status: nextStatus } });
      const recipients = await tx.user.findMany({
        where: { producerId: application.producerId, deletedAt: null, isActive: true },
        select: { id: true },
      });
      if (recipients.length) {
        await tx.notification.createMany({
          data: recipients.map((recipient) => ({
            userId: recipient.id,
            type: accepted ? 'PAYMENT_ACCEPTED' : 'PAYMENT_REJECTED',
            title: accepted ? 'Pembayaran telah lunas' : 'Pembayaran ditolak',
            body: accepted ? 'Sertifikat dapat diproses oleh admin.' : notes!.trim(),
            link: `/pengajuan/${id}`,
          })),
        });
      }
    });
    return this.getById(id, user);
  },

  async verify(id: string, changedById: string, notes?: string | null) {
    const existing = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null },
      include: {
        documents: { where: { deletedAt: null, fileId: { not: null } } },
      },
    });
    if (!existing) throw new AppError('Pengajuan tidak ditemukan', 404);

    const steps: Array<{ to: ApplicationStatus; notes?: string | null }> = [];

    if (existing.status === ApplicationStatus.SUBMITTED) {
      steps.push({
        to: ApplicationStatus.ADMIN_REVIEW,
        notes: 'Masuk verifikasi admin',
      });
    } else if (existing.status !== ApplicationStatus.ADMIN_REVIEW) {
      throw new AppError(
        'Verifikasi hanya dapat dilakukan dari status Diajukan atau Verifikasi',
        400,
      );
    }

    const titles = new Set(existing.documents.map((document) => document.title));
    const missing = REQUIRED_APPLICATION_DOCUMENTS.filter((title) => !titles.has(title));
    if (missing.length > 0) {
      throw new AppError(`Dokumen belum lengkap: ${missing.join(', ')}`, 400);
    }

    steps.push({
      to: ApplicationStatus.DOCUMENT_COMPLETE,
      notes: notes ?? 'Dokumen dinyatakan lengkap',
    });
    steps.push({
      to: ApplicationStatus.WAITING_ASSIGNMENT,
      notes: 'Siap dijadwalkan pemeriksaan',
    });

    const item = await applyTransitions(id, steps, changedById);
    if (!item) throw new AppError('Pengajuan tidak ditemukan', 404);
    return serializeDetail(item);
  },

  async requestRevision(
    id: string,
    changedById: string,
    notes?: string | null,
  ) {
    if (!notes?.trim()) {
      throw new AppError('Catatan perbaikan wajib diisi', 400);
    }
    const existing = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Pengajuan tidak ditemukan', 404);

    if (existing.status !== ApplicationStatus.ADMIN_REVIEW) {
      throw new AppError(
        'Permintaan perbaikan hanya dari status Verifikasi',
        400,
      );
    }

    const item = await applyTransitions(
      id,
      [
        {
          to: ApplicationStatus.ADMIN_REVISION_REQUIRED,
          notes: notes ?? 'Diperlukan perbaikan dokumen',
        },
      ],
      changedById,
    );
    if (!item) throw new AppError('Pengajuan tidak ditemukan', 404);
    return serializeDetail(item);
  },

  async assignInspector(
    id: string,
    input: AssignInspectorInput,
    changedById: string,
  ) {
    const existing = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Pengajuan tidak ditemukan', 404);

    if (existing.status !== ApplicationStatus.WAITING_ASSIGNMENT) {
      throw new AppError(
        'Penugasan PBT hanya dari status Siap Dijadwalkan',
        400,
      );
    }

    const inspector = await prisma.user.findFirst({
      where: {
        id: input.inspectorId,
        deletedAt: null,
        isActive: true,
        userRoles: { some: { role: { slug: 'PBT' } } },
      },
    });
    if (!inspector) throw new AppError('PBT tidak ditemukan', 404);

    const assignmentNumber = await nextAssignmentNumber();

    const item = await prisma.$transaction(async (tx) => {
      assertTransition(
        existing.status,
        ApplicationStatus.INSPECTION_SCHEDULED,
      );

      await tx.fieldAssignment.create({
        data: {
          assignmentNumber,
          applicationId: id,
          inspectorId: input.inspectorId,
          createdById: changedById,
          scheduledDate: new Date(input.scheduledDate),
          scheduledTime: input.scheduledTime ?? null,
          instructions: input.instructions ?? null,
          locationNotes: input.locationNotes ?? null,
          status: 'SCHEDULED',
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          fromStatus: existing.status,
          toStatus: ApplicationStatus.INSPECTION_SCHEDULED,
          changedById,
          notes: `Ditugaskan ke ${inspector.name}`,
        },
      });

      await tx.certificationApplication.update({
        where: { id },
        data: { status: ApplicationStatus.INSPECTION_SCHEDULED },
      });

      return tx.certificationApplication.findFirst({
        where: { id },
        include: detailInclude,
      });
    });

    if (!item) throw new AppError('Pengajuan tidak ditemukan', 404);
    return serializeApp(item);
  },

  async changeStatus(
    id: string,
    input: ApplicationStatusChangeInput,
    changedById: string,
  ) {
    const existing = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Pengajuan tidak ditemukan', 404);

    const toStatus = input.toStatus as ApplicationStatus;
    if (!Object.values(AppStatusShared).includes(input.toStatus)) {
      throw new AppError('Status tujuan tidak valid', 400);
    }

    const managedWorkflowStatuses: ApplicationStatus[] = [
      ApplicationStatus.WAITING_LHP_INVOICE,
      ApplicationStatus.WAITING_PAYMENT,
      ApplicationStatus.PAYMENT_VERIFICATION,
      ApplicationStatus.PAYMENT_REJECTED,
      ApplicationStatus.PAYMENT_VERIFIED,
      ApplicationStatus.CERTIFICATE_ISSUED_MANUALLY,
    ];
    if (managedWorkflowStatuses.includes(toStatus)) {
      throw new AppError('Status ini hanya dapat diubah melalui proses LHP, pembayaran, atau penerbitan sertifikat', 400);
    }

    const item = await applyTransitions(
      id,
      [{ to: toStatus, notes: input.notes }],
      changedById,
    );
    if (!item) throw new AppError('Pengajuan tidak ditemukan', 404);
    return serializeApp(item);
  },
};
