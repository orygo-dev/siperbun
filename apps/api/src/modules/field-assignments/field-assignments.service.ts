import {
  AssignmentStatus,
  PERMISSIONS,
  type FieldAssignmentUpdateInput,
} from '@siperbun/shared';
import {
  ApplicationStatus as PrismaAppStatus,
  AssignmentStatus as PrismaAssignStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';

function toBigIntOrNull(v: number | null | undefined) {
  if (v == null) return null;
  return BigInt(Math.round(v));
}

function serializeInspection<T extends Record<string, unknown>>(item: T) {
  const row = item as T & {
    populationCount?: bigint | number | null;
    sampleCount?: bigint | number | null;
    passedCount?: bigint | number | null;
    failedCount?: bigint | number | null;
    rejectedCount?: bigint | number | null;
    latitude?: { toString(): string } | null;
    longitude?: { toString(): string } | null;
    gpsAccuracy?: { toString(): string } | null;
  };
  return {
    ...row,
    populationCount:
      row.populationCount != null ? Number(row.populationCount) : null,
    sampleCount: row.sampleCount != null ? Number(row.sampleCount) : null,
    passedCount: row.passedCount != null ? Number(row.passedCount) : null,
    failedCount: row.failedCount != null ? Number(row.failedCount) : null,
    rejectedCount:
      row.rejectedCount != null ? Number(row.rejectedCount) : null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    gpsAccuracy: row.gpsAccuracy != null ? Number(row.gpsAccuracy) : null,
  };
}

function serializeAssignment<T extends Record<string, unknown>>(item: T) {
  const row = item as T & {
    application?: {
      seedlingCount?: bigint | number;
      [key: string]: unknown;
    } | null;
    inspection?: Record<string, unknown> | null;
  };
  return {
    ...row,
    application: row.application
      ? {
          ...row.application,
          seedlingCount:
            row.application.seedlingCount != null
              ? Number(row.application.seedlingCount)
              : 0,
        }
      : row.application,
    inspection: row.inspection
      ? serializeInspection(row.inspection)
      : row.inspection,
  };
}

const listInclude = {
  application: {
    select: {
      id: true,
      applicationNumber: true,
      status: true,
      seedlingCount: true,
      producer: {
        select: { id: true, businessName: true, registrationNumber: true },
      },
      commodity: { select: { id: true, name: true, code: true } },
      variety: { select: { id: true, name: true, code: true } },
      nursery: { select: { id: true, name: true } },
    },
  },
  inspector: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  inspection: {
    select: {
      id: true,
      isFinalized: true,
      startedAt: true,
      finishedAt: true,
      conclusion: true,
    },
  },
} as const;

const detailInclude = {
  ...listInclude,
  inspection: {
    include: {
      photos: {
        where: { deletedAt: null },
        include: { file: true },
        orderBy: { createdAt: 'desc' as const },
      },
      findings: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' as const },
      },
      results: {
        include: {
          checklist: {
            select: {
              id: true,
              code: true,
              label: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  },
} as const;

export function isPbtScoped(user: {
  roles: string[];
  permissions: string[];
}) {
  if (user.roles.includes('SUPER_ADMIN')) return false;
  const canAssign = user.permissions.includes(PERMISSIONS.APPLICATION_ASSIGN);
  const canExecute = user.permissions.includes(PERMISSIONS.INSPECTION_EXECUTE);
  return canExecute && !canAssign;
}

export const fieldAssignmentsService = {
  async list(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      inspectorId?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    user: { id: string; roles: string[]; permissions: string[] },
  ) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = String(query.search ?? '').trim();

    let inspectorId = query.inspectorId;
    if (isPbtScoped(user)) {
      inspectorId = user.id;
    }

    const where: Prisma.FieldAssignmentWhereInput = {
      deletedAt: null,
      ...(inspectorId ? { inspectorId } : {}),
      ...(query.status
        ? { status: query.status as PrismaAssignStatus }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            scheduledDate: {
              ...(query.dateFrom
                ? { gte: new Date(query.dateFrom) }
                : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { assignmentNumber: { contains: search } },
              {
                application: {
                  applicationNumber: { contains: search },
                },
              },
              {
                application: {
                  producer: { businessName: { contains: search } },
                },
              },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.fieldAssignment.count({ where }),
      prisma.fieldAssignment.findMany({
        where,
        include: listInclude,
        orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((a) => serializeAssignment(a)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const item = await prisma.fieldAssignment.findFirst({
      where: { id, deletedAt: null },
      include: detailInclude,
    });
    if (!item) throw new AppError('Penugasan tidak ditemukan', 404);
    return serializeAssignment(item);
  },

  async update(
    id: string,
    input: FieldAssignmentUpdateInput,
    user: { id: string; roles: string[]; permissions: string[] },
  ) {
    const existing = await prisma.fieldAssignment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Penugasan tidak ditemukan', 404);

    const canAssign =
      user.roles.includes('SUPER_ADMIN') ||
      user.permissions.includes(PERMISSIONS.APPLICATION_ASSIGN);
    const isInspector =
      existing.inspectorId === user.id &&
      user.permissions.includes(PERMISSIONS.INSPECTION_EXECUTE);

    if (!canAssign && !isInspector) {
      throw new AppError('Forbidden', 403);
    }

    if (!canAssign && isInspector) {
      const allowed = [
        AssignmentStatus.CONFIRMED,
        AssignmentStatus.EN_ROUTE,
      ] as string[];
      if (input.status && !allowed.includes(input.status)) {
        throw new AppError(
          'PBT hanya dapat mengonfirmasi atau set status dalam perjalanan',
          403,
        );
      }
    }

    const item = await prisma.fieldAssignment.update({
      where: { id },
      data: {
        ...(input.status !== undefined
          ? { status: input.status as PrismaAssignStatus }
          : {}),
        ...(input.scheduledDate !== undefined
          ? {
              scheduledDate: input.scheduledDate
                ? new Date(input.scheduledDate)
                : existing.scheduledDate,
            }
          : {}),
        ...(input.scheduledTime !== undefined
          ? { scheduledTime: input.scheduledTime }
          : {}),
        ...(input.instructions !== undefined
          ? { instructions: input.instructions }
          : {}),
        ...(input.locationNotes !== undefined
          ? { locationNotes: input.locationNotes }
          : {}),
      },
      include: detailInclude,
    });

    return serializeAssignment(item);
  },

  async confirm(
    id: string,
    user: { id: string; roles: string[]; permissions: string[] },
  ) {
    const existing = await prisma.fieldAssignment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Penugasan tidak ditemukan', 404);

    const isAdmin = user.roles.includes('SUPER_ADMIN');
    if (!isAdmin && existing.inspectorId !== user.id) {
      throw new AppError('Hanya PBT tertugaskan yang dapat mengonfirmasi', 403);
    }

    const item = await prisma.fieldAssignment.update({
      where: { id },
      data: { status: PrismaAssignStatus.CONFIRMED },
      include: detailInclude,
    });
    return serializeAssignment(item);
  },

  async startInspection(
    id: string,
    user: { id: string; roles: string[]; permissions: string[] },
    counts?: {
      latitude?: number | null;
      longitude?: number | null;
      gpsAccuracy?: number | null;
      populationCount?: number | null;
      sampleCount?: number | null;
      passedCount?: number | null;
      failedCount?: number | null;
      rejectedCount?: number | null;
    },
  ) {
    const existing = await prisma.fieldAssignment.findFirst({
      where: { id, deletedAt: null },
      include: {
        inspection: true,
        application: true,
      },
    });
    if (!existing) throw new AppError('Penugasan tidak ditemukan', 404);

    const isAdmin = user.roles.includes('SUPER_ADMIN');
    if (!isAdmin && existing.inspectorId !== user.id) {
      throw new AppError(
        'Hanya PBT tertugaskan yang dapat memulai pemeriksaan',
        403,
      );
    }

    if (existing.status === PrismaAssignStatus.CANCELLED) {
      throw new AppError('Penugasan sudah dibatalkan', 400);
    }

    if (existing.inspection) {
      return this.getById(id);
    }

    const item = await prisma.$transaction(async (tx) => {
      await tx.fieldInspection.create({
        data: {
          assignmentId: id,
          inspectorId: existing.inspectorId,
          startedAt: new Date(),
          latitude: counts?.latitude ?? null,
          longitude: counts?.longitude ?? null,
          gpsAccuracy: counts?.gpsAccuracy ?? null,
          populationCount: toBigIntOrNull(counts?.populationCount ?? null),
          sampleCount: toBigIntOrNull(counts?.sampleCount ?? null),
          passedCount: toBigIntOrNull(counts?.passedCount ?? null),
          failedCount: toBigIntOrNull(counts?.failedCount ?? null),
          rejectedCount: toBigIntOrNull(counts?.rejectedCount ?? null),
        },
      });

      await tx.fieldAssignment.update({
        where: { id },
        data: { status: PrismaAssignStatus.INSPECTING },
      });

      const app = existing.application;
      if (
        app &&
        app.status !== PrismaAppStatus.INSPECTION_IN_PROGRESS &&
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

      return tx.fieldAssignment.findFirst({
        where: { id },
        include: detailInclude,
      });
    });

    if (!item) throw new AppError('Penugasan tidak ditemukan', 404);
    return serializeAssignment(item);
  },
};

// re-export helpers for inspections module
export { serializeInspection, toBigIntOrNull };
