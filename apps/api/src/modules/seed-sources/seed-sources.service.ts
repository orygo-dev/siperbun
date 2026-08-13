import type {
  SeedSourceCreateInput,
  SeedSourceUpdateInput,
} from '@siperbun/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';

function serializeSeedSource<T extends Record<string, unknown>>(item: T) {
  const row = item as T & {
    quantity?: { toString(): string } | number | null;
    usedQuantity?: { toString(): string } | number | null;
    remainingStock?: { toString(): string } | number | null;
  };
  return {
    ...row,
    quantity: row.quantity != null ? Number(row.quantity) : 0,
    usedQuantity: row.usedQuantity != null ? Number(row.usedQuantity) : 0,
    remainingStock:
      row.remainingStock != null ? Number(row.remainingStock) : 0,
  };
}

const include = {
  producer: {
    select: { id: true, businessName: true, registrationNumber: true },
  },
  seedGarden: { select: { id: true, name: true } },
  commodity: { select: { id: true, name: true, code: true } },
  variety: { select: { id: true, name: true, code: true } },
} as const;

export const seedSourcesService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    producerId?: string;
    commodityId?: string;
    verificationStatus?: string;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.SeedSourceWhereInput = {
      deletedAt: null,
      ...(query.producerId ? { producerId: query.producerId } : {}),
      ...(query.commodityId ? { commodityId: query.commodityId } : {}),
      ...(query.verificationStatus
        ? { verificationStatus: query.verificationStatus }
        : {}),
      ...(search
        ? {
            OR: [
              { lotNumber: { contains: search } },
              { supplier: { contains: search } },
              { producer: { businessName: { contains: search } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.seedSource.count({ where }),
      prisma.seedSource.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((i) => serializeSeedSource(i)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const item = await prisma.seedSource.findFirst({
      where: { id, deletedAt: null },
      include,
    });
    if (!item) throw new AppError('Sumber benih tidak ditemukan', 404);
    return serializeSeedSource(item);
  },

  async create(input: SeedSourceCreateInput) {
    const producer = await prisma.producer.findFirst({
      where: { id: input.producerId, deletedAt: null },
    });
    if (!producer) throw new AppError('Penangkar tidak ditemukan', 404);

    const commodity = await prisma.commodity.findFirst({
      where: { id: input.commodityId },
    });
    if (!commodity) throw new AppError('Komoditas tidak ditemukan', 404);

    const usedQuantity = input.usedQuantity ?? 0;
    if (usedQuantity > input.quantity) {
      throw new AppError('Jumlah terpakai tidak boleh melebihi stok', 400);
    }

    const dup = await prisma.seedSource.findFirst({
      where: {
        producerId: input.producerId,
        lotNumber: input.lotNumber,
        deletedAt: null,
      },
    });
    if (dup) throw new AppError('Nomor lot sudah digunakan penangkar ini', 409);

    const remainingStock = input.quantity - usedQuantity;

    const item = await prisma.seedSource.create({
      data: {
        producerId: input.producerId,
        seedGardenId: input.seedGardenId ?? null,
        commodityId: input.commodityId,
        varietyId: input.varietyId ?? null,
        lotNumber: input.lotNumber,
        receivedAt: input.receivedAt ? new Date(input.receivedAt) : null,
        quantity: input.quantity,
        unit: input.unit ?? 'kg',
        supplier: input.supplier ?? null,
        originDocumentNumber: input.originDocumentNumber ?? null,
        sourceCertificateNo: input.sourceCertificateNo ?? null,
        usedQuantity,
        remainingStock,
        verificationStatus: input.verificationStatus ?? 'PENDING',
        notes: input.notes ?? null,
      },
      include,
    });
    return serializeSeedSource(item);
  },

  async update(id: string, input: SeedSourceUpdateInput) {
    const existing = await prisma.seedSource.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Sumber benih tidak ditemukan', 404);

    if (input.producerId) {
      const producer = await prisma.producer.findFirst({
        where: { id: input.producerId, deletedAt: null },
      });
      if (!producer) throw new AppError('Penangkar tidak ditemukan', 404);
    }

    const lotNumber = input.lotNumber ?? existing.lotNumber;
    const producerId = input.producerId ?? existing.producerId;
    if (
      lotNumber !== existing.lotNumber ||
      producerId !== existing.producerId
    ) {
      const dup = await prisma.seedSource.findFirst({
        where: {
          producerId,
          lotNumber,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new AppError('Nomor lot sudah digunakan penangkar ini', 409);
    }

    const quantity =
      input.quantity != null ? input.quantity : Number(existing.quantity);
    const usedQuantity =
      input.usedQuantity != null
        ? input.usedQuantity
        : Number(existing.usedQuantity);
    if (usedQuantity > quantity) {
      throw new AppError('Jumlah terpakai tidak boleh melebihi stok', 400);
    }

    let remainingStock: number;
    if (input.remainingStock != null) {
      remainingStock = input.remainingStock;
    } else if (input.quantity != null || input.usedQuantity != null) {
      remainingStock = quantity - usedQuantity;
    } else {
      remainingStock = Number(existing.remainingStock);
    }

    const item = await prisma.seedSource.update({
      where: { id },
      data: {
        ...(input.producerId !== undefined ? { producerId: input.producerId } : {}),
        ...(input.seedGardenId !== undefined
          ? { seedGardenId: input.seedGardenId }
          : {}),
        ...(input.commodityId !== undefined
          ? { commodityId: input.commodityId }
          : {}),
        ...(input.varietyId !== undefined ? { varietyId: input.varietyId } : {}),
        ...(input.lotNumber !== undefined ? { lotNumber: input.lotNumber } : {}),
        ...(input.receivedAt !== undefined
          ? {
              receivedAt: input.receivedAt
                ? new Date(input.receivedAt)
                : null,
            }
          : {}),
        ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.supplier !== undefined ? { supplier: input.supplier } : {}),
        ...(input.originDocumentNumber !== undefined
          ? { originDocumentNumber: input.originDocumentNumber }
          : {}),
        ...(input.sourceCertificateNo !== undefined
          ? { sourceCertificateNo: input.sourceCertificateNo }
          : {}),
        ...(input.usedQuantity !== undefined
          ? { usedQuantity: input.usedQuantity }
          : {}),
        remainingStock,
        ...(input.verificationStatus !== undefined
          ? { verificationStatus: input.verificationStatus }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include,
    });
    return serializeSeedSource(item);
  },

  async softDelete(id: string) {
    const existing = await prisma.seedSource.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Sumber benih tidak ditemukan', 404);
    await prisma.seedSource.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  },

  async verify(id: string) {
    const existing = await prisma.seedSource.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Sumber benih tidak ditemukan', 404);

    const item = await prisma.seedSource.update({
      where: { id },
      data: { verificationStatus: 'VERIFIED' },
      include,
    });
    return serializeSeedSource(item);
  },
};
