import type {
  ProductionBatchCreateInput,
  ProductionBatchUpdateInput,
  ProductionLogCreateInput,
  ProductionStatusChangeInput,
} from '@siperbun/shared';
import { ProductionStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { type AccessUser, isProducerUser, requireProducerId } from '../../utils/access-scope';

function toBigInt(n: number | null | undefined, fallback = 0n): bigint {
  if (n == null || Number.isNaN(n)) return fallback;
  return BigInt(Math.round(n));
}

function serializeBatch<T extends Record<string, unknown>>(item: T) {
  const row = item as T & {
    initialCount?: bigint | number;
    grownCount?: bigint | number;
    deadCount?: bigint | number;
    rejectedCount?: bigint | number;
    activeCount?: bigint | number;
    readyCount?: bigint | number;
    logs?: Array<Record<string, unknown> & { countChange?: bigint | number | null }>;
  };
  return {
    ...row,
    initialCount: row.initialCount != null ? Number(row.initialCount) : 0,
    grownCount: row.grownCount != null ? Number(row.grownCount) : 0,
    deadCount: row.deadCount != null ? Number(row.deadCount) : 0,
    rejectedCount: row.rejectedCount != null ? Number(row.rejectedCount) : 0,
    activeCount: row.activeCount != null ? Number(row.activeCount) : 0,
    readyCount: row.readyCount != null ? Number(row.readyCount) : 0,
    logs: row.logs?.map((log) => ({
      ...log,
      countChange:
        log.countChange != null ? Number(log.countChange) : null,
    })),
  };
}

const listInclude = {
  producer: {
    select: { id: true, businessName: true, registrationNumber: true },
  },
  nursery: { select: { id: true, name: true } },
  seedSource: { select: { id: true, lotNumber: true } },
  commodity: { select: { id: true, name: true, code: true } },
  variety: { select: { id: true, name: true, code: true } },
} as const;

const detailInclude = {
  ...listInclude,
  logs: {
    orderBy: { loggedAt: 'desc' as const },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  },
};

async function nextBatchNumber() {
  const year = new Date().getFullYear();
  const prefix = `PB-${year}-`;
  const latest = await prisma.productionBatch.findFirst({
    where: { batchNumber: { startsWith: prefix } },
    orderBy: { batchNumber: 'desc' },
    select: { batchNumber: true },
  });
  let seq = 1;
  if (latest?.batchNumber) {
    const part = latest.batchNumber.split('-').pop();
    const n = Number(part);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

export const productionBatchesService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    producerId?: string;
    commodityId?: string;
    status?: string;
  }, user: AccessUser) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.ProductionBatchWhereInput = {
      deletedAt: null,
      ...(isProducerUser(user)
        ? { producerId: requireProducerId(user) }
        : query.producerId
          ? { producerId: query.producerId }
          : {}),
      ...(query.commodityId ? { commodityId: query.commodityId } : {}),
      ...(query.status
        ? { status: query.status as ProductionStatus }
        : {}),
      ...(search
        ? {
            OR: [
              { batchNumber: { contains: search } },
              { producer: { businessName: { contains: search } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.productionBatch.count({ where }),
      prisma.productionBatch.findMany({
        where,
        include: listInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((i) => serializeBatch(i)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string, user?: AccessUser) {
    const item = await prisma.productionBatch.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(user && isProducerUser(user)
          ? { producerId: requireProducerId(user) }
          : {}),
      },
      include: detailInclude,
    });
    if (!item) throw new AppError('Batch produksi tidak ditemukan', 404);
    return serializeBatch(item);
  },

  async create(input: ProductionBatchCreateInput, user: AccessUser) {
    if (isProducerUser(user) && input.producerId !== requireProducerId(user)) {
      throw new AppError('Penangkar hanya dapat membuat batch sendiri', 403);
    }
    const producer = await prisma.producer.findFirst({
      where: { id: input.producerId, deletedAt: null },
    });
    if (!producer) throw new AppError('Penangkar tidak ditemukan', 404);

    const commodity = await prisma.commodity.findFirst({
      where: { id: input.commodityId },
    });
    if (!commodity) throw new AppError('Komoditas tidak ditemukan', 404);

    const batchNumber =
      input.batchNumber?.trim() || (await nextBatchNumber());

    const dup = await prisma.productionBatch.findFirst({
      where: { batchNumber, deletedAt: null },
    });
    if (dup) throw new AppError('Nomor batch sudah digunakan', 409);

    const initialCount = input.initialCount ?? 0;
    const activeCount =
      input.activeCount != null ? input.activeCount : initialCount;

    const item = await prisma.productionBatch.create({
      data: {
        batchNumber,
        producerId: input.producerId,
        nurseryId: input.nurseryId ?? null,
        seedSourceId: input.seedSourceId ?? null,
        commodityId: input.commodityId,
        varietyId: input.varietyId ?? null,
        startedAt: input.startedAt ? new Date(input.startedAt) : null,
        initialCount: toBigInt(initialCount),
        grownCount: toBigInt(input.grownCount, 0n),
        deadCount: toBigInt(input.deadCount, 0n),
        rejectedCount: toBigInt(input.rejectedCount, 0n),
        activeCount: toBigInt(activeCount),
        readyCount: toBigInt(input.readyCount, 0n),
        status: (input.status as ProductionStatus) ?? ProductionStatus.PREPARATION,
        notes: input.notes ?? null,
      },
      include: listInclude,
    });
    return serializeBatch(item);
  },

  async update(id: string, input: ProductionBatchUpdateInput, user: AccessUser) {
    const existing = await prisma.productionBatch.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(isProducerUser(user) ? { producerId: requireProducerId(user) } : {}),
      },
    });
    if (!existing) throw new AppError('Batch produksi tidak ditemukan', 404);
    if (isProducerUser(user) && input.producerId && input.producerId !== existing.producerId) {
      throw new AppError('Penangkar tidak dapat mengubah pemilik batch', 403);
    }

    if (input.batchNumber && input.batchNumber !== existing.batchNumber) {
      const dup = await prisma.productionBatch.findFirst({
        where: {
          batchNumber: input.batchNumber,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new AppError('Nomor batch sudah digunakan', 409);
    }

    if (input.producerId) {
      const producer = await prisma.producer.findFirst({
        where: { id: input.producerId, deletedAt: null },
      });
      if (!producer) throw new AppError('Penangkar tidak ditemukan', 404);
    }

    const item = await prisma.productionBatch.update({
      where: { id },
      data: {
        ...(input.batchNumber !== undefined
          ? { batchNumber: input.batchNumber ?? existing.batchNumber }
          : {}),
        ...(input.producerId !== undefined ? { producerId: input.producerId } : {}),
        ...(input.nurseryId !== undefined ? { nurseryId: input.nurseryId } : {}),
        ...(input.seedSourceId !== undefined
          ? { seedSourceId: input.seedSourceId }
          : {}),
        ...(input.commodityId !== undefined
          ? { commodityId: input.commodityId }
          : {}),
        ...(input.varietyId !== undefined ? { varietyId: input.varietyId } : {}),
        ...(input.startedAt !== undefined
          ? {
              startedAt: input.startedAt ? new Date(input.startedAt) : null,
            }
          : {}),
        ...(input.initialCount !== undefined
          ? { initialCount: toBigInt(input.initialCount) }
          : {}),
        ...(input.grownCount !== undefined
          ? { grownCount: toBigInt(input.grownCount) }
          : {}),
        ...(input.deadCount !== undefined
          ? { deadCount: toBigInt(input.deadCount) }
          : {}),
        ...(input.rejectedCount !== undefined
          ? { rejectedCount: toBigInt(input.rejectedCount) }
          : {}),
        ...(input.activeCount !== undefined
          ? { activeCount: toBigInt(input.activeCount) }
          : {}),
        ...(input.readyCount !== undefined
          ? { readyCount: toBigInt(input.readyCount) }
          : {}),
        ...(input.status !== undefined
          ? { status: input.status as ProductionStatus }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: listInclude,
    });
    return serializeBatch(item);
  },

  async softDelete(id: string) {
    const existing = await prisma.productionBatch.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Batch produksi tidak ditemukan', 404);
    await prisma.productionBatch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  },

  async addLog(id: string, input: ProductionLogCreateInput, user: AccessUser) {
    const existing = await prisma.productionBatch.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(isProducerUser(user) ? { producerId: requireProducerId(user) } : {}),
      },
    });
    if (!existing) throw new AppError('Batch produksi tidak ditemukan', 404);

    const item = await prisma.$transaction(async (tx) => {
      await tx.productionLog.create({
        data: {
          batchId: id,
          userId: user.id,
          loggedAt: input.loggedAt ? new Date(input.loggedAt) : new Date(),
          stage: input.stage,
          activity: input.activity,
          countChange:
            input.countChange != null
              ? BigInt(Math.round(input.countChange))
              : null,
          condition: input.condition ?? null,
          notes: input.notes ?? null,
        },
      });

      const countUpdates: Prisma.ProductionBatchUpdateInput = {};
      if (input.grownCount != null) {
        countUpdates.grownCount = toBigInt(input.grownCount);
      }
      if (input.deadCount != null) {
        countUpdates.deadCount = toBigInt(input.deadCount);
      }
      if (input.rejectedCount != null) {
        countUpdates.rejectedCount = toBigInt(input.rejectedCount);
      }
      if (input.activeCount != null) {
        countUpdates.activeCount = toBigInt(input.activeCount);
      }
      if (input.readyCount != null) {
        countUpdates.readyCount = toBigInt(input.readyCount);
      }

      if (Object.keys(countUpdates).length > 0) {
        await tx.productionBatch.update({
          where: { id },
          data: countUpdates,
        });
      }

      return tx.productionBatch.findFirst({
        where: { id },
        include: detailInclude,
      });
    });

    if (!item) throw new AppError('Batch produksi tidak ditemukan', 404);
    return serializeBatch(item);
  },

  async changeStatus(id: string, input: ProductionStatusChangeInput, user: AccessUser) {
    const existing = await prisma.productionBatch.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(isProducerUser(user) ? { producerId: requireProducerId(user) } : {}),
      },
    });
    if (!existing) throw new AppError('Batch produksi tidak ditemukan', 404);

    if (!Object.values(ProductionStatus).includes(input.status as ProductionStatus)) {
      throw new AppError('Status produksi tidak valid', 400);
    }

    const item = await prisma.productionBatch.update({
      where: { id },
      data: {
        status: input.status as ProductionStatus,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: detailInclude,
    });
    return serializeBatch(item);
  },
};
