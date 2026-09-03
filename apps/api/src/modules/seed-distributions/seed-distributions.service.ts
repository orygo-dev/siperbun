import type {
  SeedDistributionCreateInput,
  SeedDistributionUpdateInput,
} from '@siperbun/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  type AccessUser,
  isProducerUser,
  requireProducerId,
} from '../../utils/access-scope';
import { writeAudit } from '../../utils/audit';
import { AppError } from '../../utils/errors';

function serializeDistribution<T extends Record<string, unknown>>(item: T) {
  const row = item as T & { quantity?: bigint | number };
  return {
    ...row,
    quantity: row.quantity != null ? Number(row.quantity) : 0,
  };
}

const include = {
  producer: {
    select: { id: true, businessName: true, registrationNumber: true },
  },
  certificate: {
    select: { id: true, certificateNumber: true, status: true },
  },
  batch: {
    select: { id: true, batchNumber: true, status: true },
  },
} as const;

export const seedDistributionsService = {
  async list(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      producerId?: string;
      certificateId?: string;
    },
    user: AccessUser,
  ) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.SeedDistributionWhereInput = {
      deletedAt: null,
      ...(isProducerUser(user)
        ? { producerId: requireProducerId(user) }
        : query.producerId
          ? { producerId: query.producerId }
          : {}),
      ...(query.certificateId ? { certificateId: query.certificateId } : {}),
      ...(search
        ? {
            OR: [
              { buyerName: { contains: search } },
              { destinationKab: { contains: search } },
              { deliveryNoteNo: { contains: search } },
              { producer: { businessName: { contains: search } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.seedDistribution.count({ where }),
      prisma.seedDistribution.findMany({
        where,
        include,
        orderBy: { distributedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((i) => serializeDistribution(i)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string, user: AccessUser) {
    const item = await prisma.seedDistribution.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(isProducerUser(user)
          ? { producerId: requireProducerId(user) }
          : {}),
      },
      include,
    });
    if (!item) throw new AppError('Distribusi bibit tidak ditemukan', 404);
    return serializeDistribution(item);
  },

  async create(input: SeedDistributionCreateInput, userId: string) {
    const producer = await prisma.producer.findFirst({
      where: { id: input.producerId, deletedAt: null },
    });
    if (!producer) throw new AppError('Penangkar tidak ditemukan', 404);

    if (input.certificateId) {
      const cert = await prisma.certificate.findFirst({
        where: { id: input.certificateId, deletedAt: null },
      });
      if (!cert) throw new AppError('Sertifikat tidak ditemukan', 404);
    }

    if (input.batchId) {
      const batch = await prisma.productionBatch.findFirst({
        where: { id: input.batchId, deletedAt: null },
      });
      if (!batch) throw new AppError('Batch produksi tidak ditemukan', 404);
    }

    const item = await prisma.seedDistribution.create({
      data: {
        producerId: input.producerId,
        certificateId: input.certificateId ?? null,
        batchId: input.batchId ?? null,
        buyerName: input.buyerName,
        buyerAddress: input.buyerAddress ?? null,
        destinationKab: input.destinationKab ?? null,
        quantity: BigInt(Math.round(input.quantity)),
        distributedAt: new Date(input.distributedAt),
        deliveryNoteNo: input.deliveryNoteNo ?? null,
        notes: input.notes ?? null,
      },
      include,
    });

    const serialized = serializeDistribution(item);
    await writeAudit({
      userId,
      action: 'CREATE',
      module: 'seed-distribution',
      entityId: item.id,
      after: serialized,
    });

    return serialized;
  },

  async update(
    id: string,
    input: SeedDistributionUpdateInput,
    userId: string,
  ) {
    const existing = await prisma.seedDistribution.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Distribusi bibit tidak ditemukan', 404);

    if (input.producerId) {
      const producer = await prisma.producer.findFirst({
        where: { id: input.producerId, deletedAt: null },
      });
      if (!producer) throw new AppError('Penangkar tidak ditemukan', 404);
    }

    const item = await prisma.seedDistribution.update({
      where: { id },
      data: {
        ...(input.producerId ? { producerId: input.producerId } : {}),
        ...(input.certificateId !== undefined
          ? { certificateId: input.certificateId }
          : {}),
        ...(input.batchId !== undefined ? { batchId: input.batchId } : {}),
        ...(input.buyerName != null ? { buyerName: input.buyerName } : {}),
        ...(input.buyerAddress !== undefined
          ? { buyerAddress: input.buyerAddress }
          : {}),
        ...(input.destinationKab !== undefined
          ? { destinationKab: input.destinationKab }
          : {}),
        ...(input.quantity != null
          ? { quantity: BigInt(Math.round(input.quantity)) }
          : {}),
        ...(input.distributedAt
          ? { distributedAt: new Date(input.distributedAt) }
          : {}),
        ...(input.deliveryNoteNo !== undefined
          ? { deliveryNoteNo: input.deliveryNoteNo }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include,
    });

    const serialized = serializeDistribution(item);
    await writeAudit({
      userId,
      action: 'UPDATE',
      module: 'seed-distribution',
      entityId: id,
      before: serializeDistribution(existing),
      after: serialized,
    });

    return serialized;
  },

  async softDelete(id: string, userId: string) {
    const existing = await prisma.seedDistribution.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Distribusi bibit tidak ditemukan', 404);

    await prisma.seedDistribution.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAudit({
      userId,
      action: 'DELETE',
      module: 'seed-distribution',
      entityId: id,
      before: serializeDistribution(existing),
    });

    return { id };
  },
};
