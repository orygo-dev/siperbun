import type {
  FieldInspectionCreateInput,
  FieldInspectionUpdateInput,
  FinalizeInspectionInput,
  InspectionFindingCreateInput,
  InspectionResultsUpsertInput,
  ValidateInspectionInput,
} from '@siperbun/shared';
import {
  ApplicationStatus as PrismaAppStatus,
  AssignmentStatus as PrismaAssignStatus,
  Prisma,
  Severity,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { type AccessUser, isInspectorUser, isProducerUser, requireProducerId } from '../../utils/access-scope';
import {
  saveMulterFile,
  serializeStoredFile,
} from '../../utils/storage';
import {
  serializeInspection,
  toBigIntOrNull,
} from '../field-assignments/field-assignments.service';

const detailInclude = {
  assignment: {
    include: {
      application: {
        select: {
          id: true,
          applicationNumber: true,
          status: true,
          seedlingCount: true,
          producer: {
            select: {
              id: true,
              businessName: true,
              registrationNumber: true,
            },
          },
          commodity: { select: { id: true, name: true, code: true } },
          variety: { select: { id: true, name: true, code: true } },
          nursery: { select: { id: true, name: true } },
        },
      },
      inspector: { select: { id: true, name: true, email: true } },
    },
  },
  inspector: { select: { id: true, name: true, email: true } },
  photos: {
    where: { deletedAt: null },
    include: { file: true },
    orderBy: { createdAt: 'desc' as const },
  },
  findings: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' as const },
    include: {
      correctiveActions: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' as const },
      },
    },
  },
  results: {
    include: {
      checklist: {
        select: {
          id: true,
          code: true,
          label: true,
          sortOrder: true,
          description: true,
        },
      },
    },
    orderBy: { checklist: { sortOrder: 'asc' as const } },
  },
} as const;

function serializePhoto(photo: {
  id: string;
  caption: string | null;
  takenAt: Date | null;
  latitude: { toString(): string } | null;
  longitude: { toString(): string } | null;
  createdAt: Date;
  file: {
    id: string;
    originalName: string;
    storageName: string;
    mimeType: string;
    size: bigint;
    sha256: string;
    path: string;
    uploadedById: string | null;
    createdAt: Date;
  } | null;
}) {
  return {
    id: photo.id,
    caption: photo.caption,
    takenAt: photo.takenAt,
    latitude: photo.latitude != null ? Number(photo.latitude) : null,
    longitude: photo.longitude != null ? Number(photo.longitude) : null,
    createdAt: photo.createdAt,
    file: photo.file ? serializeStoredFile(photo.file) : null,
  };
}

function serializeDetail(item: Record<string, unknown>) {
  const base = serializeInspection(item) as Record<string, unknown> & {
    photos?: Array<Parameters<typeof serializePhoto>[0]>;
    assignment?: {
      application?: { seedlingCount?: bigint | number; [k: string]: unknown };
      [k: string]: unknown;
    };
  };
  return {
    ...base,
    photos: (base.photos ?? []).map(serializePhoto),
    assignment: base.assignment
      ? {
          ...base.assignment,
          application: base.assignment.application
            ? {
                ...base.assignment.application,
                seedlingCount:
                  base.assignment.application.seedlingCount != null
                    ? Number(base.assignment.application.seedlingCount)
                    : 0,
              }
            : base.assignment.application,
        }
      : base.assignment,
  };
}

async function assertEditable(id: string, user: AccessUser) {
  const item = await prisma.fieldInspection.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(isInspectorUser(user) ? { inspectorId: user.id } : {}),
    },
  });
  if (!item) throw new AppError('Pemeriksaan tidak ditemukan', 404);
  if (item.isFinalized) {
    throw new AppError(
      'Pemeriksaan sudah difinalisasi dan tidak dapat diubah',
      400,
    );
  }
  return item;
}

