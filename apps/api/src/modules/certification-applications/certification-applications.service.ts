import {
  ApplicationStatus as AppStatusShared,
  type ApplicationStatusChangeInput,
  type AssignInspectorInput,
  type CertificationApplicationCreateInput,
  type CertificationApplicationUpdateInput,
} from '@siperbun/shared';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';

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
  INSPECTION_PASSED: ['CERTIFICATE_ISSUED_MANUALLY'],
  INSPECTION_FAILED: ['REJECTED', 'CANCELLED'],
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
    select: { id: true, businessName: true, registrationNumber: true },
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
};

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
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.CertificationApplicationWhereInput = {
      deletedAt: null,
      ...(query.producerId ? { producerId: query.producerId } : {}),
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

  async getById(id: string) {
    const item = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null },
      include: detailInclude,
    });
    if (!item) throw new AppError('Pengajuan tidak ditemukan', 404);
    return serializeApp(item);
  },

  async create(
    input: CertificationApplicationCreateInput,
    changedById: string,
  ) {
    const producer = await prisma.producer.findFirst({
      where: { id: input.producerId, deletedAt: null },
    });
    if (!producer) throw new AppError('Penangkar tidak ditemukan', 404);

    const commodity = await prisma.commodity.findFirst({
      where: { id: input.commodityId },
    });
    if (!commodity) throw new AppError('Komoditas tidak ditemukan', 404);

    const applicationNumber = await nextApplicationNumber();

    const item = await prisma.$transaction(async (tx) => {
      const app = await tx.certificationApplication.create({
        data: {
          applicationNumber,
          producerId: input.producerId,
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
          changedById,
          notes: 'Pengajuan dibuat',
        },
      });

      return tx.certificationApplication.findFirst({
        where: { id: app.id },
        include: detailInclude,
      });
    });

    if (!item) throw new AppError('Gagal membuat pengajuan', 500);
    return serializeApp(item);
  },

  async update(id: string, input: CertificationApplicationUpdateInput) {
    const existing = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null },
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

    if (input.producerId) {
      const producer = await prisma.producer.findFirst({
        where: { id: input.producerId, deletedAt: null },
      });
      if (!producer) throw new AppError('Penangkar tidak ditemukan', 404);
    }

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
    return serializeApp(item);
  },

  async submit(id: string, changedById: string, notes?: string | null) {
    const existing = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null },
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
      changedById,
      { submittedAt: new Date() },
    );

    if (!item) throw new AppError('Pengajuan tidak ditemukan', 404);
    return serializeApp(item);
  },

  async verify(id: string, changedById: string, notes?: string | null) {
    const existing = await prisma.certificationApplication.findFirst({
      where: { id, deletedAt: null },
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
    return serializeApp(item);
  },

  async requestRevision(
    id: string,
    changedById: string,
    notes?: string | null,
  ) {
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
    return serializeApp(item);
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
      where: { id: input.inspectorId, deletedAt: null, isActive: true },
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

    const item = await applyTransitions(
      id,
      [{ to: toStatus, notes: input.notes }],
      changedById,
    );
    if (!item) throw new AppError('Pengajuan tidak ditemukan', 404);
    return serializeApp(item);
  },
};
