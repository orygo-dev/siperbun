import {
  BANNER_PLACEMENTS,
  type BannerPlacement,
  type DashboardBannerCreateInput,
  type DashboardBannerUpdateInput,
} from '@siperbun/shared';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { resolveStoragePath, saveMulterFile } from '../../utils/storage';

const MAX_ACTIVE = 5;

export type BannerDto = {
  id: string;
  title: string;
  subtitle: string | null;
  linkUrl: string | null;
  placement: BannerPlacement;
  sortOrder: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  imageFileId: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizePlacement(value?: string | null): BannerPlacement {
  if (value === BANNER_PLACEMENTS.MOBILE) return BANNER_PLACEMENTS.MOBILE;
  return BANNER_PLACEMENTS.DASHBOARD;
}

function toDto(row: {
  id: string;
  title: string;
  subtitle: string | null;
  linkUrl: string | null;
  placement: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  imageFileId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BannerDto {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    linkUrl: row.linkUrl,
    placement: normalizePlacement(row.placement),
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    imageFileId: row.imageFileId,
    imageUrl: row.imageFileId
      ? `/api/v1/settings/banners/${row.id}/image?v=${encodeURIComponent(row.imageFileId)}`
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function countActiveExcluding(
  placement: BannerPlacement,
  excludeId?: string,
) {
  return prisma.dashboardBanner.count({
    where: {
      deletedAt: null,
      isActive: true,
      placement,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

async function assertActiveLimit(
  placement: BannerPlacement,
  willBeActive: boolean,
  excludeId?: string,
) {
  if (!willBeActive) return;
  const active = await countActiveExcluding(placement, excludeId);
  if (active >= MAX_ACTIVE) {
    throw new AppError(
      `Maksimal ${MAX_ACTIVE} banner aktif untuk penempatan ini. Nonaktifkan banner lain terlebih dahulu.`,
      400,
    );
  }
}

export const bannersService = {
  async listAdmin(placement?: BannerPlacement): Promise<BannerDto[]> {
    const rows = await prisma.dashboardBanner.findMany({
      where: {
        deletedAt: null,
        ...(placement ? { placement } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map(toDto);
  },

  async listActive(
    placement: BannerPlacement = BANNER_PLACEMENTS.DASHBOARD,
  ): Promise<BannerDto[]> {
    const now = new Date();
    const rows = await prisma.dashboardBanner.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        placement,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: MAX_ACTIVE,
    });
    return rows.map(toDto);
  },

  async getById(id: string): Promise<BannerDto> {
    const row = await prisma.dashboardBanner.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new AppError('Banner tidak ditemukan', 404);
    return toDto(row);
  },

  async create(input: DashboardBannerCreateInput): Promise<BannerDto> {
    const placement = normalizePlacement(input.placement);
    await assertActiveLimit(placement, input.isActive !== false);
    const row = await prisma.dashboardBanner.create({
      data: {
        title: (input.title ?? '').trim(),
        subtitle: input.subtitle ?? null,
        linkUrl: input.linkUrl ?? null,
        placement,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
      },
    });
    return toDto(row);
  },

  async update(
    id: string,
    input: DashboardBannerUpdateInput,
  ): Promise<BannerDto> {
    const existing = await prisma.dashboardBanner.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Banner tidak ditemukan', 404);

    const nextPlacement = normalizePlacement(
      input.placement ?? existing.placement,
    );
    const nextActive = input.isActive ?? existing.isActive;
    if (
      nextActive &&
      (!existing.isActive || existing.placement !== nextPlacement)
    ) {
      await assertActiveLimit(nextPlacement, true, id);
    }

    const row = await prisma.dashboardBanner.update({
      where: { id },
      data: {
        ...(input.title !== undefined
          ? { title: (input.title ?? '').trim() }
          : {}),
        ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
        ...(input.linkUrl !== undefined ? { linkUrl: input.linkUrl } : {}),
        ...(input.placement !== undefined ? { placement: nextPlacement } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
        ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
      },
    });
    return toDto(row);
  },

  async remove(id: string): Promise<void> {
    const existing = await prisma.dashboardBanner.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Banner tidak ditemukan', 404);
    await prisma.dashboardBanner.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  },

  async uploadImage(
    id: string,
    file: Express.Multer.File,
    uploadedById?: string | null,
  ): Promise<BannerDto> {
    const existing = await prisma.dashboardBanner.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Banner tidak ditemukan', 404);
    if (!file.mimetype.startsWith('image/')) {
      throw new AppError(
        'Gambar banner harus berupa PNG, JPG, atau WebP',
        400,
      );
    }

    const stored = await saveMulterFile(file, {
      relativeDir: path.join('banners'),
      uploadedById,
    });

    const row = await prisma.dashboardBanner.update({
      where: { id },
      data: { imageFileId: stored.id },
    });
    return toDto(row);
  },

  async clearImage(id: string): Promise<BannerDto> {
    const existing = await prisma.dashboardBanner.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Banner tidak ditemukan', 404);
    const row = await prisma.dashboardBanner.update({
      where: { id },
      data: { imageFileId: null },
    });
    return toDto(row);
  },

  async getImageAbsolutePath(id: string): Promise<{
    absolute: string;
    mimeType: string;
    originalName: string;
  } | null> {
    const banner = await prisma.dashboardBanner.findFirst({
      where: { id, deletedAt: null },
    });
    if (!banner?.imageFileId) return null;

    const file = await prisma.storedFile.findFirst({
      where: { id: banner.imageFileId, deletedAt: null },
    });
    if (!file) return null;

    const absolute = resolveStoragePath(file.path);
    if (!fs.existsSync(absolute)) return null;

    return {
      absolute: path.resolve(absolute),
      mimeType: file.mimeType,
      originalName: file.originalName,
    };
  },
};
