import type { BrandingUpdateInput, PortalContentInput } from '@siperbun/shared';
import {
  APP_FULL_NAME,
  APP_NAME,
  OFFICE_NAME,
  portalContentSchema,
} from '@siperbun/shared';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { writeAudit } from '../../utils/audit';
import {
  resolveStoragePath,
  saveMulterFile,
} from '../../utils/storage';

const KEYS = {
  name: 'app.name',
  fullName: 'app.fullName',
  officeName: 'app.officeName',
  logoFileId: 'app.logoFileId',
  portalContent: 'portal.content',
  portalHeroImageFileId: 'portal.heroImageFileId',
  portalServiceImageFileId: 'portal.serviceImageFileId',
} as const;

export const DEFAULT_PORTAL_CONTENT: PortalContentInput = {
  hero: {
    enabled: true,
    title: 'Menjaga Mutu Benih, Melindungi Perkebunan Kalimantan Selatan',
    description:
      'Pengawasan, sertifikasi benih, dan perlindungan tanaman perkebunan yang transparan, terukur, dan mudah diakses.',
    primaryLabel: 'Lihat Layanan',
    primaryLink: '#layanan',
    secondaryLabel: 'Jelajahi Katalog',
    secondaryLink: '/portal/bibit',
  },
  profile: {
    enabled: true,
    title: 'Melayani mutu benih dari hulu ke hilir',
    body:
      'UPTD Balai Pengawasan Sertifikasi Benih dan Proteksi Tanaman Perkebunan Provinsi Kalimantan Selatan merupakan unit pelaksana teknis daerah yang mendukung tersedianya benih perkebunan bermutu dan perlindungan tanaman yang berkelanjutan.',
    secondaryBody:
      'Kami menjalankan pelayanan secara profesional, transparan, dan berorientasi pada kebutuhan penangkar serta masyarakat perkebunan.',
    responsibilities: [
      'Melaksanakan pengawasan peredaran dan mutu benih tanaman perkebunan.',
      'Melaksanakan sertifikasi benih tanaman perkebunan sesuai ketentuan.',
      'Melaksanakan proteksi tanaman perkebunan dari organisme pengganggu tanaman.',
      'Melaksanakan pengujian mutu benih serta pembinaan teknis.',
    ],
  },
  services: {
    enabled: true,
    title: 'Layanan untuk Penangkar',
    intro:
      'Satu pintu layanan untuk mendukung penangkar menghasilkan benih perkebunan bermutu dan tersertifikasi.',
    items: [
      {
        title: 'Pendaftaran Penangkar',
        description: 'Daftarkan usaha penangkaran dan lengkapi data awal secara daring.',
        link: '/portal/daftar',
      },
      {
        title: 'Sertifikasi Benih',
        description: 'Ajukan sertifikasi dan ikuti proses pemeriksaan benih secara terukur.',
        link: '/login',
      },
      {
        title: 'Pemantauan Pengajuan',
        description: 'Pantau status, jadwal pemeriksaan, dan hasil pengajuan dalam satu sistem.',
        link: '/login',
      },
      {
        title: 'Katalog Benih',
        description: 'Jelajahi ketersediaan benih dari penangkar yang telah terverifikasi.',
        link: '/portal/bibit',
      },
    ],
  },
  visionMission: {
    enabled: true,
    vision:
      'Menjadi balai yang profesional, terpercaya, dan terdepan dalam menjamin mutu benih serta perlindungan tanaman perkebunan.',
    missions: [
      'Melaksanakan pengawasan dan sertifikasi benih perkebunan untuk menjamin mutu dan legalitas benih.',
      'Melaksanakan perlindungan tanaman perkebunan yang efektif dan berkelanjutan.',
      'Memberikan layanan yang profesional, transparan, dan akuntabel kepada penangkar dan masyarakat.',
      'Meningkatkan kapasitas penangkar, pelaku usaha, dan masyarakat perkebunan.',
    ],
  },
  map: {
    enabled: true,
    title: 'Sebaran Penangkar di Kalimantan Selatan',
    description:
      'Lihat persebaran penangkar dan komoditas perkebunan pada 13 kabupaten/kota.',
  },
  contact: {
    enabled: true,
    title: 'Butuh layanan sertifikasi atau ingin menjadi penangkar?',
    primaryLabel: 'Daftar sebagai Penangkar',
    primaryLink: '/portal/daftar',
    secondaryLabel: 'Hubungi Balai',
    secondaryLink: 'mailto:layanan@bpsbtp-kalsel.go.id',
    address: 'Banjarbaru, Kalimantan Selatan',
    hours: 'Senin–Jumat, 08.00–16.00 WITA',
    phone: '+62 812 3456 7890',
    email: 'layanan@bpsbtp-kalsel.go.id',
  },
};

