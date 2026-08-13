import type { RegionCreateInput, RegionUpdateInput } from '@siperbun/shared';
import { Prisma, RegionType } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';

function serializeRegion<T extends Record<string, unknown>>(r: T) {
  const row = r as T & {
    latitude?: { toString(): string } | null;
    longitude?: { toString(): string } | null;
  };
  return {
    ...row,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
  };
}

export const regionsService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    parentId?: string;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.RegionWhereInput = {
      deletedAt: null,
      ...(query.type ? { type: query.type as RegionType } : {}),
      ...(query.parentId === 'null'
        ? { parentId: null }
        : query.parentId
          ? { parentId: query.parentId }
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
      prisma.region.count({ where }),
      prisma.region.findMany({
        where,
        include: {
          parent: { select: { id: true, name: true, code: true } },
          _count: { select: { children: true } },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((r) => serializeRegion(r)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async tree() {
    const regions = await prisma.region.findMany({
      where: { deletedAt: null },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    type Node = ReturnType<typeof serializeRegion> & { children: Node[] };
    const map = new Map<string, Node>();
    for (const r of regions) {
      map.set(r.id, { ...serializeRegion(r), children: [] });
    }
    const roots: Node[] = [];
    for (const r of regions) {
      const node = map.get(r.id)!;
      if (r.parentId && map.has(r.parentId)) {
        map.get(r.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  },

  async getById(id: string) {
    const item = await prisma.region.findFirst({
      where: { id, deletedAt: null },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!item) throw new AppError('Wilayah tidak ditemukan', 404);
    return {
      ...serializeRegion(item),
      children: item.children.map((c) => serializeRegion(c)),
    };
  },

  async create(input: RegionCreateInput) {
    const existing = await prisma.region.findFirst({
      where: { code: input.code, deletedAt: null },
    });
    if (existing) throw new AppError('Kode wilayah sudah digunakan', 409);

    const item = await prisma.region.create({
      data: {
        code: input.code,
        name: input.name,
        type: input.type as RegionType,
        parentId: input.parentId ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
    });
    return serializeRegion(item);
  },

  async update(id: string, input: RegionUpdateInput) {
    const existing = await prisma.region.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Wilayah tidak ditemukan', 404);

    if (input.code && input.code !== existing.code) {
      const dup = await prisma.region.findFirst({
        where: { code: input.code, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new AppError('Kode wilayah sudah digunakan', 409);
    }

    const item = await prisma.region.update({
      where: { id },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.type !== undefined ? { type: input.type as RegionType } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      },
    });
    return serializeRegion(item);
  },

  async softDelete(id: string) {
    const existing = await prisma.region.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Wilayah tidak ditemukan', 404);
    await prisma.region.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  },
};
