import type { UserCreateInput, UserUpdateInput } from '@siperbun/shared';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';

function serializeUser(user: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  officeId: string | null;
  regionId: string | null;
  producerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  passwordHash?: string;
  userRoles?: Array<{
    role: { id: string; slug: string; name: string };
  }>;
  region?: { id: string; name: string; code: string } | null;
  office?: { id: string; name: string } | null;
}) {
  const { userRoles, passwordHash: _passwordHash, ...rest } = user;
  return {
    ...rest,
    roles: (userRoles ?? []).map((ur) => ({
      id: ur.role.id,
      slug: ur.role.slug,
      name: ur.role.name,
    })),
  };
}

const userInclude = {
  userRoles: {
    include: {
      role: { select: { id: true, slug: true, name: true } },
    },
  },
  region: { select: { id: true, name: true, code: true } },
  office: { select: { id: true, name: true } },
} as const;

export const usersService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: string;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.isActive === 'true'
        ? { isActive: true }
        : query.isActive === 'false'
          ? { isActive: false }
          : {}),
      ...(query.role
        ? { userRoles: { some: { role: { slug: query.role } } } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: userInclude,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((u) => serializeUser(u)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const item = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: userInclude,
    });
    if (!item) throw new AppError('Pengguna tidak ditemukan', 404);
    return serializeUser(item);
  },

  async create(input: UserCreateInput) {
    const existing = await prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
    });
    if (existing) throw new AppError('Email sudah digunakan', 409);

    const roles = await prisma.role.findMany({
      where: { id: { in: input.roleIds } },
    });
    if (roles.length !== input.roleIds.length) {
      throw new AppError('Satu atau lebih role tidak valid', 400);
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const item = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        phone: input.phone ?? null,
        officeId: input.officeId ?? null,
        regionId: input.regionId ?? null,
        producerId: input.producerId ?? null,
        isActive: input.isActive ?? true,
        userRoles: {
          create: input.roleIds.map((roleId) => ({ roleId })),
        },
      },
      include: userInclude,
    });

    return serializeUser(item);
  },

  async update(id: string, input: UserUpdateInput) {
    const existing = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Pengguna tidak ditemukan', 404);

    if (input.email && input.email !== existing.email) {
      const dup = await prisma.user.findFirst({
        where: { email: input.email, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new AppError('Email sudah digunakan', 409);
    }

    if (input.roleIds) {
      const roles = await prisma.role.findMany({
        where: { id: { in: input.roleIds } },
      });
      if (roles.length !== input.roleIds.length) {
        throw new AppError('Satu atau lebih role tidak valid', 400);
      }
    }

    const passwordHash = input.password
      ? await bcrypt.hash(input.password, 10)
      : undefined;

    const item = await prisma.$transaction(async (tx) => {
      if (input.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: input.roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }

      return tx.user.update({
        where: { id },
        data: {
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(passwordHash ? { passwordHash } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.officeId !== undefined ? { officeId: input.officeId } : {}),
          ...(input.regionId !== undefined ? { regionId: input.regionId } : {}),
          ...(input.producerId !== undefined
            ? { producerId: input.producerId }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
        include: userInclude,
      });
    });

    return serializeUser(item);
  },

  async toggleActive(id: string) {
    const existing = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Pengguna tidak ditemukan', 404);

    const item = await prisma.user.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: userInclude,
    });
    return serializeUser(item);
  },

  async softDelete(id: string) {
    const existing = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Pengguna tidak ditemukan', 404);
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { id };
  },

  async listRoles() {
    return prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true, description: true },
    });
  },

  async listInspectors() {
    const items = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        userRoles: { some: { role: { slug: 'PBT' } } },
      },
      include: userInclude,
      orderBy: { name: 'asc' },
    });
    return items.map((u) => serializeUser(u));
  },
};
