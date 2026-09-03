import type {
  ProducerRegistrationInput,
  PublicListingCreateInput,
  PublicListingUpdateInput,
} from '@siperbun/shared';
import { ROLES } from '@siperbun/shared';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/database';
import { hashPassword } from '../../utils/crypto';
import { AppError } from '../../utils/errors';
import { resolveStoragePath, saveMulterFile } from '../../utils/storage';

const registrationDocumentDefinitions = {
  businessLicense: {
    kind: 'BUSINESS_LICENSE',
    title: 'Sertifikat standar / izin usaha pembibitan benih',
  },
  landOwnershipProof: {
    kind: 'LAND_OWNERSHIP_PROOF',
    title: 'Bukti kepemilikan lahan pembibitan',
  },
  nurseryPhoto: { kind: 'NURSERY_PHOTO', title: 'Foto lahan pembibitan' },
  facilitiesPhoto: {
    kind: 'FACILITIES_PHOTO',
    title: 'Foto sarana dan prasarana pembibitan',
  },
  sourceAgreement: {
    kind: 'SOURCE_AGREEMENT',
    title: 'SPK dengan perusahaan sumber benih',
  },
  waterSourcePhoto: {
    kind: 'WATER_SOURCE_PHOTO',
    title: 'Foto sumber air',
  },
  businessRecommendation: {
    kind: 'BUSINESS_RECOMMENDATION',
    title: 'Rekomendasi izin usaha benih',
  },
  expertCertificate: {
    kind: 'EXPERT_CERTIFICATE',
    title: 'Surat / sertifikat tenaga ahli',
  },
  workforceList: { kind: 'WORKFORCE_LIST', title: 'Daftar tenaga kerja' },
} as const;

type RegistrationFileField = keyof typeof registrationDocumentDefinitions;
type RegistrationFiles = Partial<Record<RegistrationFileField, Express.Multer.File>>;

const photoRegistrationFields = new Set<RegistrationFileField>([
  'nurseryPhoto',
  'facilitiesPhoto',
  'waterSourcePhoto',
]);

