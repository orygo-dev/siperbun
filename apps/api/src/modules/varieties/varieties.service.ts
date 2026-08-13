import type { VarietyCreateInput, VarietyUpdateInput } from '@siperbun/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';

export const varietiesService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    commodityId?: string;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.VarietyWhereInput = {
      deletedAt: null,
      ...(query.commodityId ? { commodityId: query.commodityId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
              { clone: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.variety.count({ where }),
      prisma.variety.findMany({
        where,
        include: {
          commodity: { select: { id: true, name: true, code: true } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const item = await prisma.variety.findFirst({
      where: { id, deletedAt: null },
      include: {
        commodity: { select: { id: true, name: true, code: true } },
      },
    });
    if (!item) throw new AppError('Varietas tidak ditemukan', 404);
    return item;
  },

  async create(input: VarietyCreateInput) {
    const commodity = await prisma.commodity.findFirst({
      where: { id: input.commodityId, deletedAt: null },
    });
    if (!commodity) throw new AppError('Komoditas tidak ditemukan', 404);

    const dup = await prisma.variety.findFirst({
      where: {
        commodityId: input.commodityId,
        code: input.code,
        deletedAt: null,
      },
    });
    if (dup) throw new AppError('Kode varietas sudah digunakan', 409);

    return prisma.variety.create({
      data: {
        commodityId: input.commodityId,
        code: input.code,
        name: input.name,
        clone: input.clone ?? null,
        description: input.description ?? null,
        isActive: input.isActive ?? true,
      },
      include: {
        commodity: { select: { id: true, name: true, code: true } },
      },
    });
  },

  async update(id: string, input: VarietyUpdateInput) {
    const existing = await prisma.variety.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Varietas tidak ditemukan', 404);

    const commodityId = input.commodityId ?? existing.commodityId;
    const code = input.code ?? existing.code;

    if (input.code || input.commodityId) {
      const dup = await prisma.variety.findFirst({
        where: {
          commodityId,
          code,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new AppError('Kode varietas sudah digunakan', 409);
    }

    return prisma.variety.update({
      where: { id },
      data: {
        ...(input.commodityId !== undefined
          ? { commodityId: input.commodityId }
          : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.clone !== undefined ? { clone: input.clone } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: {
        commodity: { select: { id: true, name: true, code: true } },
      },
    });
  },

  async softDelete(id: string) {
    const existing = await prisma.variety.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Varietas tidak ditemukan', 404);
    await prisma.variety.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { id };
  },
};
