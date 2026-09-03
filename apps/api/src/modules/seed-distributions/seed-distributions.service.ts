import {
  canonicalizeKalselDistrict,
  type SeedDistributionCreateInput,
  type SeedDistributionUpdateInput,
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

function resolveDestinationKab(value: string) {
  const canonical = canonicalizeKalselDistrict(value);
  if (!canonical) {
    throw new AppError(
      'Kabupaten tujuan harus salah satu kabupaten/kota di Kalimantan Selatan',
      400,
    );
  }
  return canonical;
}

async function assertCertificateForProducer(
  certificateId: string | null | undefined,
  producerId: string,
) {
  if (!certificateId) return;
  const cert = await prisma.certificate.findFirst({
    where: { id: certificateId, deletedAt: null },
  });
  if (!cert) throw new AppError('Sertifikat tidak ditemukan', 404);
  if (cert.producerId !== producerId) {
    throw new AppError('Sertifikat tidak termasuk penangkar ini', 400);
  }
}

async function assertBatchForProducer(
  batchId: string | null | undefined,
  producerId: string,
) {
  if (!batchId) return;
  const batch = await prisma.productionBatch.findFirst({
    where: { id: batchId, deletedAt: null },
  });
  if (!batch) throw new AppError('Batch produksi tidak ditemukan', 404);
  if (batch.producerId !== producerId) {
    throw new AppError('Batch produksi tidak termasuk penangkar ini', 400);
  }
}

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

  async create(input: SeedDistributionCreateInput, user: AccessUser) {
    const producerId = isProducerUser(user)
      ? requireProducerId(user)
      : input.producerId;
    if (!producerId) throw new AppError('Penangkar wajib dipilih', 400);

    const producer = await prisma.producer.findFirst({
      where: { id: producerId, deletedAt: null },
    });
    if (!producer) throw new AppError('Penangkar tidak ditemukan', 404);

    await assertCertificateForProducer(input.certificateId, producerId);
    await assertBatchForProducer(input.batchId, producerId);

    const item = await prisma.seedDistribution.create({
      data: {
        producerId,
        certificateId: input.certificateId ?? null,
        batchId: input.batchId ?? null,
        buyerName: input.buyerName,
        buyerAddress: input.buyerAddress ?? null,
        destinationKab: resolveDestinationKab(input.destinationKab),
        quantity: BigInt(Math.round(input.quantity)),
        distributedAt: new Date(input.distributedAt),
        deliveryNoteNo: input.deliveryNoteNo ?? null,
        notes: input.notes ?? null,
      },
      include,
    });

    const serialized = serializeDistribution(item);
    await writeAudit({
      userId: user.id,
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
    user: AccessUser,
  ) {
    const existing = await prisma.seedDistribution.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(isProducerUser(user)
          ? { producerId: requireProducerId(user) }
          : {}),
      },
    });
    if (!existing) throw new AppError('Distribusi bibit tidak ditemukan', 404);

    const nextProducerId = isProducerUser(user)
      ? existing.producerId
      : (input.producerId ?? existing.producerId);

    if (nextProducerId !== existing.producerId) {
      const producer = await prisma.producer.findFirst({
        where: { id: nextProducerId, deletedAt: null },
      });
      if (!producer) throw new AppError('Penangkar tidak ditemukan', 404);
    }

    const nextCertificateId =
      input.certificateId !== undefined
        ? input.certificateId
        : existing.certificateId;
    const nextBatchId =
      input.batchId !== undefined ? input.batchId : existing.batchId;

    await assertCertificateForProducer(nextCertificateId, nextProducerId);
    await assertBatchForProducer(nextBatchId, nextProducerId);

    const item = await prisma.seedDistribution.update({
      where: { id },
      data: {
        ...(isProducerUser(user)
          ? {}
          : input.producerId
            ? { producerId: input.producerId }
            : {}),
        ...(input.certificateId !== undefined
          ? { certificateId: input.certificateId }
          : {}),
        ...(input.batchId !== undefined ? { batchId: input.batchId } : {}),
        ...(input.buyerName != null ? { buyerName: input.buyerName } : {}),
        ...(input.buyerAddress !== undefined
          ? { buyerAddress: input.buyerAddress }
          : {}),
        ...(input.destinationKab !== undefined
          ? { destinationKab: resolveDestinationKab(input.destinationKab) }
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
      userId: user.id,
      action: 'UPDATE',
      module: 'seed-distribution',
      entityId: id,
      before: serializeDistribution(existing),
      after: serialized,
    });

    return serialized;
  },

  async softDelete(id: string, user: AccessUser) {
    const existing = await prisma.seedDistribution.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(isProducerUser(user)
          ? { producerId: requireProducerId(user) }
          : {}),
      },
    });
    if (!existing) throw new AppError('Distribusi bibit tidak ditemukan', 404);

    await prisma.seedDistribution.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAudit({
      userId: user.id,
      action: 'DELETE',
      module: 'seed-distribution',
      entityId: id,
      before: serializeDistribution(existing),
    });

    return { id };
  },
};