export type PortalMediaSlot = 'hero' | 'service';

function portalMediaKey(slot: PortalMediaSlot) {
  return slot === 'hero'
    ? KEYS.portalHeroImageFileId
    : KEYS.portalServiceImageFileId;
}

function portalMediaUrl(slot: PortalMediaSlot, fileId: string | null) {
  return fileId
    ? `/api/v1/settings/portal-content/media/${slot}?v=${encodeURIComponent(fileId)}`
    : null;
}

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

  async getPortalContent() {
    const map = await getMap();
    let content = DEFAULT_PORTAL_CONTENT;
    const raw = map[KEYS.portalContent];
    if (raw) {
      try {
        const parsed = portalContentSchema.safeParse(JSON.parse(raw));
        if (parsed.success) content = parsed.data;
      } catch {
        // Data lama/rusak tidak boleh membuat portal publik gagal dirender.
      }
    }

    const heroFileId = map[KEYS.portalHeroImageFileId]?.trim() || null;
    const serviceFileId = map[KEYS.portalServiceImageFileId]?.trim() || null;
    return {
      content,
      media: {
        heroImageUrl: portalMediaUrl('hero', heroFileId),
        serviceImageUrl: portalMediaUrl('service', serviceFileId),
      },
    };
  },

  async updatePortalContent(
    input: PortalContentInput,
    actor?: { id?: string | null; req?: import('express').Request },
  ) {
    const before = await this.getPortalContent();
    await upsert(KEYS.portalContent, JSON.stringify(input));
    const after = await this.getPortalContent();
    await writeAudit({
      userId: actor?.id,
      action: 'UPDATE',
      module: 'PORTAL_CONTENT',
      entityId: 'landing-page',
      before: before.content,
      after: after.content,
      req: actor?.req,
    });
    return after;
  },

  async uploadPortalMedia(
    slot: PortalMediaSlot,
    file: Express.Multer.File,
    actor?: { id?: string | null; req?: import('express').Request },
  ) {
    if (!file.mimetype.startsWith('image/')) {
      throw new AppError('Media portal harus berupa gambar PNG, JPG, atau WebP', 400);
    }
    const stored = await saveMulterFile(file, {
      relativeDir: path.join('portal'),
      uploadedById: actor?.id,
    });
    await upsert(portalMediaKey(slot), stored.id);
    await writeAudit({
      userId: actor?.id,
      action: 'UPLOAD_MEDIA',
      module: 'PORTAL_CONTENT',
      entityId: slot,
      after: { fileId: stored.id, originalName: stored.originalName },
      req: actor?.req,
    });
    return this.getPortalContent();
  },

  async clearPortalMedia(
    slot: PortalMediaSlot,
    actor?: { id?: string | null; req?: import('express').Request },
  ) {
    const map = await getMap();
    const previous = map[portalMediaKey(slot)]?.trim() || null;
    await upsert(portalMediaKey(slot), '');
    await writeAudit({
      userId: actor?.id,
      action: 'DELETE_MEDIA',
      module: 'PORTAL_CONTENT',
      entityId: slot,
      before: { fileId: previous },
      after: { fileId: null },
      req: actor?.req,
    });
    return this.getPortalContent();
  },

  async getPortalMediaAbsolute(slot: PortalMediaSlot): Promise<{
    absolute: string;
    mimeType: string;
    originalName: string;
  } | null> {
    const map = await getMap();
    const fileId = map[portalMediaKey(slot)]?.trim();
    if (!fileId) return null;
    const file = await prisma.storedFile.findFirst({
      where: { id: fileId, deletedAt: null },
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
