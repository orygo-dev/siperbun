import type {
  CommodityCreateInput,
  CommodityUpdateInput,
} from '@siperbun/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';

export const commoditiesService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: string;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.CommodityWhereInput = {
      deletedAt: null,
      ...(query.isActive === 'true'
        ? { isActive: true }
        : query.isActive === 'false'
          ? { isActive: false }
          : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.commodity.count({ where }),
      prisma.commodity.findMany({
        where,
        include: {
          _count: {
            select: { varieties: { where: { deletedAt: null } } },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((c) => ({
        ...c,
        varietiesCount: c._count.varieties,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const item = await prisma.commodity.findFirst({
      where: { id, deletedAt: null },
      include: {
        varieties: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
        },
        _count: { select: { varieties: { where: { deletedAt: null } } } },
      },
    });
    if (!item) throw new AppError('Komoditas tidak ditemukan', 404);
    return {
      ...item,
      varietiesCount: item._count.varieties,
    };
  },

  async create(input: CommodityCreateInput) {
    const existing = await prisma.commodity.findFirst({
      where: { code: input.code, deletedAt: null },
    });
    if (existing) throw new AppError('Kode komoditas sudah digunakan', 409);

    return prisma.commodity.create({
      data: {
        code: input.code,
        name: input.name,
        scientificName: input.scientificName ?? null,
        unit: input.unit ?? 'batang',
        isActive: input.isActive ?? true,
      },
    });
  },

  async update(id: string, input: CommodityUpdateInput) {
    const existing = await prisma.commodity.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Komoditas tidak ditemukan', 404);

    if (input.code && input.code !== existing.code) {
      const dup = await prisma.commodity.findFirst({
        where: { code: input.code, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new AppError('Kode komoditas sudah digunakan', 409);
    }

    return prisma.commodity.update({
      where: { id },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.scientificName !== undefined
          ? { scientificName: input.scientificName }
          : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  },

  async softDelete(id: string) {
    const existing = await prisma.commodity.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Komoditas tidak ditemukan', 404);
    await prisma.commodity.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { id };
  },
};
