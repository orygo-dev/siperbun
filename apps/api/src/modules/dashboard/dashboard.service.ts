import {
  ApplicationStatus,
  AssignmentStatus,
  CertificateStatus,
  ProductionStatus,
} from '@prisma/client';
import {
  DASHBOARD_STATUS_GROUPS,
  ROLES,
  type BannerPlacement,
} from '@siperbun/shared';
import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { prisma } from '../../config/database';
import { bannersService } from '../settings/banners.service';

const ACTIVE_PRODUCTION: ProductionStatus[] = [
  'PREPARATION',
  'SOWING',
  'GROWING',
  'READY_FOR_INSPECTION',
  'UNDER_INSPECTION',
];

export type DashboardScope = {
  roles: string[];
  producerId?: string | null;
  inspectorId?: string | null;
};

export function resolveDashboardScope(user: {
  id: string;
  roles: string[];
  producerId?: string | null;
}): DashboardScope {
  const roles = user.roles;
  if (
    roles.includes(ROLES.SUPER_ADMIN) ||
    roles.includes(ROLES.ADMIN) ||
    roles.includes(ROLES.PIMPINAN)
  ) {
    return { roles };
  }
  if (roles.includes(ROLES.PBT)) {
    return { roles, inspectorId: user.id };
  }
  if (roles.includes(ROLES.PENANGKAR)) {
    return { roles, producerId: user.producerId ?? null };
  }
  return { roles };
}

function isScopedProducer(scope: DashboardScope) {
  return Boolean(scope.producerId);
}

function isScopedInspector(scope: DashboardScope) {
  return Boolean(scope.inspectorId);
}

