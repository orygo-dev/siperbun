import type {
  ProducerRegistrationInput,
  PublicListingCreateInput,
  PublicListingUpdateInput,
} from '@siperbun/shared';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { resolveStoragePath, saveMulterFile } from '../../utils/storage';

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function photoUrl(listingId: string, photoId: string, fileId: string) {
  return `/api/v1/public/listings/${listingId}/photos/${photoId}?v=${encodeURIComponent(fileId)}`;
}

function mapPhoto(listingId: string, p: {
  id: string;
  fileId: string;
  caption: string | null;
  sortOrder: number;
  isCover: boolean;
}) {
  return {
    id: p.id,
    caption: p.caption,
    sortOrder: p.sortOrder,
    isCover: p.isCover,
    url: photoUrl(listingId, p.id, p.fileId),
  };
}

const listingInclude = {
  producer: {
    select: {
      id: true,
      businessName: true,
      ownerName: true,
      phone: true,
      address: true,
      kecamatan: true,
      desa: true,
      latitude: true,
      longitude: true,
      kabupaten: { select: { id: true, name: true } },
    },
  },
  nursery: {
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      address: true,
    },
  },
  commodity: { select: { id: true, name: true, unit: true } },
  variety: { select: { id: true, name: true, clone: true } },
  photos: { orderBy: [{ isCover: 'desc' as const }, { sortOrder: 'asc' as const }] },
};

function mapListing(row: any) {
  const cover =
    row.photos.find((p: any) => p.isCover) ?? row.photos[0] ?? null;
  const lat =
    toNum(row.nursery?.latitude) ?? toNum(row.producer.latitude);
  const lng =
    toNum(row.nursery?.longitude) ?? toNum(row.producer.longitude);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    availableQty: row.availableQty != null ? Number(row.availableQty) : null,
    ageMonths: row.ageMonths != null ? Number(row.ageMonths) : null,
    unit: row.unit,
    priceHint: row.priceHint,
    status: row.status,
    publishedAt: row.publishedAt,
    commodity: row.commodity,
    variety: row.variety,
    producer: {
      id: row.producer.id,
      businessName: row.producer.businessName,
      ownerName: row.producer.ownerName,
      phone: row.producer.phone,
      kabupaten: row.producer.kabupaten?.name ?? null,
      kecamatan: row.producer.kecamatan,
      desa: row.producer.desa,
    },
    nursery: row.nursery
      ? {
          id: row.nursery.id,
          name: row.nursery.name,
          address: row.nursery.address,
        }
      : null,
    latitude: lat,
    longitude: lng,
    coverUrl: cover ? photoUrl(row.id, cover.id, cover.fileId) : null,
    photos: row.photos.map((p: any) => mapPhoto(row.id, p)),
  };
}

