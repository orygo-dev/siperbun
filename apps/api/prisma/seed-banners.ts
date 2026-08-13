import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const n = await prisma.dashboardBanner.count({ where: { deletedAt: null } });
  if (n > 0) {
    console.log(`Banners already exist: ${n}`);
    return;
  }
  await prisma.dashboardBanner.createMany({
    data: [
      {
        title: 'Selamat datang di SIPERBUN',
        subtitle:
          'Kelola sertifikasi bibit perkebunan secara terpadu dan terdokumentasi.',
        linkUrl: '/pengajuan',
        sortOrder: 1,
        isActive: true,
      },
      {
        title: 'Pantau pemeriksaan lapangan',
        subtitle:
          'Lihat jadwal inspeksi hari ini dan kinerja PBT secara real-time.',
        linkUrl: '/pemeriksaan',
        sortOrder: 2,
        isActive: true,
      },
      {
        title: 'Unggah scan sertifikat',
        subtitle:
          'Lengkapi proses penerbitan dengan mengunggah hasil scan sertifikat.',
        linkUrl: '/sertifikat',
        sortOrder: 3,
        isActive: true,
      },
    ],
  });
  console.log('Seeded 3 dashboard banners');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