export const dashboardService = {
  async summary(scope: DashboardScope = { roles: [] }) {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const producerId = scope.producerId ?? undefined;
    const inspectorId = scope.inspectorId ?? undefined;

    if (inspectorId) {
      const today = new Date();
      const start = startOfDay(today);
      const end = endOfDay(today);
      const [
        todayCount,
        overdueCount,
        completedMonth,
        assignedOpen,
      ] = await Promise.all([
        prisma.fieldAssignment.count({
          where: {
            deletedAt: null,
            inspectorId,
            scheduledDate: { gte: start, lte: end },
            status: { not: AssignmentStatus.CANCELLED },
          },
        }),
        prisma.fieldAssignment.count({
          where: {
            deletedAt: null,
            inspectorId,
            scheduledDate: { lt: start },
            status: {
              in: [
                AssignmentStatus.SCHEDULED,
                AssignmentStatus.CONFIRMED,
                AssignmentStatus.EN_ROUTE,
              ],
            },
          },
        }),
        prisma.fieldAssignment.count({
          where: {
            deletedAt: null,
            inspectorId,
            status: AssignmentStatus.COMPLETED,
            updatedAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        prisma.fieldAssignment.count({
          where: {
            deletedAt: null,
            inspectorId,
            status: {
              in: [
                AssignmentStatus.SCHEDULED,
                AssignmentStatus.CONFIRMED,
                AssignmentStatus.EN_ROUTE,
                AssignmentStatus.INSPECTING,
              ],
            },
          },
        }),
      ]);

      return {
        variant: 'pbt' as const,
        activeProducers: assignedOpen,
        nurseryLocations: todayCount,
        activeBatches: overdueCount,
        activeSeedlings: completedMonth,
        applicationsThisMonth: assignedOpen,
        scannedCertificates: completedMonth,
        labels: {
          activeProducers: 'Tugas terbuka',
          nurseryLocations: 'Jadwal hari ini',
          activeBatches: 'Lewat jadwal',
          activeSeedlings: 'Selesai bulan ini',
          applicationsThisMonth: 'Tugas terbuka',
          scannedCertificates: 'Selesai bulan ini',
        },
      };
    }

    const producerFilter = producerId ? { producerId } : {};

    const [
      activeProducers,
      nurseryLocations,
      activeBatches,
      seedlingAgg,
      applicationsThisMonth,
      scannedCertificates,
    ] = await Promise.all([
      producerId
        ? Promise.resolve(1)
        : prisma.producer.count({
            where: {
              deletedAt: null,
              isActive: true,
              status: { in: ['ACTIVE', 'VERIFIED'] },
            },
          }),
      prisma.nurseryLocation.count({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          ...producerFilter,
        },
      }),
      prisma.productionBatch.count({
        where: {
          deletedAt: null,
          status: { in: ACTIVE_PRODUCTION },
          ...producerFilter,
        },
      }),
      prisma.productionBatch.aggregate({
        where: {
          deletedAt: null,
          status: { in: ACTIVE_PRODUCTION },
          ...producerFilter,
        },
        _sum: { activeCount: true },
      }),
      prisma.certificationApplication.count({
        where: {
          deletedAt: null,
          submittedAt: { gte: monthStart, lte: monthEnd },
          ...producerFilter,
        },
      }),
      prisma.certificate.count({
        where: {
          deletedAt: null,
          status: {
            in: [
              CertificateStatus.SCAN_UPLOADED,
              CertificateStatus.WAITING_VERIFICATION,
              CertificateStatus.ACTIVE,
            ],
          },
          currentFileId: { not: null },
          ...producerFilter,
        },
      }),
    ]);

    return {
      variant: producerId ? ('penangkar' as const) : ('executive' as const),
      activeProducers,
      nurseryLocations,
      activeBatches,
      activeSeedlings: Number(seedlingAgg._sum.activeCount ?? 0n),
      applicationsThisMonth,
      scannedCertificates,
      labels: producerId
        ? {
            activeProducers: 'Profil penangkar',
            nurseryLocations: 'Lokasi saya',
            activeBatches: 'Batch aktif saya',
            activeSeedlings: 'Bibit aktif saya',
            applicationsThisMonth: 'Pengajuan bulan ini',
            scannedCertificates: 'Sertifikat saya',
          }
        : {
            activeProducers: 'Penangkar Aktif',
            nurseryLocations: 'Lokasi Pembibitan',
            activeBatches: 'Batch Produksi Aktif',
            activeSeedlings: 'Bibit Aktif',
            applicationsThisMonth: 'Pengajuan Bulan Ini',
            scannedCertificates: 'Sertifikat Scan Terunggah',
          },
    };
  },

  async certificationStatus(scope: DashboardScope = { roles: [] }) {
    const producerId = scope.producerId ?? undefined;
    const inspectorId = scope.inspectorId ?? undefined;
    const rows = await prisma.certificationApplication.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
        ...(producerId ? { producerId } : {}),
        ...(inspectorId
          ? {
              assignments: {
                some: { inspectorId, deletedAt: null },
              },
            }
          : {}),
        status: {
          notIn: [
            ApplicationStatus.DRAFT,
            ApplicationStatus.REJECTED,
            ApplicationStatus.CANCELLED,
          ],
        },
      },
      _count: { _all: true },
    });

    const countByStatus = Object.fromEntries(
      rows.map((r) => [r.status, r._count._all]),
    ) as Record<string, number>;

    const items = Object.entries(DASHBOARD_STATUS_GROUPS).map(
      ([label, statuses]) => ({
        label,
        count: (statuses as readonly ApplicationStatus[]).reduce(
          (sum, s) => sum + (countByStatus[s] ?? 0),
          0,
        ),
      }),
    );

    const total = items.reduce((s, i) => s + i.count, 0);
    return { total, items };
  },

  async priorities(scope: DashboardScope = { roles: [] }) {
    const today = startOfDay(new Date());
    const inspectorId = scope.inspectorId ?? undefined;
    const producerId = scope.producerId ?? undefined;

    if (producerId) {
      const [inReview, inInspection, certificates] = await Promise.all([
        prisma.certificationApplication.count({
          where: {
            deletedAt: null,
            producerId,
            status: {
              in: [
                ApplicationStatus.SUBMITTED,
                ApplicationStatus.ADMIN_REVIEW,
                ApplicationStatus.ADMIN_REVISION_REQUIRED,
              ],
            },
          },
        }),
        prisma.certificationApplication.count({
          where: {
            deletedAt: null,
            producerId,
            status: {
              in: [
                ApplicationStatus.WAITING_ASSIGNMENT,
                ApplicationStatus.INSPECTION_SCHEDULED,
                ApplicationStatus.INSPECTION_IN_PROGRESS,
              ],
            },
          },
        }),
        prisma.certificate.count({
          where: {
            deletedAt: null,
            producerId,
            status: {
              in: [
                CertificateStatus.ISSUED_MANUALLY,
                CertificateStatus.WAITING_SCAN,
                CertificateStatus.SCAN_UPLOADED,
                CertificateStatus.WAITING_VERIFICATION,
              ],
            },
          },
        }),
      ]);

      return [
        {
          key: 'in_review',
          title: `${inReview} pengajuan sedang ditinjau admin`,
          count: inReview,
          urgency: 'medium',
          href: '/pengajuan',
          color: 'warning',
        },
        {
          key: 'inspection',
          title: `${inInspection} pengajuan dalam proses pemeriksaan`,
          count: inInspection,
          urgency: 'medium',
          href: '/pengajuan',
          color: 'info',
        },
        {
          key: 'certs',
          title: `${certificates} sertifikat belum aktif`,
          count: certificates,
          urgency: 'low',
          href: '/sertifikat',
          color: 'info',
        },
      ];
    }

    if (inspectorId) {
      const [todayCount, overdue, inProgress] = await Promise.all([
        prisma.fieldAssignment.count({
          where: {
            deletedAt: null,
            inspectorId,
            scheduledDate: {
              gte: today,
              lte: endOfDay(today),
            },
            status: { not: AssignmentStatus.CANCELLED },
          },
        }),
        prisma.fieldAssignment.count({
          where: {
            deletedAt: null,
            inspectorId,
            scheduledDate: { lt: today },
            status: {
              in: [
                AssignmentStatus.SCHEDULED,
                AssignmentStatus.CONFIRMED,
                AssignmentStatus.EN_ROUTE,
              ],
            },
          },
        }),
        prisma.fieldAssignment.count({
          where: {
            deletedAt: null,
            inspectorId,
            status: AssignmentStatus.INSPECTING,
          },
        }),
      ]);

      return [
        {
          key: 'today',
          title: `${todayCount} pemeriksaan terjadwal hari ini`,
          count: todayCount,
          urgency: 'medium',
          href: '/pemeriksaan',
          color: 'info',
        },
        {
          key: 'overdue',
          title: `${overdue} tugas melewati jadwal`,
          count: overdue,
          urgency: 'high',
          href: '/pemeriksaan',
          color: 'danger',
        },
        {
          key: 'in_progress',
          title: `${inProgress} pemeriksaan sedang berjalan`,
          count: inProgress,
          urgency: 'medium',
          href: '/pemeriksaan',
          color: 'warning',
        },
      ];
    }

    const [unverified, unassigned, overdueInspections, pendingScans] =
      await Promise.all([
        prisma.certificationApplication.count({
          where: {
            deletedAt: null,
            status: {
              in: [ApplicationStatus.SUBMITTED, ApplicationStatus.ADMIN_REVIEW],
            },
          },
        }),
        prisma.certificationApplication.count({
          where: {
            deletedAt: null,
            status: {
              in: [
                ApplicationStatus.DOCUMENT_COMPLETE,
                ApplicationStatus.WAITING_ASSIGNMENT,
              ],
            },
          },
        }),
        prisma.fieldAssignment.count({
          where: {
            deletedAt: null,
            scheduledDate: { lt: today },
            status: {
              in: [
                AssignmentStatus.SCHEDULED,
                AssignmentStatus.CONFIRMED,
                AssignmentStatus.EN_ROUTE,
              ],
            },
          },
        }),
        prisma.certificate.count({
          where: {
            deletedAt: null,
            status: {
              in: [
                CertificateStatus.ISSUED_MANUALLY,
                CertificateStatus.WAITING_SCAN,
              ],
            },
          },
        }),
      ]);

    return [
      {
        key: 'unverified',
        title: `${unverified} pengajuan belum diverifikasi`,
        count: unverified,
        urgency: 'high',
        href: '/pengajuan?status=ADMIN_REVIEW',
        color: 'danger',
      },
      {
        key: 'unassigned',
        title: `${unassigned} permohonan belum ditugaskan ke PBT`,
        count: unassigned,
        urgency: 'medium',
        href: '/pengajuan?status=WAITING_ASSIGNMENT',
        color: 'warning',
      },
      {
        key: 'overdue',
        title: `${overdueInspections} pemeriksaan melewati jadwal`,
        count: overdueInspections,
        urgency: 'high',
        href: '/pemeriksaan',
        color: 'danger',
      },
      {
        key: 'pending_scan',
        title: `${pendingScans} scan sertifikat belum diunggah`,
        count: pendingScans,
        urgency: 'medium',
        href: '/sertifikat?status=WAITING_SCAN',
        color: 'info',
      },
    ];
  },

  async productionByCommodity(scope: DashboardScope = { roles: [] }) {
    const producerId = scope.producerId ?? undefined;
    const inspectorId = scope.inspectorId ?? undefined;
    const grouped = await prisma.productionBatch.groupBy({
      by: ['commodityId'],
      where: {
        deletedAt: null,
        status: { in: ACTIVE_PRODUCTION },
        ...(producerId ? { producerId } : {}),
        ...(inspectorId
          ? {
              producer: {
                applications: {
                  some: {
                    deletedAt: null,
                    assignments: {
                      some: { inspectorId, deletedAt: null },
                    },
                  },
                },
              },
            }
          : {}),
      },
      _sum: { activeCount: true },
    });

    if (grouped.length === 0) return [];

    const commodities = await prisma.commodity.findMany({
      where: { id: { in: grouped.map((g) => g.commodityId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(commodities.map((c) => [c.id, c.name]));

    return grouped
      .map((g) => ({
        name: nameById.get(g.commodityId) ?? g.commodityId,
        value: Number(g._sum.activeCount ?? 0),
      }))
      .sort((a, b) => b.value - a.value);
  },

  async distributionMap(scope: DashboardScope = { roles: [] }) {
    const producerId = scope.producerId ?? undefined;
    const inspectorId = scope.inspectorId ?? undefined;
    const assignedProducer = inspectorId
      ? {
          producer: {
            applications: {
              some: {
                deletedAt: null,
                assignments: { some: { inspectorId, deletedAt: null } },
              },
            },
          },
        }
      : {};

    const [nurseries, gardens] = await Promise.all([
      prisma.nurseryLocation.findMany({
        where: {
          deletedAt: null,
          latitude: { not: null },
          longitude: { not: null },
          ...(producerId ? { producerId } : {}),
          ...assignedProducer,
        },
        include: {
          producer: { select: { businessName: true } },
          commodity: { select: { name: true } },
          region: { select: { name: true } },
        },
        take: 200,
      }),
      prisma.seedGarden.findMany({
        where: {
          deletedAt: null,
          latitude: { not: null },
          longitude: { not: null },
          ...(producerId ? { producerId } : {}),
          ...assignedProducer,
        },
        include: {
          producer: { select: { businessName: true } },
          commodity: { select: { name: true } },
          region: { select: { name: true } },
        },
        take: 50,
      }),
    ]);

    const nurseryMarkers = nurseries.map((n) => ({
      id: n.id,
      type:
        n.markerType === 'NURSERY_FINDING'
          ? 'finding'
          : n.markerType === 'NURSERY_PROCESS'
            ? 'process'
            : 'active',
      color:
        n.markerType === 'NURSERY_FINDING'
          ? 'red'
          : n.markerType === 'NURSERY_PROCESS'
            ? 'yellow'
            : 'green',
      lat: Number(n.latitude),
      lng: Number(n.longitude),
      name: n.producer.businessName,
      locationType: 'Lokasi Pembibitan',
      locationName: n.name,
      commodity: n.commodity?.name ?? '-',
      kabupaten: n.region?.name ?? '-',
      status: n.status,
      href: `/lokasi-pembibitan/${n.id}`,
    }));

    const gardenMarkers = gardens.map((g) => ({
      id: g.id,
      type: 'seed_garden',
      color: 'blue',
      lat: Number(g.latitude),
      lng: Number(g.longitude),
      name: g.producer?.businessName ?? g.ownerName ?? g.name,
      locationType: 'Kebun Sumber',
      locationName: g.name,
      commodity: g.commodity.name,
      kabupaten: g.region?.name ?? '-',
      status: g.status,
      href: `/kebun-sumber/${g.id}`,
    }));

    return [...nurseryMarkers, ...gardenMarkers];
  },

  async todayInspections(scope: DashboardScope = { roles: [] }) {
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);
    const inspectorId = scope.inspectorId ?? undefined;
    const producerId = scope.producerId ?? undefined;

    const rows = await prisma.fieldAssignment.findMany({
      where: {
        deletedAt: null,
        scheduledDate: { gte: start, lte: end },
        status: { not: AssignmentStatus.CANCELLED },
        ...(inspectorId ? { inspectorId } : {}),
        ...(producerId
          ? { application: { producerId } }
          : {}),
      },
      include: {
        inspector: { select: { name: true } },
        application: {
          include: {
            producer: { select: { businessName: true } },
            commodity: { select: { name: true } },
            nursery: {
              include: { region: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    return rows.map((r) => ({
      id: r.id,
      time: r.scheduledTime ?? '-',
      commodity: r.application.commodity.name,
      producer: r.application.producer.businessName,
      kabupaten:
        r.application.nursery?.region?.name ?? r.locationNotes ?? '-',
      inspector: r.inspector.name,
      status: r.status,
      href: `/pemeriksaan/${r.id}`,
    }));
  },

  async inspectorPerformance(scope: DashboardScope = { roles: [] }) {
    if (isScopedProducer(scope)) return [];

    const inspectorFilter = scope.inspectorId
      ? { id: scope.inspectorId }
      : {
          userRoles: { some: { role: { slug: 'PBT' } } },
        };

    const inspectors = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...inspectorFilter,
      },
      select: { id: true, name: true },
      take: 20,
    });

    if (inspectors.length === 0) return [];

    const inspectorIds = inspectors.map((u) => u.id);

    const [totals, completedRows] = await Promise.all([
      prisma.fieldAssignment.groupBy({
        by: ['inspectorId'],
        where: {
          deletedAt: null,
          inspectorId: { in: inspectorIds },
        },
        _count: { _all: true },
      }),
      prisma.fieldAssignment.groupBy({
        by: ['inspectorId'],
        where: {
          deletedAt: null,
          inspectorId: { in: inspectorIds },
          status: AssignmentStatus.COMPLETED,
        },
        _count: { _all: true },
      }),
    ]);

    const totalById = new Map(
      totals.map((r) => [r.inspectorId, r._count._all]),
    );
    const completedById = new Map(
      completedRows.map((r) => [r.inspectorId, r._count._all]),
    );

    return inspectors
      .map((u) => {
        const total = totalById.get(u.id) ?? 0;
        const completed = completedById.get(u.id) ?? 0;
        const completionRate =
          total === 0 ? 0 : Math.round((completed / total) * 100);
        return {
          id: u.id,
          name: u.name,
          inspectionCount: total,
          completedCount: completed,
          completionRate,
        };
      })
      .sort((a, b) => b.inspectionCount - a.inspectionCount)
      .slice(0, 5);
  },

  async recentApplications(scope: DashboardScope = { roles: [] }) {
    const producerId = scope.producerId ?? undefined;
    const inspectorId = scope.inspectorId ?? undefined;

    const rows = await prisma.certificationApplication.findMany({
      where: {
        deletedAt: null,
        status: { not: ApplicationStatus.DRAFT },
        ...(producerId ? { producerId } : {}),
        ...(inspectorId
          ? {
              assignments: {
                some: { inspectorId, deletedAt: null },
              },
            }
          : {}),
      },
      include: {
        producer: { select: { businessName: true } },
        commodity: { select: { name: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 10,
    });

    return rows.map((r) => ({
      id: r.id,
      applicationNumber: r.applicationNumber,
      producer: r.producer.businessName,
      commodity: r.commodity.name,
      seedlingCount: Number(r.seedlingCount),
      status: r.status,
      submittedAt: r.submittedAt
        ? format(r.submittedAt, 'd MMMM yyyy', { locale: localeId })
        : '-',
      href: `/pengajuan/${r.id}`,
    }));
  },

  async certificateScans(scope: DashboardScope = { roles: [] }) {
    if (isScopedInspector(scope) || isScopedProducer(scope)) {
      const producerId = scope.producerId ?? undefined;
      if (!producerId) {
        return {
          issued: 0,
          uploaded: 0,
          pendingUpload: 0,
          verified: 0,
          verifiedPercent: 0,
        };
      }
      const [issued, uploaded, pendingUpload, verified] = await Promise.all([
        prisma.certificate.count({
          where: { deletedAt: null, producerId },
        }),
        prisma.certificate.count({
          where: {
            deletedAt: null,
            producerId,
            currentFileId: { not: null },
          },
        }),
        prisma.certificate.count({
          where: {
            deletedAt: null,
            producerId,
            status: {
              in: [
                CertificateStatus.ISSUED_MANUALLY,
                CertificateStatus.WAITING_SCAN,
              ],
            },
          },
        }),
        prisma.certificate.count({
          where: {
            deletedAt: null,
            producerId,
            status: CertificateStatus.ACTIVE,
          },
        }),
      ]);
      return {
        issued,
        uploaded,
        pendingUpload,
        verified,
        verifiedPercent: issued === 0 ? 0 : Math.round((verified / issued) * 100),
      };
    }

    const [issued, uploaded, pendingUpload, verified] = await Promise.all([
      prisma.certificate.count({
        where: {
          deletedAt: null,
          status: {
            in: [
              CertificateStatus.ISSUED_MANUALLY,
              CertificateStatus.WAITING_SCAN,
              CertificateStatus.SCAN_UPLOADED,
              CertificateStatus.WAITING_VERIFICATION,
              CertificateStatus.ACTIVE,
            ],
          },
        },
      }),
      prisma.certificate.count({
        where: {
          deletedAt: null,
          currentFileId: { not: null },
          status: {
            in: [
              CertificateStatus.SCAN_UPLOADED,
              CertificateStatus.WAITING_VERIFICATION,
              CertificateStatus.ACTIVE,
            ],
          },
        },
      }),
      prisma.certificate.count({
        where: {
          deletedAt: null,
          status: {
            in: [
              CertificateStatus.ISSUED_MANUALLY,
              CertificateStatus.WAITING_SCAN,
            ],
          },
        },
      }),
      prisma.certificate.count({
        where: {
          deletedAt: null,
          status: CertificateStatus.ACTIVE,
        },
      }),
    ]);

    const verifiedPercent =
      issued === 0 ? 0 : Math.round((verified / issued) * 100);

    return {
      issued,
      uploaded,
      pendingUpload,
      verified,
      verifiedPercent,
    };
  },

  async recentActivities(scope: DashboardScope = { roles: [] }) {
    const inspectorId = scope.inspectorId ?? undefined;
    const producerId = scope.producerId ?? undefined;

    // Penangkar: hanya aktivitas terkait entity milik sendiri (jika tercatat)
    // PBT: aktivitas yang dibuat oleh dirinya
    const rows = await prisma.activityLog.findMany({
      where: inspectorId
        ? { userId: inspectorId }
        : producerId
          ? {
              OR: [
                { entityType: 'Producer', entityId: producerId },
                {
                  entityType: {
                    in: [
                      'CertificationApplication',
                      'ProductionBatch',
                      'Certificate',
                      'NurseryLocation',
                    ],
                  },
                },
              ],
            }
          : undefined,
      orderBy: { createdAt: 'desc' },
      take: producerId ? 30 : 10,
      include: { user: { select: { name: true } } },
    });

    const limited = producerId ? rows.slice(0, 10) : rows;

    return limited.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      user: r.user?.name,
      createdAt: r.createdAt,
      relative: formatRelativeId(r.createdAt),
    }));
  },

  async seedDistributionsSummary(scope: DashboardScope = { roles: [] }) {
    if (isScopedInspector(scope)) {
      return {
        totalQuantity: 0,
        totalTransactions: 0,
        thisYearQuantity: 0,
        producerCount: 0,
        districts: [],
        recent: [],
      };
    }
    const producerId = scope.producerId ?? undefined;
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const where = {
      deletedAt: null,
      ...(producerId ? { producerId } : {}),
    };

    const [agg, yearAgg, grouped, producerGroups, recent] = await Promise.all([
      prisma.seedDistribution.aggregate({
        where,
        _sum: { quantity: true },
        _count: { _all: true },
      }),
      prisma.seedDistribution.aggregate({
        where: { ...where, distributedAt: { gte: yearStart } },
        _sum: { quantity: true },
      }),
      prisma.seedDistribution.groupBy({
        by: ['destinationKab'],
        where,
        _sum: { quantity: true },
        _count: { _all: true },
      }),
      prisma.seedDistribution.groupBy({
        by: ['producerId'],
        where,
      }),
      prisma.seedDistribution.findMany({
        where,
        include: {
          producer: { select: { businessName: true } },
        },
        orderBy: { distributedAt: 'desc' },
        take: 6,
      }),
    ]);

    return {
      totalQuantity: Number(agg._sum.quantity ?? 0),
      totalTransactions: agg._count._all,
      thisYearQuantity: Number(yearAgg._sum.quantity ?? 0),
      producerCount: producerGroups.length,
      districts: grouped
        .filter((g) => Boolean(g.destinationKab))
        .map((g) => ({
          name: String(g.destinationKab),
          quantity: Number(g._sum.quantity ?? 0),
          count: g._count._all,
        }))
        .sort((a, b) => b.quantity - a.quantity),
      recent: recent.map((r) => ({
        id: r.id,
        buyerName: r.buyerName,
        producer: r.producer.businessName,
        destinationKab: r.destinationKab,
        quantity: Number(r.quantity),
        distributedAt: r.distributedAt.toISOString(),
      })),
    };
  },

  async banners(placement?: BannerPlacement) {
    return bannersService.listActive(placement);
  },
};

function formatRelativeId(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return format(date, 'd MMM yyyy', { locale: localeId });
}
