import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';

export const auditLogsService = {
  async list(query: {
    page?: number;
    limit?: number;
    module?: string;
    action?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.AuditLogWhereInput = {
      ...(query.module ? { module: query.module } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { module: { contains: search } },
              { action: { contains: search } },
              { entityId: { contains: search } },
              { user: { name: { contains: search } } },
              { user: { email: { contains: search } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
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
    const item = await prisma.auditLog.findFirst({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!item) throw new AppError('Audit log tidak ditemukan', 404);
    return item;
  },
};