export const publicService = {
  async listCommodities() {
    return prisma.commodity.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, unit: true, code: true },
    });
  },

  async listKabupaten() {
    return prisma.region.findMany({
      where: { type: 'KABUPATEN', deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
  },

  async listListings(query: {
    search?: string;
    commodityId?: string;
    kabupatenId?: string;
    ageMin?: number;
    ageMax?: number;
    lat?: number;
    lng?: number;
    radiusKm?: number;
  }) {
    const ageFilter =
      query.ageMin != null || query.ageMax != null
        ? {
            ageMonths: {
              ...(query.ageMin != null ? { gte: query.ageMin } : {}),
              ...(query.ageMax != null ? { lte: query.ageMax } : {}),
            },
          }
        : {};

    const rows = await prisma.publicListing.findMany({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        ...ageFilter,
        producer: {
          deletedAt: null,
          isActive: true,
          status: { in: ['ACTIVE', 'VERIFIED'] },
          ...(query.kabupatenId ? { kabupatenId: query.kabupatenId } : {}),
        },
        ...(query.commodityId ? { commodityId: query.commodityId } : {}),
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search } },
                { description: { contains: query.search } },
                { producer: { businessName: { contains: query.search } } },
              ],
            }
          : {}),
      },
      include: listingInclude,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 60,
    });

    let items = rows.map(mapListing);

    if (query.lat != null && query.lng != null) {
      items = items
        .map((item) => ({
          ...item,
          distanceKm:
            item.latitude != null && item.longitude != null
              ? Math.round(
                  haversineKm(query.lat!, query.lng!, item.latitude, item.longitude) *
                    10,
                ) / 10
              : null,
        }))
        .filter((item) => {
          if (query.radiusKm == null) return true;
          if (item.distanceKm == null) return false;
          return item.distanceKm <= query.radiusKm;
        })
        .sort((a, b) => {
          if (a.distanceKm == null) return 1;
          if (b.distanceKm == null) return -1;
          return a.distanceKm - b.distanceKm;
        });
    }

    return items;
  },

  async getListing(id: string) {
    const row = await prisma.publicListing.findFirst({
      where: {
        id,
        deletedAt: null,
        status: 'PUBLISHED',
        producer: {
          deletedAt: null,
          isActive: true,
          status: { in: ['ACTIVE', 'VERIFIED'] },
        },
      },
      include: listingInclude,
    });
    if (!row) throw new AppError('Bibit tidak ditemukan', 404);
    return mapListing(row);
  },

  async listNearbyProducers(query: {
    lat?: number;
    lng?: number;
    kabupatenId?: string;
    search?: string;
    limit?: number;
  }) {
    const rows = await prisma.producer.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        status: { in: ['ACTIVE', 'VERIFIED'] },
        ...(query.kabupatenId ? { kabupatenId: query.kabupatenId } : {}),
        ...(query.search
          ? {
              OR: [
                { businessName: { contains: query.search } },
                { ownerName: { contains: query.search } },
                { kecamatan: { contains: query.search } },
              ],
            }
          : {}),
      },
      include: {
        kabupaten: { select: { id: true, name: true } },
        nurseries: {
          where: { deletedAt: null, status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            address: true,
          },
          take: 5,
        },
        publicListings: {
          where: { deletedAt: null, status: 'PUBLISHED' },
          select: { id: true },
        },
      },
      take: 100,
    });

    let items = rows.map((p) => {
      const nursery = p.nurseries.find((n) => n.latitude != null && n.longitude != null)
        ?? p.nurseries[0];
      const lat = toNum(nursery?.latitude) ?? toNum(p.latitude);
      const lng = toNum(nursery?.longitude) ?? toNum(p.longitude);
      return {
        id: p.id,
        businessName: p.businessName,
        ownerName: p.ownerName,
        phone: p.phone,
        kabupaten: p.kabupaten?.name ?? null,
        kecamatan: p.kecamatan,
        desa: p.desa,
        address: p.address,
        latitude: lat,
        longitude: lng,
        nurseryName: nursery?.name ?? null,
        listingCount: p.publicListings.length,
        distanceKm: null as number | null,
      };
    });

    if (query.lat != null && query.lng != null) {
      items = items
        .map((item) => ({
          ...item,
          distanceKm:
            item.latitude != null && item.longitude != null
              ? Math.round(
                  haversineKm(query.lat!, query.lng!, item.latitude, item.longitude) *
                    10,
                ) / 10
              : null,
        }))
        .sort((a, b) => {
          if (a.distanceKm == null) return 1;
          if (b.distanceKm == null) return -1;
          return a.distanceKm - b.distanceKm;
        });
    }

    return items.slice(0, query.limit ?? 30);
  },

  async getProducer(id: string) {
    const p = await prisma.producer.findFirst({
      where: {
        id,
        deletedAt: null,
        isActive: true,
        status: { in: ['ACTIVE', 'VERIFIED'] },
      },
      include: {
        kabupaten: { select: { id: true, name: true } },
        nurseries: {
          where: { deletedAt: null, status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
        publicListings: {
          where: { deletedAt: null, status: 'PUBLISHED' },
          include: listingInclude,
          orderBy: { publishedAt: 'desc' },
        },
      },
    });
    if (!p) throw new AppError('Penangkar tidak ditemukan', 404);

    return {
      id: p.id,
      businessName: p.businessName,
      ownerName: p.ownerName,
      phone: p.phone,
      email: p.email,
      address: p.address,
      kabupaten: p.kabupaten?.name ?? null,
      kecamatan: p.kecamatan,
      desa: p.desa,
      latitude: toNum(p.latitude),
      longitude: toNum(p.longitude),
      nurseries: p.nurseries.map((n) => ({
        id: n.id,
        name: n.name,
        address: n.address,
        latitude: toNum(n.latitude),
        longitude: toNum(n.longitude),
      })),
      listings: p.publicListings.map(mapListing),
    };
  },

  async submitRegistration(input: ProducerRegistrationInput) {
    const row = await prisma.producerRegistrationRequest.create({
      data: {
        businessName: input.businessName.trim(),
        ownerName: input.ownerName.trim(),
        nik: input.nik ?? null,
        phone: input.phone.trim(),
        email: input.email ?? null,
        address: input.address ?? null,
        kabupatenId: input.kabupatenId ?? null,
        kecamatan: input.kecamatan ?? null,
        desa: input.desa ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        commodityInterest: input.commodityInterest ?? null,
        notes: input.notes ?? null,
      },
    });
    return {
      id: row.id,
      status: row.status,
      message:
        'Pendaftaran diterima. Tim dinas akan meninjau dan menghubungi Anda.',
    };
  },

  async getListingPhotoAbsolute(listingId: string, photoId: string) {
    const photo = await prisma.publicListingPhoto.findFirst({
      where: {
        id: photoId,
        listingId,
        listing: { deletedAt: null, status: 'PUBLISHED' },
      },
      include: { file: true },
    });
    if (!photo || photo.file.deletedAt) return null;
    const absolute = resolveStoragePath(photo.file.path);
    if (!fs.existsSync(absolute)) return null;
    return {
      absolute: path.resolve(absolute),
      mimeType: photo.file.mimeType,
      originalName: photo.file.originalName,
    };
  },

  // ── Admin catalog ──────────────────────────────────────────────────────────

  async adminListListings() {
    const rows = await prisma.publicListing.findMany({
      where: { deletedAt: null },
      include: listingInclude,
      orderBy: [{ updatedAt: 'desc' }],
    });
    return rows.map((row) => ({
      ...mapListing(row),
      status: row.status,
      producerId: row.producerId,
      commodityId: row.commodityId,
      varietyId: row.varietyId,
      nurseryId: row.nurseryId,
    }));
  },

  async adminCreateListing(input: PublicListingCreateInput) {
    const producer = await prisma.producer.findFirst({
      where: { id: input.producerId, deletedAt: null },
    });
    if (!producer) throw new AppError('Penangkar tidak ditemukan', 404);

    const row = await prisma.publicListing.create({
      data: {
        producerId: input.producerId,
        nurseryId: input.nurseryId ?? null,
        commodityId: input.commodityId,
        varietyId: input.varietyId ?? null,
        title: input.title.trim(),
        description: input.description ?? null,
        availableQty:
          input.availableQty != null ? BigInt(Math.round(input.availableQty)) : null,
        ageMonths: input.ageMonths ?? null,
        unit: input.unit || 'batang',
        priceHint: input.priceHint ?? null,
        status: input.status,
        publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
      },
      include: listingInclude,
    });
    return mapListing(row);
  },

  async adminUpdateListing(id: string, input: PublicListingUpdateInput) {
    const existing = await prisma.publicListing.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Listing tidak ditemukan', 404);

    const nextStatus = input.status ?? existing.status;
    const row = await prisma.publicListing.update({
      where: { id },
      data: {
        ...(input.producerId !== undefined ? { producerId: input.producerId } : {}),
        ...(input.nurseryId !== undefined ? { nurseryId: input.nurseryId } : {}),
        ...(input.commodityId !== undefined
          ? { commodityId: input.commodityId }
          : {}),
        ...(input.varietyId !== undefined ? { varietyId: input.varietyId } : {}),
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.availableQty !== undefined
          ? {
              availableQty:
                input.availableQty != null
                  ? BigInt(Math.round(input.availableQty))
                  : null,
            }
          : {}),
        ...(input.ageMonths !== undefined ? { ageMonths: input.ageMonths } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.priceHint !== undefined ? { priceHint: input.priceHint } : {}),
        ...(input.status !== undefined
          ? {
              status: input.status,
              publishedAt:
                input.status === 'PUBLISHED'
                  ? existing.publishedAt ?? new Date()
                  : existing.publishedAt,
            }
          : {}),
      },
      include: listingInclude,
    });
    void nextStatus;
    return mapListing(row);
  },

  async adminDeleteListing(id: string) {
    const existing = await prisma.publicListing.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Listing tidak ditemukan', 404);
    await prisma.publicListing.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  },

  async adminUploadPhoto(
    listingId: string,
    file: Express.Multer.File,
    uploadedById?: string | null,
    opts?: { caption?: string; isCover?: boolean },
  ) {
    const listing = await prisma.publicListing.findFirst({
      where: { id: listingId, deletedAt: null },
    });
    if (!listing) throw new AppError('Listing tidak ditemukan', 404);
    if (!file.mimetype.startsWith('image/')) {
      throw new AppError('File harus berupa gambar', 400);
    }

    const stored = await saveMulterFile(file, {
      relativeDir: path.join('listings'),
      uploadedById,
    });

    if (opts?.isCover) {
      await prisma.publicListingPhoto.updateMany({
        where: { listingId },
        data: { isCover: false },
      });
    }

    const count = await prisma.publicListingPhoto.count({ where: { listingId } });
    const photo = await prisma.publicListingPhoto.create({
      data: {
        listingId,
        fileId: stored.id,
        caption: opts?.caption ?? null,
        sortOrder: count,
        isCover: opts?.isCover ?? count === 0,
      },
    });

    const row = await prisma.publicListing.findFirstOrThrow({
      where: { id: listingId },
      include: listingInclude,
    });
    void photo;
    return mapListing(row);
  },

  async adminDeletePhoto(listingId: string, photoId: string) {
    const photo = await prisma.publicListingPhoto.findFirst({
      where: { id: photoId, listingId },
    });
    if (!photo) throw new AppError('Foto tidak ditemukan', 404);
    await prisma.publicListingPhoto.delete({ where: { id: photoId } });
    if (photo.isCover) {
      const next = await prisma.publicListingPhoto.findFirst({
        where: { listingId },
        orderBy: { sortOrder: 'asc' },
      });
      if (next) {
        await prisma.publicListingPhoto.update({
          where: { id: next.id },
          data: { isCover: true },
        });
      }
    }
    const row = await prisma.publicListing.findFirstOrThrow({
      where: { id: listingId },
      include: listingInclude,
    });
    return mapListing(row);
  },

  /** Admin can stream any listing photo (incl. draft) */
  async getAdminListingPhotoAbsolute(listingId: string, photoId: string) {
    const photo = await prisma.publicListingPhoto.findFirst({
      where: { id: photoId, listingId },
      include: { file: true },
    });
    if (!photo || photo.file.deletedAt) return null;
    const absolute = resolveStoragePath(photo.file.path);
    if (!fs.existsSync(absolute)) return null;
    return {
      absolute: path.resolve(absolute),
      mimeType: photo.file.mimeType,
      originalName: photo.file.originalName,
    };
  },

  async adminListRegistrations() {
    return prisma.producerRegistrationRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        kabupaten: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      take: 100,
    });
  },

  async adminUpdateRegistrationStatus(
    id: string,
    status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED',
    reviewedById: string,
    reviewNotes?: string | null,
  ) {
    const existing = await prisma.producerRegistrationRequest.findUnique({
      where: { id },
    });
    if (!existing) throw new AppError('Pendaftaran tidak ditemukan', 404);

    let createdProducerId = existing.createdProducerId;

    if (status === 'APPROVED' && !createdProducerId) {
      const year = new Date().getFullYear();
      const count = await prisma.producer.count({
        where: {
          registrationNumber: { startsWith: `PBR-${year}-` },
        },
      });
      const registrationNumber = `PBR-${year}-${String(count + 1).padStart(5, '0')}`;
      const producer = await prisma.producer.create({
        data: {
          registrationNumber,
          businessName: existing.businessName,
          ownerName: existing.ownerName,
          nik: existing.nik,
          phone: existing.phone,
          email: existing.email,
          address: existing.address,
          kabupatenId: existing.kabupatenId,
          kecamatan: existing.kecamatan,
          desa: existing.desa,
          latitude: existing.latitude,
          longitude: existing.longitude,
          status: 'PENDING_VERIFICATION',
          notes: existing.notes
            ? `Dari portal publik. ${existing.notes}`
            : 'Dari portal publik',
        },
      });
      createdProducerId = producer.id;
    }

    return prisma.producerRegistrationRequest.update({
      where: { id },
      data: {
        status,
        reviewedById,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes ?? null,
        createdProducerId,
      },
      include: {
        kabupaten: { select: { id: true, name: true } },
        createdProducer: { select: { id: true, registrationNumber: true } },
      },
    });
  },
};