const producerDocumentKinds = {
  BUSINESS_LICENSE: 'SIUP',
  LAND_OWNERSHIP_PROOF: 'SURAT_TANAH',
  NURSERY_PHOTO: 'FOTO',
  FACILITIES_PHOTO: 'FOTO',
  SOURCE_AGREEMENT: 'LAINNYA',
  WATER_SOURCE_PHOTO: 'FOTO',
  BUSINESS_RECOMMENDATION: 'SERTIFIKAT',
  EXPERT_CERTIFICATE: 'SERTIFIKAT',
  WORKFORCE_LIST: 'LAINNYA',
} as const;

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

  async getMapSummary(commodityId?: string) {
    const listingWhere = {
      deletedAt: null,
      status: 'PUBLISHED' as const,
      ...(commodityId ? { commodityId } : {}),
    };
    const [regions, producers] = await Promise.all([
      prisma.region.findMany({
        where: { type: 'KABUPATEN', deletedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true },
      }),
      prisma.producer.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          status: { in: ['ACTIVE', 'VERIFIED'] },
          publicListings: { some: listingWhere },
        },
        select: {
          id: true,
          businessName: true,
          latitude: true,
          longitude: true,
          kabupaten: { select: { id: true, name: true } },
          nurseries: {
            where: {
              deletedAt: null,
              latitude: { not: null },
              longitude: { not: null },
            },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { latitude: true, longitude: true },
          },
          publicListings: {
            where: listingWhere,
            select: { commodity: { select: { id: true, name: true } } },
          },
        },
      }),
    ]);

    const markers = producers.flatMap((producer) => {
      const fallback = producer.nurseries[0];
      const latitude = toNum(producer.latitude) ?? toNum(fallback?.latitude);
      const longitude = toNum(producer.longitude) ?? toNum(fallback?.longitude);
      if (latitude == null || longitude == null) return [];
      const commodities = [
        ...new Map(
          producer.publicListings.map((listing) => [
            listing.commodity.id,
            listing.commodity,
          ]),
        ).values(),
      ];
      return [{
        id: producer.id,
        businessName: producer.businessName,
        latitude,
        longitude,
        kabupaten: producer.kabupaten,
        commodities,
      }];
    });

    const countByRegion = new Map<string, number>();
    for (const marker of markers) {
      if (!marker.kabupaten) continue;
      countByRegion.set(
        marker.kabupaten.id,
        (countByRegion.get(marker.kabupaten.id) ?? 0) + 1,
      );
    }

    return {
      districts: regions.map((region) => ({
        ...region,
        producerCount: countByRegion.get(region.id) ?? 0,
      })),
      markers,
    };
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
          orderBy: { createdAt: 'asc' },
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
            region: { select: { id: true, name: true } },
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
      nurseryAddress: p.nurseryAddress,
      nurseryKabupaten: p.nurseries[0]?.region?.name ?? null,
      landOwnershipStatus: p.landOwnershipStatus,
      kabupaten: p.kabupaten?.name ?? null,
      kecamatan: p.kecamatan,
      desa: p.desa,
      latitude: toNum(p.latitude),
      longitude: toNum(p.longitude),
      nurseries: p.nurseries.map((n) => ({
        id: n.id,
        name: n.name,
        address: n.address,
        kabupaten: n.region?.name ?? null,
        latitude: toNum(n.latitude),
        longitude: toNum(n.longitude),
      })),
      listings: p.publicListings.map(mapListing),
    };
  },

  async submitRegistration(
    input: ProducerRegistrationInput,
    files: RegistrationFiles,
  ) {
    const missingFiles = Object.keys(registrationDocumentDefinitions).filter(
      (field) => !files[field as RegistrationFileField],
    );
    if (missingFiles.length > 0) {
      throw new AppError('Seluruh dokumen dan foto pendaftaran wajib diunggah', 422);
    }

    for (const field of photoRegistrationFields) {
      const file = files[field]!;
      if (!file.mimetype.startsWith('image/')) {
        throw new AppError(`${registrationDocumentDefinitions[field].title} wajib berupa gambar`, 422);
      }
    }

    const email = input.email.trim().toLowerCase();
    const [existingUser, existingRequest, officeKabupaten, nurseryKabupaten] = await Promise.all([
      prisma.user.findFirst({ where: { email, deletedAt: null }, select: { id: true } }),
      prisma.producerRegistrationRequest.findFirst({
        where: { email, status: { not: 'REJECTED' } },
        select: { id: true },
      }),
      prisma.region.findFirst({
        where: { id: input.kabupatenId, type: 'KABUPATEN', deletedAt: null },
        select: { id: true },
      }),
      prisma.region.findFirst({
        where: { id: input.nurseryKabupatenId, type: 'KABUPATEN', deletedAt: null },
        select: { id: true },
      }),
    ]);
    if (existingUser || existingRequest) {
      throw new AppError('Email sudah digunakan atau masih dalam proses pendaftaran', 409);
    }
    if (!officeKabupaten) throw new AppError('Kabupaten kantor tidak valid', 422);
    if (!nurseryKabupaten) {
      throw new AppError('Kabupaten lokasi pembibitan tidak valid', 422);
    }

    const passwordHash = await hashPassword(input.password);
    const row = await prisma.producerRegistrationRequest.create({
      data: {
        businessName: input.organizationName.trim(),
        ownerName: input.producerName.trim(),
        phone: input.phone.trim(),
        email,
        passwordHash,
        address: input.officeAddress.trim(),
        kabupatenId: input.kabupatenId,
        nurseryAddress: input.nurseryAddress.trim(),
        nurseryKabupatenId: input.nurseryKabupatenId,
        landOwnershipStatus: input.landOwnershipStatus,
      },
    });

    const storedFiles: Array<{ id: string; path: string }> = [];
    try {
      for (const [field, definition] of Object.entries(
        registrationDocumentDefinitions,
      ) as Array<[
        RegistrationFileField,
        (typeof registrationDocumentDefinitions)[RegistrationFileField],
      ]>) {
        const stored = await saveMulterFile(files[field]!, {
          relativeDir: path.join(
            'registrations',
            String(new Date().getFullYear()),
            row.id,
          ),
        });
        storedFiles.push({ id: stored.id, path: stored.path });
        await prisma.producerRegistrationDocument.create({
          data: {
            registrationId: row.id,
            kind: definition.kind,
            title: definition.title,
            fileId: stored.id,
          },
        });
      }
    } catch (error) {
      await prisma.producerRegistrationRequest.delete({ where: { id: row.id } });
      for (const stored of storedFiles) {
        await fs.promises.unlink(resolveStoragePath(stored.path)).catch(() => undefined);
        await prisma.storedFile.delete({ where: { id: stored.id } }).catch(() => undefined);
      }
      throw error;
    }

    return {
      id: row.id,
      status: row.status,
      message:
        'Pendaftaran diterima. Tim balai akan meninjau data dan dokumen Anda.',
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
    const rows = await prisma.producerRegistrationRequest.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessName: true,
        ownerName: true,
        phone: true,
        email: true,
        address: true,
        nurseryAddress: true,
        landOwnershipStatus: true,
        status: true,
        reviewNotes: true,
        reviewedAt: true,
        createdAt: true,
        kabupaten: { select: { id: true, name: true } },
        nurseryKabupaten: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        createdProducer: { select: { id: true, registrationNumber: true } },
        documents: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            kind: true,
            title: true,
            file: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                size: true,
              },
            },
          },
        },
      },
      take: 100,
    });
    return rows.map((row) => ({
      ...row,
      documents: row.documents.map((document) => ({
        ...document,
        file: {
          ...document.file,
          size: Number(document.file.size),
          url: `/api/v1/files/${document.file.id}`,
        },
      })),
    }));
  },

  async adminUpdateRegistrationStatus(
    id: string,
    status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED',
    reviewedById: string,
    reviewNotes?: string | null,
  ) {
    const existing = await prisma.producerRegistrationRequest.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!existing) throw new AppError('Pendaftaran tidak ditemukan', 404);

    if (status === 'APPROVED' && !existing.createdProducerId) {
      if (!existing.email) throw new AppError('Email pendaftaran tidak tersedia', 409);
      if (
        !existing.passwordHash ||
        !existing.nurseryAddress ||
        !existing.landOwnershipStatus ||
        existing.documents.length !== Object.keys(registrationDocumentDefinitions).length
      ) {
        throw new AppError(
          'Pendaftaran lama belum memiliki data atau dokumen lengkap. Minta pendaftar mengajukan ulang.',
          409,
        );
      }
      const [duplicateUser, penangkarRole] = await Promise.all([
        prisma.user.findFirst({
          where: { email: existing.email, deletedAt: null },
          select: { id: true },
        }),
        prisma.role.findUnique({ where: { slug: ROLES.PENANGKAR } }),
      ]);
      if (duplicateUser) throw new AppError('Email sudah digunakan pengguna lain', 409);
      if (!penangkarRole) throw new AppError('Role Penangkar belum tersedia', 500);

      return prisma.$transaction(async (tx) => {
        const year = new Date().getFullYear();
        const prefix = `PBR-${year}-`;
        const latest = await tx.producer.findFirst({
          where: { registrationNumber: { startsWith: prefix } },
          orderBy: { registrationNumber: 'desc' },
          select: { registrationNumber: true },
        });
        const lastSequence = Number(latest?.registrationNumber.split('-').pop() ?? 0);
        const registrationNumber = `${prefix}${String(lastSequence + 1).padStart(4, '0')}`;
        const producer = await tx.producer.create({
          data: {
            registrationNumber,
            businessName: existing.businessName,
            ownerName: existing.ownerName,
            phone: existing.phone,
            email: existing.email,
            address: existing.address,
            nurseryAddress: existing.nurseryAddress,
            landOwnershipStatus: existing.landOwnershipStatus,
            kabupatenId: existing.kabupatenId,
            kecamatan: existing.kecamatan,
            desa: existing.desa,
            latitude: existing.latitude,
            longitude: existing.longitude,
            status: 'PENDING_VERIFICATION',
            notes: 'Dibuat dari pendaftaran portal publik',
          },
        });
        const nursery = await tx.nurseryLocation.create({
          data: {
            producerId: producer.id,
            regionId: existing.nurseryKabupatenId,
            name: `Lokasi Pembibitan ${existing.businessName}`,
            address: existing.nurseryAddress,
            landOwnershipStatus: existing.landOwnershipStatus,
            status: 'ACTIVE',
          },
        });

        if (existing.documents.length > 0) {
          await tx.producerDocument.createMany({
            data: existing.documents.map((document) => ({
              producerId: producer.id,
              kind: producerDocumentKinds[document.kind],
              title: document.title,
              fileId: document.fileId,
              notes: 'Berasal dari pendaftaran portal publik',
            })),
          });
          const nurseryKinds = new Set([
            'LAND_OWNERSHIP_PROOF',
            'NURSERY_PHOTO',
            'FACILITIES_PHOTO',
            'WATER_SOURCE_PHOTO',
          ]);
          await tx.nurseryDocument.createMany({
            data: existing.documents
              .filter((document) => nurseryKinds.has(document.kind))
              .map((document) => ({
                nurseryId: nursery.id,
                kind: producerDocumentKinds[document.kind],
                title: document.title,
                fileId: document.fileId,
              })),
          });
        }

        await tx.user.create({
          data: {
            email: existing.email!,
            passwordHash: existing.passwordHash!,
            name: existing.ownerName,
            phone: existing.phone,
            producerId: producer.id,
            regionId: existing.kabupatenId,
            isActive: true,
            userRoles: { create: { roleId: penangkarRole.id } },
          },
        });

        return tx.producerRegistrationRequest.update({
          where: { id },
          data: {
            status,
            reviewedById,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes ?? null,
            createdProducerId: producer.id,
          },
          select: {
            id: true,
            status: true,
            reviewedAt: true,
            reviewNotes: true,
            kabupaten: { select: { id: true, name: true } },
            createdProducer: { select: { id: true, registrationNumber: true } },
          },
        });
      });
    }

    return prisma.producerRegistrationRequest.update({
      where: { id },
      data: {
        status,
        reviewedById,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes ?? null,
        createdProducerId: existing.createdProducerId,
      },
      select: {
        id: true,
        status: true,
        reviewedAt: true,
        reviewNotes: true,
        kabupaten: { select: { id: true, name: true } },
        createdProducer: { select: { id: true, registrationNumber: true } },
      },
    });
  },
};
