import {
  type ProducerCreateInput,
  type ProducerUpdateInput,
  ProducerStatus,
} from '@siperbun/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';

function serializeProducer<T extends Record<string, unknown>>(p: T) {
  const row = p as T & {
    productionCapacity?: bigint | null;
    latitude?: { toString(): string } | null;
    longitude?: { toString(): string } | null;
  };
  return {
    ...row,
    productionCapacity:
      row.productionCapacity != null ? Number(row.productionCapacity) : null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
  };
}

async function nextRegistrationNumber() {
  const year = new Date().getFullYear();
  const prefix = `PBR-${year}-`;
  const latest = await prisma.producer.findFirst({
    where: { registrationNumber: { startsWith: prefix } },
    orderBy: { registrationNumber: 'desc' },
    select: { registrationNumber: true },
  });
  let seq = 1;
  if (latest?.registrationNumber) {
    const part = latest.registrationNumber.split('-').pop();
    const n = Number(part);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export const producersService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    kabupatenId?: string;
    isActive?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = String(query.search ?? '').trim();
    const sortBy = query.sortBy ?? 'businessName';
    const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

    const allowedSort = new Set([
      'businessName',
      'registrationNumber',
      'ownerName',
      'status',
      'createdAt',
    ]);
    const orderField = allowedSort.has(sortBy) ? sortBy : 'businessName';

    const where: Prisma.ProducerWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { businessName: { contains: search } },
              { registrationNumber: { contains: search } },
              { ownerName: { contains: search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status as ProducerStatus } : {}),
      ...(query.kabupatenId ? { kabupatenId: query.kabupatenId } : {}),
      ...(query.isActive === 'true'
        ? { isActive: true }
        : query.isActive === 'false'
          ? { isActive: false }
          : {}),
    };

    const [total, items] = await Promise.all([
      prisma.producer.count({ where }),
      prisma.producer.findMany({
        where,
        include: {
          kabupaten: { select: { id: true, name: true, code: true } },
        },
        orderBy: { [orderField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((p) => serializeProducer(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const item = await prisma.producer.findFirst({
      where: { id, deletedAt: null },
      include: {
        kabupaten: true,
        nurseries: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          take: 50,
          select: {
            id: true,
            name: true,
            status: true,
            capacity: true,
            areaHa: true,
            address: true,
            landOwnershipStatus: true,
            region: { select: { id: true, name: true, code: true } },
          },
        },
        documents: {
          where: { deletedAt: null, fileId: { not: null } },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            kind: true,
            title: true,
            notes: true,
            file: {
              select: { id: true, originalName: true, mimeType: true, size: true },
            },
          },
        },
        seedGardens: {
          where: { deletedAt: null },
          take: 50,
          select: {
            id: true,
            name: true,
            status: true,
            areaHa: true,
          },
        },
      },
    });
    if (!item) throw new AppError('Penangkar tidak ditemukan', 404);

    return {
      ...serializeProducer(item),
      nurseries: item.nurseries.map((n) => ({
        ...n,
        capacity: n.capacity != null ? Number(n.capacity) : null,
        areaHa: n.areaHa != null ? Number(n.areaHa) : null,
      })),
      seedGardens: item.seedGardens.map((g) => ({
        ...g,
        areaHa: g.areaHa != null ? Number(g.areaHa) : null,
      })),
      documents: item.documents.map((document) => ({
        ...document,
        file: document.file
          ? {
              ...document.file,
              size: Number(document.file.size),
              url: `/api/v1/files/${document.file.id}`,
            }
          : null,
      })),
    };
  },

  async create(input: ProducerCreateInput) {
    const registrationNumber =
      input.registrationNumber?.trim() || (await nextRegistrationNumber());

    const existing = await prisma.producer.findFirst({
      where: { registrationNumber, deletedAt: null },
    });
    if (existing) {
      throw new AppError('Nomor registrasi sudah digunakan', 409);
    }

    const item = await prisma.producer.create({
      data: {
        registrationNumber,
        businessName: input.businessName,
        businessType: input.businessType ?? null,
        ownerName: input.ownerName,
        nik: input.nik ?? null,
        nib: input.nib ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        nurseryAddress: input.nurseryAddress ?? null,
        landOwnershipStatus: input.landOwnershipStatus ?? null,
        kabupatenId: input.kabupatenId ?? null,
        kecamatan: input.kecamatan ?? null,
        desa: input.desa ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        productionCapacity:
          input.productionCapacity != null
            ? BigInt(Math.round(input.productionCapacity))
            : null,
        status: (input.status as ProducerStatus) ?? ProducerStatus.PENDING_VERIFICATION,
        isActive: input.isActive ?? true,
        notes: input.notes ?? null,
        ...(input.nurseryAddress
          ? {
              nurseries: {
                create: {
                  name: `Lokasi Pembibitan ${input.businessName}`,
                  address: input.nurseryAddress,
                  regionId: input.nurseryKabupatenId ?? null,
                  landOwnershipStatus: input.landOwnershipStatus ?? null,
                  status: 'ACTIVE',
                },
              },
            }
          : {}),
      },
      include: {
        kabupaten: { select: { id: true, name: true, code: true } },
      },
    });

    return serializeProducer(item);
  },

  async update(id: string, input: ProducerUpdateInput) {
    const existing = await prisma.producer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Penangkar tidak ditemukan', 404);

    if (input.registrationNumber && input.registrationNumber !== existing.registrationNumber) {
      const dup = await prisma.producer.findFirst({
        where: {
          registrationNumber: input.registrationNumber,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new AppError('Nomor registrasi sudah digunakan', 409);
    }

    const item = await prisma.producer.update({
      where: { id },
      data: {
        ...(input.registrationNumber !== undefined
          ? { registrationNumber: input.registrationNumber ?? existing.registrationNumber }
          : {}),
        ...(input.businessName !== undefined ? { businessName: input.businessName } : {}),
        ...(input.businessType !== undefined ? { businessType: input.businessType } : {}),
        ...(input.ownerName !== undefined ? { ownerName: input.ownerName } : {}),
        ...(input.nik !== undefined ? { nik: input.nik } : {}),
        ...(input.nib !== undefined ? { nib: input.nib } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.nurseryAddress !== undefined
          ? { nurseryAddress: input.nurseryAddress }
          : {}),
        ...(input.landOwnershipStatus !== undefined
          ? { landOwnershipStatus: input.landOwnershipStatus }
          : {}),
        ...(input.kabupatenId !== undefined ? { kabupatenId: input.kabupatenId } : {}),
        ...(input.kecamatan !== undefined ? { kecamatan: input.kecamatan } : {}),
        ...(input.desa !== undefined ? { desa: input.desa } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.productionCapacity !== undefined
          ? {
              productionCapacity:
                input.productionCapacity != null
                  ? BigInt(Math.round(input.productionCapacity))
                  : null,
            }
          : {}),
        ...(input.status !== undefined ? { status: input.status as ProducerStatus } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: {
        kabupaten: { select: { id: true, name: true, code: true } },
      },
    });

    if (
      input.nurseryAddress !== undefined ||
      input.nurseryKabupatenId !== undefined ||
      input.landOwnershipStatus !== undefined
    ) {
      const nursery = await prisma.nurseryLocation.findFirst({
        where: { producerId: id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (nursery) {
        await prisma.nurseryLocation.update({
          where: { id: nursery.id },
          data: {
            ...(input.nurseryAddress !== undefined
              ? { address: input.nurseryAddress }
              : {}),
            ...(input.nurseryKabupatenId !== undefined
              ? { regionId: input.nurseryKabupatenId }
              : {}),
            ...(input.landOwnershipStatus !== undefined
              ? { landOwnershipStatus: input.landOwnershipStatus }
              : {}),
          },
        });
      } else if (input.nurseryAddress) {
        await prisma.nurseryLocation.create({
          data: {
            producerId: id,
            name: `Lokasi Pembibitan ${item.businessName}`,
            address: input.nurseryAddress,
            regionId: input.nurseryKabupatenId ?? null,
            landOwnershipStatus: input.landOwnershipStatus ?? null,
            status: 'ACTIVE',
          },
        });
      }
    }

    return serializeProducer(item);
  },

  async softDelete(id: string) {
    const existing = await prisma.producer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Penangkar tidak ditemukan', 404);
    await prisma.producer.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { id };
  },

  async verify(id: string) {
    const existing = await prisma.producer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Penangkar tidak ditemukan', 404);
    const item = await prisma.producer.update({
      where: { id },
      data: {
        status: ProducerStatus.ACTIVE,
        verifiedAt: new Date(),
        isActive: true,
      },
      include: {
        kabupaten: { select: { id: true, name: true, code: true } },
      },
    });
    return serializeProducer(item);
  },

  async activate(id: string) {
    const existing = await prisma.producer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Penangkar tidak ditemukan', 404);
    const item = await prisma.producer.update({
      where: { id },
      data: { isActive: true, status: ProducerStatus.ACTIVE },
      include: {
        kabupaten: { select: { id: true, name: true, code: true } },
      },
    });
    return serializeProducer(item);
  },

  async deactivate(id: string) {
    const existing = await prisma.producer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError('Penangkar tidak ditemukan', 404);
    const item = await prisma.producer.update({
      where: { id },
      data: { isActive: false, status: ProducerStatus.INACTIVE },
      include: {
        kabupaten: { select: { id: true, name: true, code: true } },
      },
    });
    return serializeProducer(item);
  },
};
