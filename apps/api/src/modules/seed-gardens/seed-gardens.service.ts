import type {
  SeedGardenCreateInput,
  SeedGardenUpdateInput,
} from '@siperbun/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';

function serializeGarden<T extends Record<string, unknown>>(g: T) {
  const row = g as T & {
    estimatedYield?: bigint | null;
    latitude?: { toString(): string } | null;
    longitude?: { toString(): string } | null;
    areaHa?: { toString(): string } | null;
  };
  return {
    ...row,
    estimatedYield:
      row.estimatedYield != null ? Number(row.estimatedYield) : null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    areaHa: row.areaHa != null ? Number(row.areaHa) : null,
  };
}

const include = {
  producer: { select: { id: true, businessName: true, registrationNumber: true } },
  commodity: { select: { id: true, name: true, code: true } },
  variety: { select: { id: true, name: true, code: true } },
  region: { select: { id: true, name: true, code: true } },
} as const;

function parseDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const seedGardensService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    producerId?: string;
    commodityId?: string;
    status?: string;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.SeedGardenWhereInput = {
      deletedAt: null,
      ...(query.producerId ? { producerId: query.producerId } : {}),
      ...(query.commodityId ? { commodityId: query.commodityId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { ownerName: { contains: search } },
              { decreeNumber: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.seedGarden.count({ where }),
      prisma.seedGarden.findMany({
        where,
        include,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((g) => serializeGarden(g)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const item = await prisma.seedGarden.findFirst({
      where: { id, deletedAt: null },
      include,
    });
    if (!item) throw new AppError('Kebun sumber tidak ditemukan', 404);
    return serializeGarden(item);
  },

  async create(input: SeedGardenCreateInput) {
    const commodity = await prisma.commodity.findFirst({
      where: { id: input.commodityId, deletedAt: null },
    });
    if (!commodity) throw new AppError('Komoditas tidak ditemukan', 404);

    const item = await prisma.seedGarden.create({
      data: {
        producerId: input.producerId ?? null,
        commodityId: input.commodityId,
        varietyId: input.varietyId ?? null,
        regionId: input.regionId ?? null,
        name: input.name,
        ownerName: input.ownerName ?? null,
        address: input.address ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        areaHa: input.areaHa ?? null,
        clone: input.clone ?? null,
        plantingYear:
          input.plantingYear != null ? Math.round(input.plantingYear) : null,
        motherTreeCount:
          input.motherTreeCount != null
            ? Math.round(input.motherTreeCount)
            : null,
        estimatedYield:
          input.estimatedYield != null
            ? BigInt(Math.round(input.estimatedYield))
            : null,
        decreeNumber: input.decreeNumber ?? null,
        decreeDate: parseDate(input.decreeDate),
        validUntil: parseDate(input.validUntil),
        status: input.status ?? 'ACTIVE',
      },
      include,
    });
    return serializeGarden(item);
  },

  async update(id: string, input: SeedGardenUpdateInput) {
    const existing = await prisma.seedGarden.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Kebun sumber tidak ditemukan', 404);

    if (input.commodityId) {
      const commodity = await prisma.commodity.findFirst({
        where: { id: input.commodityId, deletedAt: null },
      });
      if (!commodity) throw new AppError('Komoditas tidak ditemukan', 404);
    }

    const item = await prisma.seedGarden.update({
      where: { id },
      data: {
        ...(input.producerId !== undefined ? { producerId: input.producerId } : {}),
        ...(input.commodityId !== undefined ? { commodityId: input.commodityId } : {}),
        ...(input.varietyId !== undefined ? { varietyId: input.varietyId } : {}),
        ...(input.regionId !== undefined ? { regionId: input.regionId } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.ownerName !== undefined ? { ownerName: input.ownerName } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.areaHa !== undefined ? { areaHa: input.areaHa } : {}),
        ...(input.clone !== undefined ? { clone: input.clone } : {}),
        ...(input.plantingYear !== undefined
          ? {
              plantingYear:
                input.plantingYear != null
                  ? Math.round(input.plantingYear)
                  : null,
            }
          : {}),
        ...(input.motherTreeCount !== undefined
          ? {
              motherTreeCount:
                input.motherTreeCount != null
                  ? Math.round(input.motherTreeCount)
                  : null,
            }
          : {}),
        ...(input.estimatedYield !== undefined
          ? {
              estimatedYield:
                input.estimatedYield != null
                  ? BigInt(Math.round(input.estimatedYield))
                  : null,
            }
          : {}),
        ...(input.decreeNumber !== undefined
          ? { decreeNumber: input.decreeNumber }
          : {}),
        ...(input.decreeDate !== undefined
          ? { decreeDate: parseDate(input.decreeDate) }
          : {}),
        ...(input.validUntil !== undefined
          ? { validUntil: parseDate(input.validUntil) }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include,
    });
    return serializeGarden(item);
  },

  async softDelete(id: string) {
    const existing = await prisma.seedGarden.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Kebun sumber tidak ditemukan', 404);
    await prisma.seedGarden.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  },
};
