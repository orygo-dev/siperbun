import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';

export const notificationsService = {
  async list(userId: string, query: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20)));

    const where = { userId };
    const [total, unreadCount, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
      prisma.notification.findMany({
        where,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  },

  async markRead(userId: string, id: string) {
    const item = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!item) throw new AppError('Notifikasi tidak ditemukan', 404);

    return prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  },
};
