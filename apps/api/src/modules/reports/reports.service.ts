import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';

export type ReportFilters = {
  dateFrom?: string;
  dateTo?: string;
  year?: string | number;
  regionId?: string;
  kabupatenId?: string;
  commodityId?: string;
  producerId?: string;
  status?: string;
  page?: number;
  limit?: number;
};

function dateRange(filters: ReportFilters) {
  if (filters.dateFrom || filters.dateTo) {
    return {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  }
  if (filters.year) {
    const y = Number(filters.year);
    return {
      gte: new Date(`${y}-01-01`),
      lte: new Date(`${y}-12-31T23:59:59`),
    };
  }
  return undefined;
}

function paginate(filters: ReportFilters) {
  const page = Math.max(1, Number(filters.page ?? 1));
  const limit = Math.min(500, Math.max(1, Number(filters.limit ?? 50)));
  return { page, limit, skip: (page - 1) * limit };
}

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(
  headers: Array<{ key: string; label: string }>,
  rows: Array<Record<string, unknown>>,
) {
  const lines = [
    headers.map((h) => csvEscape(h.label)).join(','),
    ...rows.map((row) =>
      headers.map((h) => csvEscape(row[h.key])).join(','),
    ),
  ];
  return `\uFEFF${lines.join('\r\n')}`;
}

export const reportsService = {
  async summary(filters: ReportFilters) {
    const range = dateRange(filters);
    const [
      producers,
      batches,
      applications,
      inspections,
      certificates,
      distributions,
      circulation,
      labels,
    ] = await Promise.all([
      prisma.producer.count({
        where: {
          deletedAt: null,
          ...(filters.regionId || filters.kabupatenId
            ? { kabupatenId: filters.regionId ?? filters.kabupatenId }
            : {}),
          ...(filters.status ? { status: filters.status as never } : {}),
        },
      }),
      prisma.productionBatch.count({
        where: {
          deletedAt: null,
          ...(range ? { createdAt: range } : {}),
          ...(filters.commodityId ? { commodityId: filters.commodityId } : {}),
          ...(filters.producerId ? { producerId: filters.producerId } : {}),
        },
      }),
      prisma.certificationApplication.count({
        where: {
          deletedAt: null,
          ...(range ? { submittedAt: range } : {}),
          ...(filters.commodityId ? { commodityId: filters.commodityId } : {}),
          ...(filters.producerId ? { producerId: filters.producerId } : {}),
          ...(filters.status ? { status: filters.status as never } : {}),
        },
      }),
      prisma.fieldInspection.count({
        where: {
          deletedAt: null,
          ...(range ? { createdAt: range } : {}),
        },
      }),
      prisma.certificate.count({
        where: {
          deletedAt: null,
          ...(range ? { issuedAt: range } : {}),
          ...(filters.producerId ? { producerId: filters.producerId } : {}),
          ...(filters.status ? { status: filters.status as never } : {}),
        },
      }),
      prisma.seedDistribution.count({
        where: {
          deletedAt: null,
          ...(range ? { distributedAt: range } : {}),
          ...(filters.producerId ? { producerId: filters.producerId } : {}),
        },
      }),
      prisma.circulationInspection.count({
        where: {
          deletedAt: null,
          ...(range ? { inspectedAt: range } : {}),
        },
      }),
      prisma.seedLabel.count({ where: { deletedAt: null } }),
    ]);

    return {
      producers,
      productionBatches: batches,
      applications,
      fieldInspections: inspections,
      certificates,
      seedDistributions: distributions,
      circulationInspections: circulation,
      seedLabels: labels,
    };
  },

  async producers(filters: ReportFilters) {
    const { page, limit, skip } = paginate(filters);
    const where: Prisma.ProducerWhereInput = {
      deletedAt: null,
      ...(filters.regionId || filters.kabupatenId
        ? { kabupatenId: filters.regionId ?? filters.kabupatenId }
        : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.producerId ? { id: filters.producerId } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.producer.count({ where }),
      prisma.producer.findMany({
        where,
        include: {
          kabupaten: { select: { id: true, name: true, code: true } },
          _count: {
            select: {
              nurseries: true,
              certificates: true,
              applications: true,
            },
          },
        },
        orderBy: { businessName: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    const rows = items.map((p) => ({
      id: p.id,
      registrationNumber: p.registrationNumber,
      businessName: p.businessName,
      ownerName: p.ownerName,
      kabupaten: p.kabupaten?.name ?? '-',
      status: p.status,
      nurseryCount: p._count.nurseries,
      applicationCount: p._count.applications,
      certificateCount: p._count.certificates,
      phone: p.phone,
    }));

    return {
      items: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      columns: [
        { key: 'registrationNumber', label: 'No. Registrasi' },
        { key: 'businessName', label: 'Nama Usaha' },
        { key: 'ownerName', label: 'Penanggung Jawab' },
        { key: 'kabupaten', label: 'Kabupaten' },
        { key: 'status', label: 'Status' },
        { key: 'nurseryCount', label: 'Lokasi Pembibitan' },
        { key: 'applicationCount', label: 'Pengajuan' },
        { key: 'certificateCount', label: 'Sertifikat' },
        { key: 'phone', label: 'Telepon' },
      ],
    };
  },

  async production(filters: ReportFilters) {
    const { page, limit, skip } = paginate(filters);
    const range = dateRange(filters);
    const where: Prisma.ProductionBatchWhereInput = {
      deletedAt: null,
      ...(range ? { createdAt: range } : {}),
      ...(filters.commodityId ? { commodityId: filters.commodityId } : {}),
      ...(filters.producerId ? { producerId: filters.producerId } : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.productionBatch.count({ where }),
      prisma.productionBatch.findMany({
        where,
        include: {
          producer: { select: { businessName: true } },
          commodity: { select: { name: true } },
          variety: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const rows = items.map((b) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      producer: b.producer.businessName,
      commodity: b.commodity.name,
      variety: b.variety?.name ?? '-',
      initialCount: Number(b.initialCount),
      activeCount: Number(b.activeCount),
      status: b.status,
      startedAt: b.startedAt
        ? b.startedAt.toISOString().slice(0, 10)
        : '-',
      createdAt: b.createdAt.toISOString().slice(0, 10),
    }));

    return {
      items: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      columns: [
        { key: 'batchNumber', label: 'No. Batch' },
        { key: 'producer', label: 'Penangkar' },
        { key: 'commodity', label: 'Komoditas' },
        { key: 'variety', label: 'Varietas' },
        { key: 'initialCount', label: 'Jumlah Awal' },
        { key: 'activeCount', label: 'Jumlah Aktif' },
        { key: 'status', label: 'Status' },
        { key: 'startedAt', label: 'Mulai' },
        { key: 'createdAt', label: 'Dibuat' },
      ],
    };
  },

  async applications(filters: ReportFilters) {
    const { page, limit, skip } = paginate(filters);
    const range = dateRange(filters);
    const where: Prisma.CertificationApplicationWhereInput = {
      deletedAt: null,
      ...(range ? { submittedAt: range } : {}),
      ...(filters.commodityId ? { commodityId: filters.commodityId } : {}),
      ...(filters.producerId ? { producerId: filters.producerId } : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.certificationApplication.count({ where }),
      prisma.certificationApplication.findMany({
        where,
        include: {
          producer: { select: { businessName: true } },
          commodity: { select: { name: true } },
          variety: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const rows = items.map((a) => ({
      id: a.id,
      applicationNumber: a.applicationNumber,
      producer: a.producer.businessName,
      commodity: a.commodity.name,
      variety: a.variety?.name ?? '-',
      seedlingCount: Number(a.seedlingCount),
      status: a.status,
      submittedAt: a.submittedAt
        ? a.submittedAt.toISOString().slice(0, 10)
        : '-',
    }));

    return {
      items: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      columns: [
        { key: 'applicationNumber', label: 'No. Pengajuan' },
        { key: 'producer', label: 'Penangkar' },
        { key: 'commodity', label: 'Komoditas' },
        { key: 'variety', label: 'Varietas' },
        { key: 'seedlingCount', label: 'Jumlah Bibit' },
        { key: 'status', label: 'Status' },
        { key: 'submittedAt', label: 'Tanggal Ajuan' },
      ],
    };
  },

  async inspections(filters: ReportFilters) {
    const { page, limit, skip } = paginate(filters);
    const range = dateRange(filters);
    const where: Prisma.FieldInspectionWhereInput = {
      deletedAt: null,
      ...(range ? { createdAt: range } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.fieldInspection.count({ where }),
      prisma.fieldInspection.findMany({
        where,
        include: {
          inspector: { select: { name: true } },
          assignment: {
            include: {
              application: {
                include: {
                  producer: { select: { businessName: true } },
                  commodity: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const rows = items.map((i) => ({
      id: i.id,
      applicationNumber:
        i.assignment?.application?.applicationNumber ?? '-',
      producer: i.assignment?.application?.producer?.businessName ?? '-',
      commodity: i.assignment?.application?.commodity?.name ?? '-',
      inspector: i.inspector?.name ?? '-',
      isFinalized: i.isFinalized ? 'Ya' : 'Tidak',
      conclusion: i.conclusion ?? '-',
      startedAt: i.startedAt
        ? i.startedAt.toISOString().slice(0, 10)
        : '-',
      finishedAt: i.finishedAt
        ? i.finishedAt.toISOString().slice(0, 10)
        : '-',
    }));

    return {
      items: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      columns: [
        { key: 'applicationNumber', label: 'No. Pengajuan' },
        { key: 'producer', label: 'Penangkar' },
        { key: 'commodity', label: 'Komoditas' },
        { key: 'inspector', label: 'PBT' },
        { key: 'isFinalized', label: 'Final' },
        { key: 'conclusion', label: 'Kesimpulan' },
        { key: 'startedAt', label: 'Mulai' },
        { key: 'finishedAt', label: 'Selesai' },
      ],
    };
  },

  async certificates(filters: ReportFilters) {
    const { page, limit, skip } = paginate(filters);
    const range = dateRange(filters);
    const where: Prisma.CertificateWhereInput = {
      deletedAt: null,
      ...(range ? { issuedAt: range } : {}),
      ...(filters.producerId ? { producerId: filters.producerId } : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.certificate.count({ where }),
      prisma.certificate.findMany({
        where,
        include: {
          producer: { select: { businessName: true } },
          application: {
            include: { commodity: { select: { name: true } } },
          },
        },
        orderBy: { issuedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const rows = items.map((c) => ({
      id: c.id,
      certificateNumber: c.certificateNumber,
      producer: c.producer.businessName,
      commodity: c.application?.commodity?.name ?? '-',
      certifiedCount: Number(c.certifiedCount),
      status: c.status,
      issuedAt: c.issuedAt ? c.issuedAt.toISOString().slice(0, 10) : '-',
      expiresAt: c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : '-',
    }));

    return {
      items: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      columns: [
        { key: 'certificateNumber', label: 'No. Sertifikat' },
        { key: 'producer', label: 'Penangkar' },
        { key: 'commodity', label: 'Komoditas' },
        { key: 'certifiedCount', label: 'Jumlah' },
        { key: 'status', label: 'Status' },
        { key: 'issuedAt', label: 'Terbit' },
        { key: 'expiresAt', label: 'Berlaku Hingga' },
      ],
    };
  },

  async distributions(filters: ReportFilters) {
    const { page, limit, skip } = paginate(filters);
    const range = dateRange(filters);
    const where: Prisma.SeedDistributionWhereInput = {
      deletedAt: null,
      ...(range ? { distributedAt: range } : {}),
      ...(filters.producerId ? { producerId: filters.producerId } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.seedDistribution.count({ where }),
      prisma.seedDistribution.findMany({
        where,
        include: {
          producer: { select: { businessName: true } },
          certificate: { select: { certificateNumber: true } },
        },
        orderBy: { distributedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const rows = items.map((d) => ({
      id: d.id,
      producer: d.producer.businessName,
      certificate: d.certificate?.certificateNumber ?? '-',
      buyerName: d.buyerName,
      destinationKab: d.destinationKab ?? '-',
      quantity: Number(d.quantity),
      distributedAt: d.distributedAt.toISOString().slice(0, 10),
      deliveryNoteNo: d.deliveryNoteNo ?? '-',
    }));

    return {
      items: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      columns: [
        { key: 'producer', label: 'Penangkar' },
        { key: 'certificate', label: 'Sertifikat' },
        { key: 'buyerName', label: 'Pembeli' },
        { key: 'destinationKab', label: 'Kab. Tujuan' },
        { key: 'quantity', label: 'Jumlah' },
        { key: 'distributedAt', label: 'Tanggal' },
        { key: 'deliveryNoteNo', label: 'No. Surat Jalan' },
      ],
    };
  },

  async circulation(filters: ReportFilters) {
    const { page, limit, skip } = paginate(filters);
    const range = dateRange(filters);
    const where: Prisma.CirculationInspectionWhereInput = {
      deletedAt: null,
      ...(range ? { inspectedAt: range } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.circulationInspection.count({ where }),
      prisma.circulationInspection.findMany({
        where,
        include: { _count: { select: { findings: true } } },
        orderBy: { inspectedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const rows = items.map((c) => ({
      id: c.id,
      inspectionNumber: c.inspectionNumber,
      inspectorName: c.inspectorName ?? '-',
      businessName: c.businessName ?? '-',
      location: c.location ?? '-',
      commodityName: c.commodityName ?? '-',
      seedlingCount: c.seedlingCount != null ? Number(c.seedlingCount) : 0,
      certificateNumber: c.certificateNumber ?? '-',
      findingCount: c._count.findings,
      inspectedAt: c.inspectedAt.toISOString().slice(0, 10),
    }));

    return {
      items: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      columns: [
        { key: 'inspectionNumber', label: 'No. Pengawasan' },
        { key: 'inspectorName', label: 'Petugas' },
        { key: 'businessName', label: 'Usaha' },
        { key: 'location', label: 'Lokasi' },
        { key: 'commodityName', label: 'Komoditas' },
        { key: 'seedlingCount', label: 'Jumlah Bibit' },
        { key: 'certificateNumber', label: 'No. Sertifikat' },
        { key: 'findingCount', label: 'Temuan' },
        { key: 'inspectedAt', label: 'Tanggal' },
      ],
    };
  },

  async pbtPerformance(filters: ReportFilters) {
    const range = dateRange(filters);
    const assignments = await prisma.fieldAssignment.findMany({
      where: {
        deletedAt: null,
        ...(range ? { scheduledDate: range } : {}),
      },
      include: {
        inspector: { select: { id: true, name: true, email: true } },
        inspection: {
          select: { id: true, isFinalized: true, conclusion: true },
        },
      },
    });

    const map = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        assigned: number;
        completed: number;
        finalized: number;
      }
    >();

    for (const a of assignments) {
      const key = a.inspectorId;
      if (!map.has(key)) {
        map.set(key, {
          id: a.inspector.id,
          name: a.inspector.name,
          email: a.inspector.email,
          assigned: 0,
          completed: 0,
          finalized: 0,
        });
      }
      const row = map.get(key)!;
      row.assigned += 1;
      if (a.status === 'COMPLETED') row.completed += 1;
      if (a.inspection?.isFinalized) row.finalized += 1;
    }

    const items = [...map.values()].map((r) => ({
      ...r,
      completionRate:
        r.assigned > 0
          ? Math.round((r.completed / r.assigned) * 100)
          : 0,
    }));

    return {
      items,
      meta: {
        page: 1,
        limit: items.length,
        total: items.length,
        totalPages: 1,
      },
      columns: [
        { key: 'name', label: 'Nama PBT' },
        { key: 'email', label: 'Email' },
        { key: 'assigned', label: 'Ditugaskan' },
        { key: 'completed', label: 'Selesai' },
        { key: 'finalized', label: 'Difinalisasi' },
        { key: 'completionRate', label: 'Persentase Selesai (%)' },
      ],
    };
  },

  async getByType(type: string, filters: ReportFilters) {
    switch (type) {
      case 'producers':
        return this.producers(filters);
      case 'production':
        return this.production(filters);
      case 'applications':
        return this.applications(filters);
      case 'inspections':
        return this.inspections(filters);
      case 'certificates':
        return this.certificates(filters);
      case 'distributions':
        return this.distributions(filters);
      case 'circulation':
        return this.circulation(filters);
      case 'pbt-performance':
        return this.pbtPerformance(filters);
      default:
        throw new AppError('Jenis laporan tidak dikenal', 404);
    }
  },
};
