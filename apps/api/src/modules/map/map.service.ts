import type { DashboardScope } from '../dashboard/dashboard.service';
import { dashboardService } from '../dashboard/dashboard.service';
import { prisma } from '../../config/database';

export const mapService = {
  async markers(scope: DashboardScope = { roles: [] }) {
    const base = await dashboardService.distributionMap(scope);

    // Marker pengawasan hanya untuk staf dinas (bukan penangkar)
    if (scope.producerId) {
      return base;
    }

    const circulations = await prisma.circulationInspection.findMany({
      where: {
        deletedAt: null,
        latitude: { not: null },
        longitude: { not: null },
      },
      take: 100,
      orderBy: { inspectedAt: 'desc' },
    });

    const circulationMarkers = circulations.map((c) => ({
      id: c.id,
      type: 'circulation',
      color: 'orange',
      lat: Number(c.latitude),
      lng: Number(c.longitude),
      name: c.businessName ?? c.inspectionNumber,
      locationType: 'Pengawasan Peredaran',
      locationName: c.location ?? c.inspectionNumber,
      commodity: c.commodityName ?? '-',
      kabupaten: '-',
      status: c.certificateStatus ?? 'DIKECEK',
      href: `/pengawasan/${c.id}`,
    }));

    return [...base, ...circulationMarkers];
  },
};
