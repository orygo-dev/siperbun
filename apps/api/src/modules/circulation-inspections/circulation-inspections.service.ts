import type {
  CirculationFindingCreateInput,
  CirculationInspectionCreateInput,
  CirculationInspectionUpdateInput,
} from '@siperbun/shared';
import { Prisma, Severity } from '@prisma/client';
import { prisma } from '../../config/database';
import { writeAudit } from '../../utils/audit';
import { AppError } from '../../utils/errors';

function serializeInspection<T extends Record<string, unknown>>(item: T) {
  const row = item as T & {
    seedlingCount?: bigint | number | null;
    latitude?: { toString(): string } | null;
    longitude?: { toString(): string } | null;
    findings?: Array<Record<string, unknown>>;
  };
  return {
    ...row,
    seedlingCount:
      row.seedlingCount != null ? Number(row.seedlingCount) : null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    findings: row.findings,
  };
}

async function nextInspectionNumber() {
  const year = new Date().getFullYear();
  const prefix = `WAS-${year}-`;
  const rows = await prisma.circulationInspection.findMany({
    where: {
      deletedAt: null,
      inspectionNumber: { startsWith: prefix },
    },
    select: { inspectionNumber: true },
  });
  let maxSeq = 0;
  for (const row of rows) {
    const seq = Number(row.inspectionNumber.slice(prefix.length));
    if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

const findingsInclude = {
  where: { deletedAt: null },
  orderBy: { createdAt: 'desc' as const },
} as const;

export const circulationInspectionsService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.CirculationInspectionWhereInput = {
      deletedAt: null,
      ...(query.dateFrom || query.dateTo
        ? {
            inspectedAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { inspectionNumber: { contains: search } },
              { businessName: { contains: search } },
              { location: { contains: search } },
              { inspectorName: { contains: search } },
              { certificateNumber: { contains: search } },
              { commodityName: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.circulationInspection.count({ where }),
      prisma.circulationInspection.findMany({
        where,
        include: {
          _count: { select: { findings: true } },
        },
        orderBy: { inspectedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((i) => serializeInspection(i)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const item = await prisma.circulationInspection.findFirst({
      where: { id, deletedAt: null },
      include: { findings: findingsInclude },
    });
    if (!item) throw new AppError('Pengawasan peredaran tidak ditemukan', 404);
    return serializeInspection(item);
  },

  async create(input: CirculationInspectionCreateInput, userId: string) {
    const inspectionNumber = await nextInspectionNumber();

    const item = await prisma.circulationInspection.create({
      data: {
        inspectionNumber,
        inspectorName: input.inspectorName ?? null,
        inspectedAt: new Date(input.inspectedAt),
        location: input.location ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        businessName: input.businessName ?? null,
        ownerName: input.ownerName ?? null,
        commodityName: input.commodityName ?? null,
        seedlingCount:
          input.seedlingCount != null
            ? BigInt(Math.round(input.seedlingCount))
            : null,
        certificateNumber: input.certificateNumber ?? null,
        certificateStatus: input.certificateStatus ?? null,
        labelStatus: input.labelStatus ?? null,
        actionTaken: input.actionTaken ?? null,
        recommendation: input.recommendation ?? null,
        followUp: input.followUp ?? null,
        findings: input.findings?.length
          ? {
              create: input.findings.map((f) => ({
                category: f.category,
                description: f.description,
                severity: (f.severity as Severity) ?? Severity.MEDIUM,
              })),
            }
          : undefined,
      },
      include: { findings: findingsInclude },
    });

    const serialized = serializeInspection(item);
    await writeAudit({
      userId,
      action: 'CREATE',
      module: 'circulation-inspection',
      entityId: item.id,
      after: serialized,
    });

    return serialized;
  },

  async update(
    id: string,
    input: CirculationInspectionUpdateInput,
    userId: string,
  ) {
    const existing = await prisma.circulationInspection.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new AppError('Pengawasan peredaran tidak ditemukan', 404);
    }

    const item = await prisma.circulationInspection.update({
      where: { id },
      data: {
        ...(input.inspectorName !== undefined
          ? { inspectorName: input.inspectorName }
          : {}),
        ...(input.inspectedAt
          ? { inspectedAt: new Date(input.inspectedAt) }
          : {}),
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined
          ? { longitude: input.longitude }
          : {}),
        ...(input.businessName !== undefined
          ? { businessName: input.businessName }
          : {}),
        ...(input.ownerName !== undefined ? { ownerName: input.ownerName } : {}),
        ...(input.commodityName !== undefined
          ? { commodityName: input.commodityName }
          : {}),
        ...(input.seedlingCount !== undefined
          ? {
              seedlingCount:
                input.seedlingCount != null
                  ? BigInt(Math.round(input.seedlingCount))
                  : null,
            }
          : {}),
        ...(input.certificateNumber !== undefined
          ? { certificateNumber: input.certificateNumber }
          : {}),
        ...(input.certificateStatus !== undefined
          ? { certificateStatus: input.certificateStatus }
          : {}),
        ...(input.labelStatus !== undefined
          ? { labelStatus: input.labelStatus }
          : {}),
        ...(input.actionTaken !== undefined
          ? { actionTaken: input.actionTaken }
          : {}),
        ...(input.recommendation !== undefined
          ? { recommendation: input.recommendation }
          : {}),
        ...(input.followUp !== undefined ? { followUp: input.followUp } : {}),
      },
      include: { findings: findingsInclude },
    });

    const serialized = serializeInspection(item);
    await writeAudit({
      userId,
      action: 'UPDATE',
      module: 'circulation-inspection',
      entityId: id,
      before: serializeInspection(existing),
      after: serialized,
    });

    return serialized;
  },

  async softDelete(id: string, userId: string) {
    const existing = await prisma.circulationInspection.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new AppError('Pengawasan peredaran tidak ditemukan', 404);
    }

    await prisma.circulationInspection.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAudit({
      userId,
      action: 'DELETE',
      module: 'circulation-inspection',
      entityId: id,
      before: serializeInspection(existing),
    });

    return { id };
  },

  async addFinding(
    inspectionId: string,
    input: CirculationFindingCreateInput,
    userId: string,
  ) {
    const inspection = await prisma.circulationInspection.findFirst({
      where: { id: inspectionId, deletedAt: null },
    });
    if (!inspection) {
      throw new AppError('Pengawasan peredaran tidak ditemukan', 404);
    }

    const finding = await prisma.circulationFinding.create({
      data: {
        inspectionId,
        category: input.category,
        description: input.description,
        severity: (input.severity as Severity) ?? Severity.MEDIUM,
      },
    });

    await writeAudit({
      userId,
      action: 'CREATE',
      module: 'circulation-finding',
      entityId: finding.id,
      after: finding,
    });

    return finding;
  },
};