export const fieldInspectionsService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    inspectorId?: string;
    isFinalized?: string;
  }, user: AccessUser) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.FieldInspectionWhereInput = {
      deletedAt: null,
      ...(isProducerUser(user)
        ? { assignment: { application: { producerId: requireProducerId(user) } } }
        : isInspectorUser(user)
          ? { inspectorId: user.id }
          : query.inspectorId
            ? { inspectorId: query.inspectorId }
            : {}),
      ...(query.isFinalized === 'true'
        ? { isFinalized: true }
        : query.isFinalized === 'false'
          ? { isFinalized: false }
          : {}),
      ...(search
        ? {
            OR: [
              {
                assignment: {
                  assignmentNumber: { contains: search },
                },
              },
              {
                assignment: {
                  application: {
                    applicationNumber: { contains: search },
                  },
                },
              },
              {
                assignment: {
                  application: {
                    producer: { businessName: { contains: search } },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.fieldInspection.count({ where }),
      prisma.fieldInspection.findMany({
        where,
        include: {
          assignment: {
            include: {
              application: {
                select: {
                  id: true,
                  applicationNumber: true,
                  status: true,
                  seedlingCount: true,
                  producer: {
                    select: {
                      id: true,
                      businessName: true,
                      registrationNumber: true,
                    },
                  },
                  commodity: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
          inspector: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((i) => serializeDetail(i as unknown as Record<string, unknown>)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string, user?: AccessUser) {
    const item = await prisma.fieldInspection.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(user && isProducerUser(user)
          ? { assignment: { application: { producerId: requireProducerId(user) } } }
          : user && isInspectorUser(user)
            ? { inspectorId: user.id }
            : {}),
      },
      include: detailInclude,
    });
    if (!item) throw new AppError('Pemeriksaan tidak ditemukan', 404);
    return serializeDetail(item as unknown as Record<string, unknown>);
  },

  async create(
    input: FieldInspectionCreateInput,
    user: { id: string; roles: string[]; permissions: string[] },
  ) {
    const assignment = await prisma.fieldAssignment.findFirst({
      where: { id: input.assignmentId, deletedAt: null },
      include: { inspection: true, application: true },
    });
    if (!assignment) throw new AppError('Penugasan tidak ditemukan', 404);

    const isAdmin = user.roles.includes('SUPER_ADMIN');
    if (!isAdmin && assignment.inspectorId !== user.id) {
      throw new AppError(
        'Hanya PBT tertugaskan yang dapat membuat pemeriksaan',
        403,
      );
    }

    if (assignment.inspection) {
      return this.getById(assignment.inspection.id);
    }

    const created = await prisma.$transaction(async (tx) => {
      const inspection = await tx.fieldInspection.create({
        data: {
          assignmentId: assignment.id,
          inspectorId: assignment.inspectorId,
          startedAt: new Date(),
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          gpsAccuracy: input.gpsAccuracy ?? null,
          populationCount: toBigIntOrNull(input.populationCount ?? null),
          sampleCount: toBigIntOrNull(input.sampleCount ?? null),
          passedCount: toBigIntOrNull(input.passedCount ?? null),
          failedCount: toBigIntOrNull(input.failedCount ?? null),
          rejectedCount: toBigIntOrNull(input.rejectedCount ?? null),
        },
      });

      await tx.fieldAssignment.update({
        where: { id: assignment.id },
        data: { status: PrismaAssignStatus.INSPECTING },
      });

      const app = assignment.application;
      if (
        app &&
        (app.status === PrismaAppStatus.INSPECTION_SCHEDULED ||
          app.status === PrismaAppStatus.FIELD_REVISION_REQUIRED)
      ) {
        await tx.applicationStatusHistory.create({
          data: {
            applicationId: app.id,
            fromStatus: app.status,
            toStatus: PrismaAppStatus.INSPECTION_IN_PROGRESS,
            changedById: user.id,
            notes: 'Pemeriksaan lapangan dimulai',
          },
        });
        await tx.certificationApplication.update({
          where: { id: app.id },
          data: { status: PrismaAppStatus.INSPECTION_IN_PROGRESS },
        });
      }

      return inspection;
    });

    return this.getById(created.id);
  },

  async update(id: string, input: FieldInspectionUpdateInput, user: AccessUser) {
    await assertEditable(id, user);

    if (input.results?.length) {
      await this.upsertResults(id, { results: input.results }, user);
    }

    const item = await prisma.fieldInspection.update({
      where: { id },
      data: {
        ...(input.startedAt !== undefined
          ? {
              startedAt: input.startedAt ? new Date(input.startedAt) : null,
            }
          : {}),
        ...(input.finishedAt !== undefined
          ? {
              finishedAt: input.finishedAt ? new Date(input.finishedAt) : null,
            }
          : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.gpsAccuracy !== undefined
          ? { gpsAccuracy: input.gpsAccuracy }
          : {}),
        ...(input.populationCount !== undefined
          ? { populationCount: toBigIntOrNull(input.populationCount) }
          : {}),
        ...(input.sampleCount !== undefined
          ? { sampleCount: toBigIntOrNull(input.sampleCount) }
          : {}),
        ...(input.passedCount !== undefined
          ? { passedCount: toBigIntOrNull(input.passedCount) }
          : {}),
        ...(input.failedCount !== undefined
          ? { failedCount: toBigIntOrNull(input.failedCount) }
          : {}),
        ...(input.rejectedCount !== undefined
          ? { rejectedCount: toBigIntOrNull(input.rejectedCount) }
          : {}),
        ...(input.conclusion !== undefined
          ? { conclusion: input.conclusion }
          : {}),
        ...(input.recommendation !== undefined
          ? { recommendation: input.recommendation }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: detailInclude,
    });

    return serializeDetail(item as unknown as Record<string, unknown>);
  },

  async upsertResults(id: string, input: InspectionResultsUpsertInput, user: AccessUser) {
    await assertEditable(id, user);

    await prisma.$transaction(
      input.results.map((r) =>
        prisma.inspectionResult.upsert({
          where: {
            inspectionId_checklistId: {
              inspectionId: id,
              checklistId: r.checklistId,
            },
          },
          create: {
            inspectionId: id,
            checklistId: r.checklistId,
            value: r.value ?? null,
            isPassed: r.isPassed ?? null,
            notes: r.notes ?? null,
          },
          update: {
            value: r.value ?? null,
            isPassed: r.isPassed ?? null,
            notes: r.notes ?? null,
          },
        }),
      ),
    );

    return this.getById(id);
  },

  async addPhoto(
    id: string,
    file: Express.Multer.File,
    opts: { caption?: string | null; uploadedById: string },
    user: AccessUser,
  ) {
    await assertEditable(id, user);

    const stored = await saveMulterFile(file, {
      inspectionId: id,
      uploadedById: opts.uploadedById,
    });

    const photo = await prisma.inspectionPhoto.create({
      data: {
        inspectionId: id,
        fileId: stored.id,
        caption: opts.caption ?? null,
        takenAt: new Date(),
      },
      include: { file: true },
    });

    return serializePhoto(photo);
  },

  async addFinding(
    id: string,
    input: InspectionFindingCreateInput,
    user: AccessUser,
  ) {
    const inspection = await assertEditable(id, user);
    const assignment = await prisma.fieldAssignment.findFirst({
      where: { id: inspection.assignmentId },
    });

    const finding = await prisma.inspectionFinding.create({
      data: {
        inspectionId: id,
        applicationId:
          input.applicationId ?? assignment?.applicationId ?? null,
        findingType: input.findingType,
        description: input.description,
        severity: (input.severity ?? 'MEDIUM') as Severity,
        recommendation: input.recommendation ?? null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      },
    });

    return finding;
  },

  async finalize(
    id: string,
    input: FinalizeInspectionInput,
    user: AccessUser,
  ) {
    const inspection = await assertEditable(id, user);
    const assignment = await prisma.fieldAssignment.findFirst({
      where: { id: inspection.assignmentId },
      include: { application: true },
    });
    if (!assignment) throw new AppError('Penugasan tidak ditemukan', 404);

    let toStatus: PrismaAppStatus;
    let notes: string;
    if (input.result === 'PASS') {
      toStatus = PrismaAppStatus.WAITING_RESULT_VALIDATION;
      notes = 'Hasil pemeriksaan: Lulus sementara — menunggu validasi';
    } else if (input.result === 'FAIL') {
      toStatus = PrismaAppStatus.WAITING_RESULT_VALIDATION;
      notes = 'Hasil pemeriksaan: Tidak lulus — menunggu validasi';
    } else {
      toStatus = PrismaAppStatus.FIELD_REVISION_REQUIRED;
      notes = 'Hasil pemeriksaan: Perlu perbaikan lapangan';
    }

    await prisma.$transaction(async (tx) => {
      await tx.fieldInspection.update({
        where: { id },
        data: {
          isFinalized: true,
          finalizedAt: new Date(),
          finishedAt: new Date(),
          conclusion:
            input.conclusion ??
            inspection.conclusion ??
            (input.result === 'PASS'
              ? 'PASS'
              : input.result === 'FAIL'
                ? 'FAIL'
                : 'REVISION'),
          notes: input.notes ?? inspection.notes,
        },
      });

      await tx.fieldAssignment.update({
        where: { id: assignment.id },
        data: {
          status: PrismaAssignStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      const app = assignment.application;
      if (app && app.status === PrismaAppStatus.INSPECTION_IN_PROGRESS) {
        await tx.applicationStatusHistory.create({
          data: {
            applicationId: app.id,
            fromStatus: app.status,
            toStatus,
            changedById: user.id,
            notes,
          },
        });
        await tx.certificationApplication.update({
          where: { id: app.id },
          data: { status: toStatus },
        });
      } else if (
        app &&
        input.result === 'REVISION' &&
        app.status !== PrismaAppStatus.FIELD_REVISION_REQUIRED
      ) {
        await tx.applicationStatusHistory.create({
          data: {
            applicationId: app.id,
            fromStatus: app.status,
            toStatus: PrismaAppStatus.FIELD_REVISION_REQUIRED,
            changedById: user.id,
            notes,
          },
        });
        await tx.certificationApplication.update({
          where: { id: app.id },
          data: { status: PrismaAppStatus.FIELD_REVISION_REQUIRED },
        });
      }
    });

    return this.getById(id);
  },

  async validate(
    id: string,
    input: ValidateInspectionInput,
    user: { id: string },
  ) {
    const inspection = await prisma.fieldInspection.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignment: { include: { application: true } },
      },
    });
    if (!inspection) throw new AppError('Pemeriksaan tidak ditemukan', 404);
    if (!inspection.isFinalized) {
      throw new AppError('Pemeriksaan belum difinalisasi', 400);
    }

    const app = inspection.assignment.application;
    if (!app) throw new AppError('Pengajuan tidak ditemukan', 404);
    if (app.status !== PrismaAppStatus.WAITING_RESULT_VALIDATION) {
      throw new AppError(
        'Validasi hanya untuk pengajuan berstatus Validasi Hasil',
        400,
      );
    }

    const toStatus =
      input.decision === 'PASS'
        ? PrismaAppStatus.INSPECTION_PASSED
        : PrismaAppStatus.INSPECTION_FAILED;

    await prisma.$transaction(async (tx) => {
      await tx.applicationStatusHistory.create({
        data: {
          applicationId: app.id,
          fromStatus: app.status,
          toStatus,
          changedById: user.id,
          notes:
            input.notes ??
            (input.decision === 'PASS'
              ? 'Hasil pemeriksaan divalidasi: Lulus'
              : 'Hasil pemeriksaan divalidasi: Tidak lulus'),
        },
      });
      await tx.certificationApplication.update({
        where: { id: app.id },
        data: { status: toStatus },
      });
    });

    return this.getById(id);
  },
};
