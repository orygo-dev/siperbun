import type {
  LabelDistributionCreateInput,
  SeedLabelCreateInput,
  SeedLabelUpdateInput,
} from '@siperbun/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { writeAudit } from '../../utils/audit';
import { AppError } from '../../utils/errors';

function calcRemaining(
  quantity: number,
  used: number,
  damaged: number,
  cancelled: number,
) {
  return Math.max(0, quantity - used - damaged - cancelled);
}

const include = {
  certificate: {
    select: {
      id: true,
      certificateNumber: true,
      status: true,
      producer: {
        select: { id: true, businessName: true, registrationNumber: true },
      },
    },
  },
  distributions: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' as const },
    include: {
      producer: {
        select: { id: true, businessName: true, registrationNumber: true },
      },
    },
  },
} as const;

export const seedLabelsService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    certificateId?: string;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.SeedLabelWhereInput = {
      deletedAt: null,
      ...(query.certificateId ? { certificateId: query.certificateId } : {}),
      ...(search
        ? {
            OR: [
              { serialStart: { contains: search } },
              { serialEnd: { contains: search } },
              { recipient: { contains: search } },
              {
                certificate: {
                  certificateNumber: { contains: search },
                },
              },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.seedLabel.count({ where }),
      prisma.seedLabel.findMany({
        where,
        include: {
          certificate: include.certificate,
          _count: { select: { distributions: true } },
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
    const item = await prisma.seedLabel.findFirst({
      where: { id, deletedAt: null },
      include,
    });
    if (!item) throw new AppError('Label tidak ditemukan', 404);
    return item;
  },

  async create(input: SeedLabelCreateInput, userId: string) {
    const cert = await prisma.certificate.findFirst({
      where: { id: input.certificateId, deletedAt: null },
    });
    if (!cert) throw new AppError('Sertifikat tidak ditemukan', 404);

    const used = Math.round(input.usedCount ?? 0);
    const damaged = Math.round(input.damagedCount ?? 0);
    const cancelled = Math.round(input.cancelledCount ?? 0);
    const quantity = Math.round(input.quantity);

    const item = await prisma.seedLabel.create({
      data: {
        certificateId: input.certificateId,
        serialStart: input.serialStart,
        serialEnd: input.serialEnd,
        quantity,
        receivedAt: input.receivedAt ? new Date(input.receivedAt) : null,
        handedOverAt: input.handedOverAt ? new Date(input.handedOverAt) : null,
        recipient: input.recipient ?? null,
        usedCount: used,
        damagedCount: damaged,
        cancelledCount: cancelled,
        remainingCount: calcRemaining(quantity, used, damaged, cancelled),
        notes: input.notes ?? null,
      },
      include: { certificate: include.certificate },
    });

    await writeAudit({
      userId,
      action: 'CREATE',
      module: 'seed-label',
      entityId: item.id,
      after: item,
    });

    return item;
  },

  async update(id: string, input: SeedLabelUpdateInput, userId: string) {
    const existing = await prisma.seedLabel.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Label tidak ditemukan', 404);

    if (input.certificateId) {
      const cert = await prisma.certificate.findFirst({
        where: { id: input.certificateId, deletedAt: null },
      });
      if (!cert) throw new AppError('Sertifikat tidak ditemukan', 404);
    }

    const quantity = Math.round(input.quantity ?? existing.quantity);
    const used = Math.round(input.usedCount ?? existing.usedCount);
    const damaged = Math.round(input.damagedCount ?? existing.damagedCount);
    const cancelled = Math.round(
      input.cancelledCount ?? existing.cancelledCount,
    );

    const item = await prisma.seedLabel.update({
      where: { id },
      data: {
        ...(input.certificateId ? { certificateId: input.certificateId } : {}),
        ...(input.serialStart != null ? { serialStart: input.serialStart } : {}),
        ...(input.serialEnd != null ? { serialEnd: input.serialEnd } : {}),
        quantity,
        ...(input.receivedAt !== undefined
          ? {
              receivedAt: input.receivedAt
                ? new Date(input.receivedAt)
                : null,
            }
          : {}),
        ...(input.handedOverAt !== undefined
          ? {
              handedOverAt: input.handedOverAt
                ? new Date(input.handedOverAt)
                : null,
            }
          : {}),
        ...(input.recipient !== undefined
          ? { recipient: input.recipient }
          : {}),
        usedCount: used,
        damagedCount: damaged,
        cancelledCount: cancelled,
        remainingCount: calcRemaining(quantity, used, damaged, cancelled),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: { certificate: include.certificate },
    });

    await writeAudit({
      userId,
      action: 'UPDATE',
      module: 'seed-label',
      entityId: id,
      before: existing,
      after: item,
    });

    return item;
  },

  async softDelete(id: string, userId: string) {
    const existing = await prisma.seedLabel.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Label tidak ditemukan', 404);

    await prisma.seedLabel.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAudit({
      userId,
      action: 'DELETE',
      module: 'seed-label',
      entityId: id,
      before: existing,
    });

    return { id };
  },

  async addDistribution(
    labelId: string,
    input: LabelDistributionCreateInput,
    userId: string,
  ) {
    const label = await prisma.seedLabel.findFirst({
      where: { id: labelId, deletedAt: null },
    });
    if (!label) throw new AppError('Label tidak ditemukan', 404);

    if (input.producerId) {
      const producer = await prisma.producer.findFirst({
        where: { id: input.producerId, deletedAt: null },
      });
      if (!producer) throw new AppError('Penangkar tidak ditemukan', 404);
    }

    const qty = Math.round(input.quantity);
    if (qty > label.remainingCount) {
      throw new AppError(
        `Sisa label tidak cukup (tersisa ${label.remainingCount})`,
        400,
      );
    }

    const distribution = await prisma.$transaction(async (tx) => {
      const dist = await tx.labelDistribution.create({
        data: {
          labelId,
          producerId: input.producerId ?? null,
          quantity: qty,
          notes: input.notes ?? null,
        },
        include: {
          producer: {
            select: { id: true, businessName: true, registrationNumber: true },
          },
        },
      });

      const usedCount = label.usedCount + qty;
      await tx.seedLabel.update({
        where: { id: labelId },
        data: {
          usedCount,
          remainingCount: calcRemaining(
            label.quantity,
            usedCount,
            label.damagedCount,
            label.cancelledCount,
          ),
        },
      });

      return dist;
    });

    await writeAudit({
      userId,
      action: 'CREATE',
      module: 'label-distribution',
      entityId: distribution.id,
      after: distribution,
    });

    return distribution;
  },
};
