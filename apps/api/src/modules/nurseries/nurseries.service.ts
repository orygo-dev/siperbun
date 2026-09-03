import type { NurseryCreateInput, NurseryUpdateInput } from '@siperbun/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { type AccessUser, isProducerUser, requireProducerId } from '../../utils/access-scope';

function serializeNursery<T extends Record<string, unknown>>(n: T) {
  const row = n as T & {
    capacity?: bigint | null;
    latitude?: { toString(): string } | null;
    longitude?: { toString(): string } | null;
    areaHa?: { toString(): string } | null;
  };
  return {
    ...row,
    capacity: row.capacity != null ? Number(row.capacity) : null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    areaHa: row.areaHa != null ? Number(row.areaHa) : null,
  };
}

const include = {
  producer: { select: { id: true, businessName: true, registrationNumber: true } },
  commodity: { select: { id: true, name: true, code: true } },
  region: { select: { id: true, name: true, code: true } },
} as const;

export const nurseriesService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    producerId?: string;
    status?: string;
  }, user?: AccessUser) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.NurseryLocationWhereInput = {
      deletedAt: null,
      ...(user && isProducerUser(user)
        ? { producerId: requireProducerId(user) }
        : query.producerId
          ? { producerId: query.producerId }
          : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { address: { contains: search } },
              { producer: { businessName: { contains: search } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.nurseryLocation.count({ where }),
      prisma.nurseryLocation.findMany({
        where,
        include,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((n) => serializeNursery(n)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string, user?: AccessUser) {
    const item = await prisma.nurseryLocation.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(user && isProducerUser(user)
          ? { producerId: requireProducerId(user) }
          : {}),
      },
      include,
    });
    if (!item) throw new AppError('Lokasi pembibitan tidak ditemukan', 404);
    return serializeNursery(item);
  },

  async create(input: NurseryCreateInput) {
    const producer = await prisma.producer.findFirst({
      where: { id: input.producerId, deletedAt: null },
    });
    if (!producer) throw new AppError('Penangkar tidak ditemukan', 404);

    const item = await prisma.nurseryLocation.create({
      data: {
        producerId: input.producerId,
        commodityId: input.commodityId ?? null,
        regionId: input.regionId ?? null,
        name: input.name,
        address: input.address ?? null,
        landOwnershipStatus: input.landOwnershipStatus ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        areaHa: input.areaHa ?? null,
        capacity:
          input.capacity != null ? BigInt(Math.round(input.capacity)) : null,
        waterSource: input.waterSource ?? null,
        facilities: input.facilities ?? null,
        status: input.status ?? 'ACTIVE',
        notes: input.notes ?? null,
      },
      include,
    });
    if (!producer.nurseryAddress) {
      await prisma.producer.update({
        where: { id: producer.id },
        data: {
          nurseryAddress: input.address ?? null,
          landOwnershipStatus: input.landOwnershipStatus ?? null,
        },
      });
    }
    return serializeNursery(item);
  },

  async update(id: string, input: NurseryUpdateInput) {
    const existing = await prisma.nurseryLocation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Lokasi pembibitan tidak ditemukan', 404);

    if (input.producerId) {
      const producer = await prisma.producer.findFirst({
        where: { id: input.producerId, deletedAt: null },
      });
      if (!producer) throw new AppError('Penangkar tidak ditemukan', 404);
    }

    const primaryNursery = await prisma.nurseryLocation.findFirst({
      where: { producerId: existing.producerId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    const item = await prisma.nurseryLocation.update({
      where: { id },
      data: {
        ...(input.producerId !== undefined ? { producerId: input.producerId } : {}),
        ...(input.commodityId !== undefined ? { commodityId: input.commodityId } : {}),
        ...(input.regionId !== undefined ? { regionId: input.regionId } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.landOwnershipStatus !== undefined
          ? { landOwnershipStatus: input.landOwnershipStatus }
          : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.areaHa !== undefined ? { areaHa: input.areaHa } : {}),
        ...(input.capacity !== undefined
          ? {
              capacity:
                input.capacity != null
                  ? BigInt(Math.round(input.capacity))
                  : null,
            }
          : {}),
        ...(input.waterSource !== undefined ? { waterSource: input.waterSource } : {}),
        ...(input.facilities !== undefined ? { facilities: input.facilities } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include,
    });
    if (primaryNursery?.id === id && item.producerId !== existing.producerId) {
      const oldReplacement = await prisma.nurseryLocation.findFirst({
        where: {
          producerId: existing.producerId,
          deletedAt: null,
          NOT: { id },
        },
        orderBy: { createdAt: 'asc' },
        select: { address: true, landOwnershipStatus: true },
      });
      await prisma.producer.update({
        where: { id: existing.producerId },
        data: {
          nurseryAddress: oldReplacement?.address ?? null,
          landOwnershipStatus: oldReplacement?.landOwnershipStatus ?? null,
        },
      });
    }
    const newPrimary = await prisma.nurseryLocation.findFirst({
      where: { producerId: item.producerId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, address: true, landOwnershipStatus: true },
    });
    if (newPrimary?.id === id) {
      await prisma.producer.update({
        where: { id: item.producerId },
        data: {
          nurseryAddress: item.address,
          landOwnershipStatus: item.landOwnershipStatus,
        },
      });
    }
    return serializeNursery(item);
  },

  async softDelete(id: string) {
    const existing = await prisma.nurseryLocation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Lokasi pembibitan tidak ditemukan', 404);
    await prisma.nurseryLocation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    const replacement = await prisma.nurseryLocation.findFirst({
      where: { producerId: existing.producerId, deletedAt: null, NOT: { id } },
      orderBy: { createdAt: 'asc' },
      select: { address: true, landOwnershipStatus: true },
    });
    await prisma.producer.update({
      where: { id: existing.producerId },
      data: {
        nurseryAddress: replacement?.address ?? null,
        landOwnershipStatus: replacement?.landOwnershipStatus ?? null,
      },
    });
    return { id };
  },
};
