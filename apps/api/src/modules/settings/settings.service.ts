import type { BrandingUpdateInput } from '@siperbun/shared';
import {
  APP_FULL_NAME,
  APP_NAME,
  OFFICE_NAME,
} from '@siperbun/shared';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import {
  resolveStoragePath,
  saveMulterFile,
} from '../../utils/storage';

const KEYS = {
  name: 'app.name',
  fullName: 'app.fullName',
  officeName: 'app.officeName',
  logoFileId: 'app.logoFileId',
} as const;

async function getMap() {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: Object.values(KEYS) } },
  });
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<
    string,
    string
  >;
}

async function upsert(key: string, value: string) {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export type BrandingDto = {
  appName: string;
  fullName: string;
  officeName: string;
  logoFileId: string | null;
  logoUrl: string | null;
};

export const settingsService = {
  async getBranding(): Promise<BrandingDto> {
    const map = await getMap();
    // Pastikan key default ada (DB lama tanpa re-seed)
    if (!map[KEYS.name]) await upsert(KEYS.name, APP_NAME);
    if (!map[KEYS.fullName]) await upsert(KEYS.fullName, APP_FULL_NAME);
    if (!map[KEYS.officeName]) {
      const legacy = map['office.name'];
      await upsert(KEYS.officeName, legacy?.trim() || OFFICE_NAME);
    }

    const fresh = await getMap();
    const logoFileId = fresh[KEYS.logoFileId]?.trim() || null;
    return {
      appName: fresh[KEYS.name]?.trim() || APP_NAME,
      fullName: fresh[KEYS.fullName]?.trim() || APP_FULL_NAME,
      officeName: fresh[KEYS.officeName]?.trim() || OFFICE_NAME,
      logoFileId,
      logoUrl: logoFileId
        ? `/api/v1/settings/branding/logo?v=${encodeURIComponent(logoFileId)}`
        : null,
    };
  },

  async updateBranding(input: BrandingUpdateInput): Promise<BrandingDto> {
    await Promise.all([
      upsert(KEYS.name, input.appName.trim()),
      upsert(KEYS.fullName, input.fullName.trim()),
      upsert(KEYS.officeName, input.officeName.trim()),
    ]);
    return this.getBranding();
  },

  async uploadLogo(
    file: Express.Multer.File,
    uploadedById?: string | null,
  ): Promise<BrandingDto> {
    if (!file.mimetype.startsWith('image/')) {
      throw new AppError('Logo harus berupa gambar (PNG, JPG, atau WebP)', 400);
    }

    const stored = await saveMulterFile(file, {
      relativeDir: path.join('branding'),
      uploadedById,
    });

    await upsert(KEYS.logoFileId, stored.id);
    return this.getBranding();
  },

  async clearLogo(): Promise<BrandingDto> {
    await upsert(KEYS.logoFileId, '');
    return this.getBranding();
  },

  async getLogoAbsolutePath(): Promise<{
    absolute: string;
    mimeType: string;
    originalName: string;
  } | null> {
    const map = await getMap();
    const logoFileId = map[KEYS.logoFileId]?.trim();
    if (!logoFileId) return null;

    const file = await prisma.storedFile.findFirst({
      where: { id: logoFileId, deletedAt: null },
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
