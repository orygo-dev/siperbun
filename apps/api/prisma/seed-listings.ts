import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.publicListing.count({
    where: { deletedAt: null },
  });
  if (existing > 0) {
    console.log(`Public listings already exist: ${existing}`);
    return;
  }

  const producers = await prisma.producer.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      status: { in: ['ACTIVE', 'VERIFIED'] },
    },
    include: {
      nurseries: {
        where: { deletedAt: null },
        take: 1,
      },
      productionBatches: {
        where: { deletedAt: null },
        include: { commodity: true, variety: true },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
    take: 8,
  });

  const commodities = await prisma.commodity.findMany({
    where: { deletedAt: null, isActive: true },
    take: 5,
  });

  if (producers.length === 0 || commodities.length === 0) {
    console.log('Skip seed listings: need producers and commodities');
    return;
  }

  let created = 0;
  for (const producer of producers) {
    const batch = producer.productionBatches[0];
    const commodity = batch?.commodity ?? commodities[created % commodities.length]!;
    const variety = batch?.variety ?? null;
    const nursery = producer.nurseries[0];

    await prisma.publicListing.create({
      data: {
        producerId: producer.id,
        nurseryId: nursery?.id ?? null,
        commodityId: commodity.id,
        varietyId: variety?.id ?? null,
        title: `Bibit ${commodity.name}${variety ? ` ${variety.name}` : ''} — ${producer.businessName}`,
        description: `Bibit ${commodity.name} dari penangkar terverifikasi ${producer.businessName}. Hubungi penangkar untuk ketersediaan dan pengambilan.`,
        availableQty: batch?.readyCount ?? batch?.activeCount ?? BigInt(500),
        unit: commodity.unit || 'batang',
        priceHint: 'Hubungi penangkar',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    created += 1;
  }

  console.log(`Seeded ${created} public listings`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
