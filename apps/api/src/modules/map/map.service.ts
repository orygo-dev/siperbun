import { prisma } from '../../config/database';
import { dashboardService } from '../dashboard/dashboard.service';

export const mapService = {
  async markers() {
    const base = await dashboardService.distributionMap();

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
