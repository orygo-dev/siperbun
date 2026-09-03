import {
  ApplicationStatus,
  AssignmentStatus,
  CertificateStatus,
  MapMarkerType,
  PrismaClient,
  ProductionStatus,
  ProducerStatus,
  RegionType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ALL_PERMISSIONS, PERMISSIONS, ROLE_PERMISSIONS, ROLES } from '@siperbun/shared';

const prisma = new PrismaClient();

const PERMISSION_META: Record<string, { name: string; module: string }> = {
  [PERMISSIONS.DASHBOARD_VIEW]: { name: 'Lihat Dashboard', module: 'dashboard' },
  [PERMISSIONS.PRODUCER_VIEW]: { name: 'Lihat Penangkar', module: 'producer' },
  [PERMISSIONS.PRODUCER_CREATE]: { name: 'Tambah Penangkar', module: 'producer' },
  [PERMISSIONS.PRODUCER_UPDATE]: { name: 'Ubah Penangkar', module: 'producer' },
  [PERMISSIONS.PRODUCER_DELETE]: { name: 'Hapus Penangkar', module: 'producer' },
  [PERMISSIONS.NURSERY_VIEW]: { name: 'Lihat Lokasi Pembibitan', module: 'nursery' },
  [PERMISSIONS.NURSERY_CREATE]: { name: 'Tambah Lokasi Pembibitan', module: 'nursery' },
  [PERMISSIONS.NURSERY_UPDATE]: { name: 'Ubah Lokasi Pembibitan', module: 'nursery' },
  [PERMISSIONS.NURSERY_DELETE]: { name: 'Hapus Lokasi Pembibitan', module: 'nursery' },
  [PERMISSIONS.SEED_GARDEN_VIEW]: { name: 'Lihat Kebun Sumber', module: 'seed-garden' },
  [PERMISSIONS.SEED_GARDEN_CREATE]: { name: 'Tambah Kebun Sumber', module: 'seed-garden' },
  [PERMISSIONS.SEED_GARDEN_UPDATE]: { name: 'Ubah Kebun Sumber', module: 'seed-garden' },
  [PERMISSIONS.SEED_GARDEN_DELETE]: { name: 'Hapus Kebun Sumber', module: 'seed-garden' },
  [PERMISSIONS.PRODUCTION_VIEW]: { name: 'Lihat Produksi', module: 'production' },
  [PERMISSIONS.PRODUCTION_CREATE]: { name: 'Tambah Produksi', module: 'production' },
  [PERMISSIONS.PRODUCTION_UPDATE]: { name: 'Ubah Produksi', module: 'production' },
  [PERMISSIONS.PRODUCTION_DELETE]: { name: 'Hapus Produksi', module: 'production' },
  [PERMISSIONS.APPLICATION_VIEW]: { name: 'Lihat Pengajuan', module: 'application' },
  [PERMISSIONS.APPLICATION_CREATE]: { name: 'Buat Pengajuan', module: 'application' },
  [PERMISSIONS.APPLICATION_VERIFY]: { name: 'Verifikasi Pengajuan', module: 'application' },
  [PERMISSIONS.APPLICATION_ASSIGN]: { name: 'Tugaskan PBT', module: 'application' },
  [PERMISSIONS.INSPECTION_VIEW]: { name: 'Lihat Pemeriksaan', module: 'inspection' },
  [PERMISSIONS.INSPECTION_EXECUTE]: { name: 'Lakukan Pemeriksaan', module: 'inspection' },
  [PERMISSIONS.INSPECTION_FINALIZE]: { name: 'Finalisasi Pemeriksaan', module: 'inspection' },
  [PERMISSIONS.CERTIFICATE_VIEW]: { name: 'Lihat Sertifikat', module: 'certificate' },
  [PERMISSIONS.CERTIFICATE_UPLOAD]: { name: 'Unggah Scan Sertifikat', module: 'certificate' },
  [PERMISSIONS.CERTIFICATE_VERIFY]: { name: 'Verifikasi Scan', module: 'certificate' },
  [PERMISSIONS.CERTIFICATE_REPLACE]: { name: 'Ganti Scan', module: 'certificate' },
  [PERMISSIONS.REPORT_VIEW]: { name: 'Lihat Laporan', module: 'report' },
  [PERMISSIONS.REPORT_EXPORT]: { name: 'Ekspor Laporan', module: 'report' },
  [PERMISSIONS.USER_MANAGE]: { name: 'Kelola Pengguna', module: 'user' },
  [PERMISSIONS.ROLE_MANAGE]: { name: 'Kelola Role', module: 'role' },
  [PERMISSIONS.AUDIT_VIEW]: { name: 'Lihat Audit Log', module: 'audit' },
};

/** Mapping permission per role — sumber: @siperbun/shared ROLE_PERMISSIONS */
const ROLE_PERMS = ROLE_PERMISSIONS;

const KABUPATEN = [
  { code: '63.01', name: 'Tanah Laut', lat: -3.8, lng: 114.75 },
  { code: '63.02', name: 'Kotabaru', lat: -3.25, lng: 116.2 },
  { code: '63.03', name: 'Banjar', lat: -3.32, lng: 114.85 },
  { code: '63.04', name: 'Barito Kuala', lat: -3.1, lng: 114.55 },
  { code: '63.05', name: 'Tapin', lat: -2.92, lng: 115.1 },
  { code: '63.06', name: 'Hulu Sungai Selatan', lat: -2.75, lng: 115.25 },
  { code: '63.07', name: 'Hulu Sungai Tengah', lat: -2.6, lng: 115.4 },
  { code: '63.08', name: 'Hulu Sungai Utara', lat: -2.45, lng: 115.15 },
  { code: '63.09', name: 'Tabalong', lat: -2.15, lng: 115.45 },
  { code: '63.10', name: 'Tanah Bumbu', lat: -3.45, lng: 115.75 },
  { code: '63.11', name: 'Balangan', lat: -2.35, lng: 115.55 },
  { code: '63.71', name: 'Banjarmasin', lat: -3.32, lng: 114.59 },
  { code: '63.72', name: 'Banjarbaru', lat: -3.44, lng: 114.83 },
];

const COMMODITIES = [
  { code: 'SAWIT', name: 'Sawit', scientificName: 'Elaeis guineensis' },
  { code: 'KARET', name: 'Karet', scientificName: 'Hevea brasiliensis' },
  { code: 'KAKAO', name: 'Kakao', scientificName: 'Theobroma cacao' },
  { code: 'KOPI', name: 'Kopi', scientificName: 'Coffea sp.' },
  { code: 'KELAPA', name: 'Kelapa', scientificName: 'Cocos nucifera' },
  { code: 'LADA', name: 'Lada', scientificName: 'Piper nigrum' },
];

const NAMED_PRODUCERS = [
  { reg: 'PNK-2020-0001', name: 'CV Banua Bibit', owner: 'H. Syamsudin', kab: 'Banjar', lat: -3.28, lng: 114.9 },
  { reg: 'PNK-2020-0002', name: 'KT Harapan', owner: 'Samsul Bahri', kab: 'Tanah Laut', lat: -3.75, lng: 114.8 },
  { reg: 'PNK-2021-0003', name: 'UD Kakao Jaya', owner: 'Rina Marlina', kab: 'Tapin', lat: -2.95, lng: 115.12 },
  { reg: 'PNK-2021-0004', name: 'UD Kopi Lestari', owner: 'Bambang Sutrisno', kab: 'Hulu Sungai Selatan', lat: -2.78, lng: 115.28 },
  { reg: 'PNK-2021-0005', name: 'CV Sumber Makmur', owner: 'Andi Wijaya', kab: 'Tanah Bumbu', lat: -3.5, lng: 115.7 },
  { reg: 'PNK-2022-0006', name: 'KT Maju Bersama', owner: 'Nurlela', kab: 'Barito Kuala', lat: -3.05, lng: 114.6 },
  { reg: 'PNK-2022-0007', name: 'CV Agro Sawit', owner: 'Faisal Rahman', kab: 'Kotabaru', lat: -3.2, lng: 116.15 },
  { reg: 'PNK-2022-0008', name: 'UD Lada Sejahtera', owner: 'Hasan Basri', kab: 'Tabalong', lat: -2.2, lng: 115.4 },
  { reg: 'PNK-2023-0009', name: 'KT Tani Mandiri', owner: 'Yudi Pratama', kab: 'Balangan', lat: -2.4, lng: 115.5 },
  { reg: 'PNK-2023-0010', name: 'CV Kelapa Nusantara', owner: 'Dewi Kartika', kab: 'Banjarbaru', lat: -3.45, lng: 114.85 },
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!;
}

async function main() {
  console.log('🌱 Seeding SIPERBUN...');

  // Clean in FK-safe order (dev only)
  const tables = [
    'circulation_findings',
    'circulation_inspections',
    'label_distributions',
    'seed_labels',
    'seed_distributions',
    'certificate_versions',
    'certificates',
    'corrective_actions',
    'inspection_findings',
    'inspection_photos',
    'inspection_results',
    'field_inspections',
    'field_assignments',
    'payment_proofs',
    'application_invoices',
    'inspection_reports',
    'application_status_histories',
    'application_documents',
    'certification_applications',
    'production_logs',
    'production_batches',
    'seed_source_documents',
    'seed_sources',
    'seed_garden_documents',
    'seed_gardens',
    'nursery_documents',
    'nursery_locations',
    'producer_documents',
    'producers',
    'seed_standards',
    'varieties',
    'commodities',
    'notifications',
    'activity_logs',
    'audit_logs',
    'refresh_tokens',
    'user_roles',
    'role_permissions',
    'users',
    'roles',
    'permissions',
    'offices',
    'regions',
    'stored_files',
    'app_settings',
    'inspection_checklists',
    'dashboard_banners',
    'public_listing_photos',
    'public_listings',
    'producer_registration_requests',
  ];

  for (const t of tables) {
    try {
      await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS=0`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``);
      await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS=1`);
    } catch {
      // table may not exist yet on first push
    }
  }

  // Permissions & Roles
  const permIds: Record<string, string> = {};
  for (const key of ALL_PERMISSIONS) {
    const meta = PERMISSION_META[key]!;
    const p = await prisma.permission.create({
      data: { key, name: meta.name, module: meta.module },
    });
    permIds[key] = p.id;
  }

  const roleIds: Record<string, string> = {};
  for (const [slug, name] of Object.entries({
    [ROLES.SUPER_ADMIN]: 'Super Admin',
    [ROLES.PIMPINAN]: 'Pimpinan',
    [ROLES.ADMIN]: 'Admin',
    [ROLES.PBT]: 'Pengawas Benih Tanaman',
    [ROLES.PENANGKAR]: 'Penangkar',
  })) {
    const role = await prisma.role.create({
      data: { slug, name, description: name },
    });
    roleIds[slug] = role.id;
    const keys = ROLE_PERMS[slug] ?? [];
    if (keys.length) {
      await prisma.rolePermission.createMany({
        data: keys.map((k) => ({
          roleId: role.id,
          permissionId: permIds[k]!,
        })),
      });
    }
  }

  // Regions
  const prov = await prisma.region.create({
    data: {
      code: '63',
      name: 'Kalimantan Selatan',
      type: RegionType.PROVINSI,
      latitude: -3.0,
      longitude: 115.0,
    },
  });

  const kabMap: Record<string, string> = {};
  for (const k of KABUPATEN) {
    const r = await prisma.region.create({
      data: {
        code: k.code,
        name: k.name,
        type: RegionType.KABUPATEN,
        parentId: prov.id,
        latitude: k.lat,
        longitude: k.lng,
      },
    });
    kabMap[k.name] = r.id;
  }

  const office = await prisma.office.create({
    data: {
      name: 'Dinas Perkebunan Provinsi Kalimantan Selatan',
      code: 'DISBUN-KALSEL',
      address: 'Jl. Panglima Batur No.1, Banjarbaru',
      phone: '0511-4772345',
      email: 'disbun@kalselprov.go.id',
      regionId: prov.id,
    },
  });

  // Commodities & varieties
  const commodityIds: Record<string, string> = {};
  const varietyIds: Record<string, string> = {};
  for (const c of COMMODITIES) {
    const row = await prisma.commodity.create({ data: c });
    commodityIds[c.name] = row.id;
    const v = await prisma.variety.create({
      data: {
        commodityId: row.id,
        code: `${c.code}-V1`,
        name: `${c.name} Unggul`,
        clone: `Klon ${c.code}`,
      },
    });
    varietyIds[c.name] = v.id;
  }

  const passwordHash = await bcrypt.hash('password', 10);

  async function createUser(
    email: string,
    name: string,
    role: string,
    regionName?: string,
  ) {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        phone: '081234567890',
        officeId: office.id,
        regionId: regionName ? kabMap[regionName] : prov.id,
        isActive: true,
      },
    });
    await prisma.userRole.create({
      data: { userId: user.id, roleId: roleIds[role]! },
    });
    return user;
  }

  const admin = await createUser('admin@siperbun.local', 'Super Admin SIPERBUN', ROLES.SUPER_ADMIN);
  await createUser('pimpinan@siperbun.local', 'Pimpinan Dinas', ROLES.PIMPINAN);
  await createUser('admin1@siperbun.local', 'Admin Operasional 1', ROLES.ADMIN);
  await createUser('admin2@siperbun.local', 'Admin Operasional 2', ROLES.ADMIN);
  await createUser('admin.banjar@siperbun.local', 'Admin Wilayah Banjar', ROLES.ADMIN, 'Banjar');
  await createUser(
    'admin.tanahlaut@siperbun.local',
    'Admin Wilayah Tanah Laut',
    ROLES.ADMIN,
    'Tanah Laut',
  );

  const pbtUsers = [
    await createUser('ahmad@siperbun.local', 'Ahmad Rahman', ROLES.PBT, 'Banjar'),
    await createUser('siti@siperbun.local', 'Siti Rahmah', ROLES.PBT, 'Tanah Laut'),
    await createUser('rudi@siperbun.local', 'Rudiansyah', ROLES.PBT, 'Tapin'),
    await createUser('heri@siperbun.local', 'Heri Kurniawan', ROLES.PBT, 'Banjarbaru'),
    await createUser('fadli@siperbun.local', 'M. Fadli', ROLES.PBT, 'Barito Kuala'),
  ];

  // 128 producers
  const producers = [];
  for (let i = 0; i < 128; i++) {
    const named = NAMED_PRODUCERS[i];
    const kabName = named?.kab ?? pick(KABUPATEN, i).name;
    const kab = KABUPATEN.find((k) => k.name === kabName) ?? pick(KABUPATEN, i);
    const p = await prisma.producer.create({
      data: {
        registrationNumber: named?.reg ?? `PNK-2024-${String(i + 1).padStart(4, '0')}`,
        businessName: named?.name ?? `Penangkar ${kab.name} ${i + 1}`,
        businessType: i % 3 === 0 ? 'CV' : i % 3 === 1 ? 'UD' : 'KT',
        ownerName: named?.owner ?? `Pemilik ${i + 1}`,
        nik: `6301${String(100000000000 + i).slice(-12)}`,
        phone: `0812${String(10000000 + i).slice(-8)}`,
        email: `prod${i + 1}@siperbun.local`,
        address: `Desa Contoh ${i + 1}, ${kab.name}`,
        provinceId: prov.id,
        kabupatenId: kabMap[kab.name],
        kecamatan: `Kecamatan ${i % 5 + 1}`,
        desa: `Desa ${i % 10 + 1}`,
        latitude: named?.lat ?? kab.lat + (i % 10) * 0.02,
        longitude: named?.lng ?? kab.lng + (i % 8) * 0.02,
        productionCapacity: BigInt(10000 + i * 500),
        status: ProducerStatus.ACTIVE,
        isActive: true,
        verifiedAt: new Date('2025-01-01'),
      },
    });
    producers.push(p);
  }

  // Link first 10 producers as PENANGKAR users
  for (let i = 0; i < 10; i++) {
    const u = await createUser(
      `penangkar${i + 1}@siperbun.local`,
      NAMED_PRODUCERS[i]?.owner ?? `Penangkar User ${i + 1}`,
      ROLES.PENANGKAR,
      NAMED_PRODUCERS[i]?.kab,
    );
    await prisma.user.update({
      where: { id: u.id },
      data: { producerId: producers[i]!.id },
    });
  }

  // 164 nursery locations
  const nurseries = [];
  const markerCycle: MapMarkerType[] = [
    MapMarkerType.NURSERY_ACTIVE,
    MapMarkerType.NURSERY_ACTIVE,
    MapMarkerType.NURSERY_PROCESS,
    MapMarkerType.NURSERY_ACTIVE,
    MapMarkerType.NURSERY_FINDING,
  ];
  for (let i = 0; i < 164; i++) {
    const producer = pick(producers, i);
    const commodity = COMMODITIES[i % COMMODITIES.length]!;
    const kab = pick(KABUPATEN, i);
    const n = await prisma.nurseryLocation.create({
      data: {
        producerId: producer.id,
        commodityId: commodityIds[commodity.name],
        regionId: kabMap[kab.name],
        name: `Lokasi ${producer.businessName} ${Math.floor(i / 10) + 1}`,
        address: `Alamat pembibitan ${i + 1}`,
        latitude: Number(producer.latitude) + (i % 5) * 0.01,
        longitude: Number(producer.longitude) + (i % 4) * 0.01,
        areaHa: 0.5 + (i % 10) * 0.2,
        capacity: BigInt(5000 + i * 100),
        waterSource: i % 2 === 0 ? 'Sumur' : 'Sungai',
        status: 'ACTIVE',
        markerType: markerCycle[i % markerCycle.length]!,
      },
    });
    nurseries.push(n);
  }

  // Seed gardens (~20)
  for (let i = 0; i < 20; i++) {
    const commodity = COMMODITIES[i % COMMODITIES.length]!;
    const kab = pick(KABUPATEN, i);
    await prisma.seedGarden.create({
      data: {
        producerId: producers[i]!.id,
        commodityId: commodityIds[commodity.name]!,
        varietyId: varietyIds[commodity.name],
        regionId: kabMap[kab.name],
        name: `Kebun Sumber ${commodity.name} ${i + 1}`,
        ownerName: producers[i]!.ownerName,
        latitude: Number(kab.lat) + 0.05,
        longitude: Number(kab.lng) - 0.05,
        areaHa: 2 + i * 0.3,
        plantingYear: 2010 + (i % 10),
        motherTreeCount: 100 + i * 10,
        estimatedYield: BigInt(10000 + i * 1000),
        decreeNumber: `SK/BNH/${2020 + (i % 5)}/${100 + i}`,
        decreeDate: new Date('2022-06-01'),
        validUntil: new Date('2027-06-01'),
        status: 'ACTIVE',
      },
    });
  }

  // Seed sources for first 30 producers
  const seedSources = [];
  for (let i = 0; i < 30; i++) {
    const commodity = COMMODITIES[i % COMMODITIES.length]!;
    const ss = await prisma.seedSource.create({
      data: {
        producerId: producers[i]!.id,
        commodityId: commodityIds[commodity.name]!,
        varietyId: varietyIds[commodity.name],
        lotNumber: `LOT-2025-${String(i + 1).padStart(4, '0')}`,
        receivedAt: new Date('2025-11-01'),
        quantity: 500,
        unit: 'kg',
        supplier: 'Balai Benih Nasional',
        usedQuantity: 200,
        remainingStock: 300,
        verificationStatus: 'VERIFIED',
      },
    });
    seedSources.push(ss);
  }

  // Production targets by commodity (demo chart)
  const commodityTargets: Record<string, number> = {
    Sawit: 620350,
    Karet: 280120,
    Kakao: 160830,
    Kopi: 110450,
    Kelapa: 70500,
    Lada: 38200,
  };

  const batches = [];
  let batchIdx = 0;
  for (const [commodityName, total] of Object.entries(commodityTargets)) {
    // Split into ~48 batches per commodity ≈ 287 total
    const perBatch = Math.floor(total / 48);
    const remainder = total - perBatch * 47;
    for (let i = 0; i < 48; i++) {
      const count = i === 47 ? remainder : perBatch;
      const producer = pick(producers, batchIdx);
      const nursery = pick(nurseries, batchIdx);
      const b = await prisma.productionBatch.create({
        data: {
          batchNumber: `BATCH-2026-${String(batchIdx + 1).padStart(4, '0')}`,
          producerId: producer.id,
          nurseryId: nursery.id,
          seedSourceId: pick(seedSources, batchIdx % seedSources.length).id,
          commodityId: commodityIds[commodityName]!,
          varietyId: varietyIds[commodityName],
          startedAt: new Date('2025-10-01'),
          initialCount: BigInt(count + 500),
          grownCount: BigInt(count),
          deadCount: BigInt(200),
          rejectedCount: BigInt(100),
          activeCount: BigInt(count),
          readyCount: BigInt(Math.floor(count * 0.8)),
          status:
            i % 9 === 0
              ? ProductionStatus.READY_FOR_INSPECTION
              : ProductionStatus.GROWING,
        },
      });
      batches.push(b);
      batchIdx++;
    }
  }

  // Applications for donut: Verifikasi 8, Perbaikan 5, Siap Dijadwalkan 7, Pemeriksaan 10, Menunggu Scan 3, Selesai 25
  const statusPlan: { status: ApplicationStatus; count: number }[] = [
    { status: ApplicationStatus.ADMIN_REVIEW, count: 8 },
    { status: ApplicationStatus.ADMIN_REVISION_REQUIRED, count: 5 },
    { status: ApplicationStatus.WAITING_ASSIGNMENT, count: 7 },
    { status: ApplicationStatus.INSPECTION_IN_PROGRESS, count: 10 },
    { status: ApplicationStatus.WAITING_CERTIFICATE_SCAN, count: 3 },
    { status: ApplicationStatus.COMPLETED, count: 25 },
  ];

  const featuredApps = [
    { no: 'SBN-2026-00128', producerIdx: 0, commodity: 'Sawit', count: 25000, status: ApplicationStatus.ADMIN_REVIEW, daysAgo: 0 },
    { no: 'SBN-2026-00127', producerIdx: 1, commodity: 'Karet', count: 12500, status: ApplicationStatus.INSPECTION_IN_PROGRESS, daysAgo: 1 },
    { no: 'SBN-2026-00126', producerIdx: 2, commodity: 'Kakao', count: 8000, status: ApplicationStatus.ADMIN_REVISION_REQUIRED, daysAgo: 1 },
    { no: 'SBN-2026-00125', producerIdx: 3, commodity: 'Kopi', count: 5500, status: ApplicationStatus.COMPLETED, daysAgo: 2 },
  ];

  const applications = [];
  let appSeq = 128;
  const now = new Date(); // Aug 6, 2026 context

  for (const f of featuredApps) {
    const submittedAt = new Date(now);
    submittedAt.setDate(submittedAt.getDate() - f.daysAgo);
    const app = await prisma.certificationApplication.create({
      data: {
        applicationNumber: f.no,
        producerId: producers[f.producerIdx]!.id,
        batchId: batches[f.producerIdx]!.id,
        commodityId: commodityIds[f.commodity]!,
        varietyId: varietyIds[f.commodity],
        nurseryId: nurseries[f.producerIdx]!.id,
        seedlingCount: BigInt(f.count),
        submittedAt,
        status: f.status,
        notes: 'Pengajuan demo',
      },
    });
    applications.push(app);
    appSeq--;
  }

  // Fill remaining status counts (featured already counted)
  const counted: Record<string, number> = {};
  for (const a of applications) {
    counted[a.status] = (counted[a.status] ?? 0) + 1;
  }

  for (const plan of statusPlan) {
    const need = plan.count - (counted[plan.status] ?? 0);
    for (let i = 0; i < need; i++) {
      const idx = applications.length + i;
      const commodity = COMMODITIES[idx % COMMODITIES.length]!;
      const submittedAt = new Date(now);
      submittedAt.setDate(submittedAt.getDate() - (idx % 20));
      const app = await prisma.certificationApplication.create({
        data: {
          applicationNumber: `SBN-2026-${String(appSeq).padStart(5, '0')}`,
          producerId: pick(producers, idx).id,
          batchId: pick(batches, idx).id,
          commodityId: commodityIds[commodity.name]!,
          varietyId: varietyIds[commodity.name],
          nurseryId: pick(nurseries, idx).id,
          seedlingCount: BigInt(3000 + idx * 100),
          submittedAt,
          status: plan.status,
        },
      });
      applications.push(app);
      appSeq--;
    }
  }

  // Extra applications this month to reach ~46
  const monthCount = applications.filter(
    (a) => a.submittedAt && a.submittedAt.getMonth() === now.getMonth(),
  ).length;
  for (let i = monthCount; i < 46; i++) {
    const commodity = COMMODITIES[i % COMMODITIES.length]!;
    await prisma.certificationApplication.create({
      data: {
        applicationNumber: `SBN-2026-${String(appSeq).padStart(5, '0')}`,
        producerId: pick(producers, i + 50).id,
        batchId: pick(batches, i + 50).id,
        commodityId: commodityIds[commodity.name]!,
        varietyId: varietyIds[commodity.name],
        nurseryId: pick(nurseries, i + 50).id,
        seedlingCount: BigInt(2000 + i * 50),
        submittedAt: new Date(now.getFullYear(), now.getMonth(), 1 + (i % 20)),
        status: ApplicationStatus.ADMIN_REVIEW,
      },
    });
    appSeq--;
  }

  // Today inspections (3 schedule items)
  const todaySchedule = [
    { time: '09:00', appIdx: 0, pbtIdx: 0, kab: 'Kabupaten Banjar' },
    { time: '11:00', appIdx: 1, pbtIdx: 1, kab: 'Kabupaten Tanah Laut' },
    { time: '14:00', appIdx: 2, pbtIdx: 2, kab: 'Kabupaten Tapin' },
  ];

  for (let i = 0; i < todaySchedule.length; i++) {
    const s = todaySchedule[i]!;
    await prisma.fieldAssignment.create({
      data: {
        assignmentNumber: `ST-2026-${String(i + 1).padStart(4, '0')}`,
        applicationId: applications[s.appIdx]!.id,
        inspectorId: pbtUsers[s.pbtIdx]!.id,
        createdById: admin.id,
        scheduledDate: now,
        scheduledTime: s.time,
        locationNotes: s.kab,
        status: AssignmentStatus.SCHEDULED,
        instructions: 'Periksa keseragaman dan kesehatan bibit',
      },
    });
  }

  // Historical assignments for PBT performance
  // Ahmad 28 @93%, Siti 24 @88%, Rudi 20 @80%, Heri 16 @76%, Fadli 14 @70%
  const perf = [
    { user: pbtUsers[0]!, total: 28, rate: 93 },
    { user: pbtUsers[1]!, total: 24, rate: 88 },
    { user: pbtUsers[2]!, total: 20, rate: 80 },
    { user: pbtUsers[3]!, total: 16, rate: 76 },
    { user: pbtUsers[4]!, total: 14, rate: 70 },
  ];

  let assignSeq = 10;
  for (const p of perf) {
    const completed = Math.round((p.total * p.rate) / 100);
    for (let i = 0; i < p.total; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (i + 1));
      await prisma.fieldAssignment.create({
        data: {
          assignmentNumber: `ST-2026-${String(assignSeq++).padStart(4, '0')}`,
          applicationId: pick(applications, i).id,
          inspectorId: p.user.id,
          createdById: admin.id,
          scheduledDate: d,
          scheduledTime: '10:00',
          status:
            i < completed
              ? AssignmentStatus.COMPLETED
              : AssignmentStatus.SCHEDULED,
          completedAt: i < completed ? d : null,
        },
      });
    }
  }

  // 3 overdue assignments
  for (let i = 0; i < 3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (3 + i));
    await prisma.fieldAssignment.create({
      data: {
        assignmentNumber: `ST-2026-${String(assignSeq++).padStart(4, '0')}`,
        applicationId: pick(applications, i + 5).id,
        inspectorId: pbtUsers[i % 5]!.id,
        createdById: admin.id,
        scheduledDate: d,
        scheduledTime: '08:00',
        status: AssignmentStatus.SCHEDULED,
      },
    });
  }

  // Certificates: issued 29, uploaded 25, pending 4, verified 23
  const completedApps = await prisma.certificationApplication.findMany({
    where: {
      status: {
        in: [
          ApplicationStatus.COMPLETED,
          ApplicationStatus.WAITING_CERTIFICATE_SCAN,
          ApplicationStatus.CERTIFICATE_SCAN_UPLOADED,
        ],
      },
    },
    take: 29,
  });

  for (let i = 0; i < completedApps.length; i++) {
    const app = completedApps[i]!;
    let status: CertificateStatus = CertificateStatus.ACTIVE;
    let fileId: string | null = null;
    let uploadedAt: Date | null = new Date();
    let verifiedAt: Date | null = new Date();

    if (i < 4) {
      status = CertificateStatus.WAITING_SCAN;
      uploadedAt = null;
      verifiedAt = null;
    } else if (i < 6) {
      // uploaded but not verified (2) → total uploaded = 25, verified = 23
      status = CertificateStatus.SCAN_UPLOADED;
      verifiedAt = null;
      const file = await prisma.storedFile.create({
        data: {
          originalName: `sertifikat-${i}.pdf`,
          storageName: `${cryptoRandom()}.pdf`,
          mimeType: 'application/pdf',
          size: BigInt(120000),
          sha256: 'a'.repeat(64),
          path: `certificates/2026/demo/${i}.pdf`,
          uploadedById: admin.id,
        },
      });
      fileId = file.id;
    } else {
      status = CertificateStatus.ACTIVE;
      const file = await prisma.storedFile.create({
        data: {
          originalName: `sertifikat-${i}.pdf`,
          storageName: `${cryptoRandom()}.pdf`,
          mimeType: 'application/pdf',
          size: BigInt(120000),
          sha256: 'b'.repeat(64),
          path: `certificates/2026/demo/${i}.pdf`,
          uploadedById: admin.id,
        },
      });
      fileId = file.id;
    }

    await prisma.certificate.create({
      data: {
        applicationId: app.id,
        producerId: app.producerId,
        batchId: app.batchId,
        certificateNumber: `${500 + i}/BNH/2026`,
        issuedAt: new Date('2026-07-01'),
        expiresAt: new Date('2027-07-01'),
        certifiedCount: app.seedlingCount,
        signatoryName: 'Kepala Dinas Perkebunan',
        signatoryTitle: 'Kepala Dinas',
        status,
        currentFileId: fileId,
        uploadedById: fileId ? admin.id : null,
        verifiedById: verifiedAt ? admin.id : null,
        uploadedAt,
        verifiedAt,
      },
    });
  }

  // Activities
  await prisma.activityLog.createMany({
    data: [
      {
        userId: pbtUsers[0]!.id,
        type: 'inspection',
        title: 'PBT Ahmad menyelesaikan pemeriksaan sawit',
        description: 'Pemeriksaan lapangan CV Banua Bibit telah difinalisasi.',
      },
      {
        userId: admin.id,
        type: 'application',
        title: 'CV Banua Bibit mengajukan sertifikasi baru',
        description: 'Pengajuan SBN-2026-00128 menunggu verifikasi.',
      },
      {
        userId: admin.id,
        type: 'certificate',
        title: 'Scan sertifikat 525/BNH/2026 telah diunggah',
        description: 'File scan berhasil disimpan ke storage.',
      },
      {
        userId: null,
        type: 'certificate',
        title: 'Sertifikat karet akan berakhir 14 hari lagi',
        description: 'Segera lakukan perpanjangan jika masih beredar.',
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        type: 'application',
        title: 'Pengajuan baru',
        body: 'SBN-2026-00128 menunggu verifikasi administrasi.',
        link: '/pengajuan',
      },
      {
        userId: admin.id,
        type: 'certificate',
        title: 'Scan belum diunggah',
        body: 'Terdapat 4 sertifikat menunggu unggah scan.',
        link: '/sertifikat',
      },
    ],
  });

  // Stage 6 sample: labels, distributions, circulation inspections
  const labelCount = await prisma.seedLabel.count({ where: { deletedAt: null } });
  if (labelCount === 0) {
    const activeCerts = await prisma.certificate.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      take: 5,
      orderBy: { certificateNumber: 'asc' },
    });

    for (let i = 0; i < activeCerts.length; i++) {
      const cert = activeCerts[i]!;
      const qty = 1000 + i * 100;
      await prisma.seedLabel.create({
        data: {
          certificateId: cert.id,
          serialStart: `LBL-${2026}-${String(i + 1).padStart(4, '0')}-A`,
          serialEnd: `LBL-${2026}-${String(i + 1).padStart(4, '0')}-Z`,
          quantity: qty,
          receivedAt: new Date('2026-07-10'),
          handedOverAt: new Date('2026-07-15'),
          recipient: cert.producerId
            ? (await prisma.producer.findFirst({ where: { id: cert.producerId } }))
                ?.businessName ?? 'Penangkar'
            : 'Penangkar',
          usedCount: 50,
          damagedCount: 0,
          cancelledCount: 0,
          remainingCount: qty - 50,
          notes: 'Seed label tahap 6',
        },
      });
    }

    const distCount = await prisma.seedDistribution.count({
      where: { deletedAt: null },
    });
    if (distCount === 0 && activeCerts.length > 0) {
      for (let i = 0; i < Math.min(5, activeCerts.length); i++) {
        const cert = activeCerts[i]!;
        await prisma.seedDistribution.create({
          data: {
            producerId: cert.producerId,
            certificateId: cert.id,
            batchId: cert.batchId,
            buyerName: `Pembeli Demo ${i + 1}`,
            buyerAddress: 'Jl. Demo No. 1, Kalimantan Selatan',
            destinationKab: 'Banjar',
            quantity: BigInt(500 + i * 100),
            distributedAt: new Date(`2026-07-${15 + i}`),
            deliveryNoteNo: `SJ-2026-${String(i + 1).padStart(3, '0')}`,
            notes: 'Distribusi bibit seed',
          },
        });
      }
    }

    const circCount = await prisma.circulationInspection.count({
      where: { deletedAt: null },
    });
    if (circCount === 0) {
      const circData = [
        {
          num: 'WAS-2026-0001',
          lat: -3.32,
          lng: 114.59,
          business: 'Toko Bibit Martapura',
          finding: 'NO_CERTIFICATE' as const,
        },
        {
          num: 'WAS-2026-0002',
          lat: -3.45,
          lng: 114.83,
          business: 'Kios Benih Banjarbaru',
          finding: 'LABEL_MISMATCH' as const,
        },
        {
          num: 'WAS-2026-0003',
          lat: -2.98,
          lng: 115.12,
          business: 'Distributor Bibit Hulu Sungai',
          finding: 'CERT_EXPIRED' as const,
        },
      ];
      for (const c of circData) {
        await prisma.circulationInspection.create({
          data: {
            inspectionNumber: c.num,
            inspectorName: 'PBT Ahmad',
            inspectedAt: new Date('2026-07-20'),
            location: c.business,
            latitude: c.lat,
            longitude: c.lng,
            businessName: c.business,
            ownerName: 'Pemilik Demo',
            commodityName: 'Kelapa Sawit',
            seedlingCount: BigInt(200),
            certificateNumber: null,
            certificateStatus: 'DIPERIKSA',
            labelStatus: 'DIPERIKSA',
            actionTaken: 'Peringatan tertulis',
            recommendation: 'Lengkapi dokumen sertifikat',
            findings: {
              create: [
                {
                  category: c.finding,
                  description: `Temuan seed: ${c.finding}`,
                  severity: 'MEDIUM',
                },
              ],
            },
          },
        });
      }
    }
  }

  await prisma.appSetting.createMany({
    data: [
      { key: 'app.name', value: 'SIPERBUN' },
      {
        key: 'app.fullName',
        value: 'Sistem Informasi Perbenihan Perkebunan',
      },
      {
        key: 'app.officeName',
        value:
          'UPTD Balai Pengawasan Sertifikasi Benih dan Proteksi Tanaman Perkebunan Provinsi Kalimantan Selatan',
      },
      { key: 'app.logoFileId', value: '' },
    ],
  });

  const bannerCount = await prisma.dashboardBanner.count();
  if (bannerCount === 0) {
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
  }

  // Default inspection checklists (generic)
  const checklistDefaults = [
    { code: 'asal_benih', label: 'Asal Benih', description: 'Kesesuaian asal/sumber benih' },
    { code: 'varietas', label: 'Varietas', description: 'Kesesuaian varietas/klon' },
    { code: 'umur_bibit', label: 'Umur Bibit', description: 'Umur bibit sesuai standar' },
    { code: 'tinggi', label: 'Tinggi Bibit', description: 'Tinggi tanaman sesuai standar' },
    { code: 'diameter_batang', label: 'Diameter Batang', description: 'Diameter batang sesuai standar' },
    { code: 'jumlah_daun', label: 'Jumlah Daun', description: 'Jumlah daun cukup dan sehat' },
    { code: 'keseragaman', label: 'Keseragaman', description: 'Keseragaman pertumbuhan bibit' },
    { code: 'kesehatan', label: 'Kesehatan', description: 'Kondisi kesehatan bibit secara umum' },
    { code: 'serangan_penyakit', label: 'Serangan Penyakit', description: 'Ada/tidaknya serangan hama/penyakit' },
    { code: 'kondisi_media', label: 'Kondisi Media', description: 'Kondisi media tanam' },
    { code: 'kondisi_akar', label: 'Kondisi Akar', description: 'Kondisi sistem perakaran' },
    { code: 'bibit_abnormal', label: 'Bibit Abnormal', description: 'Keberadaan bibit abnormal' },
    { code: 'jumlah_afkir', label: 'Jumlah Afkir', description: 'Jumlah bibit yang diafkir' },
  ];

  for (let i = 0; i < checklistDefaults.length; i++) {
    const c = checklistDefaults[i]!;
    await prisma.inspectionChecklist.upsert({
      where: { code: c.code },
      create: {
        code: c.code,
        label: c.label,
        description: c.description,
        commodityId: null,
        sortOrder: i + 1,
        isActive: true,
      },
      update: {
        label: c.label,
        description: c.description,
        sortOrder: i + 1,
        isActive: true,
        commodityId: null,
      },
    });
  }

  console.log('✅ Seed selesai');
  console.log('   Demo: admin@siperbun.local / password');
  console.log(`   Producers: ${producers.length}`);
  console.log(`   Nurseries: ${nurseries.length}`);
  console.log(`   Batches: ${batches.length}`);
}

function cryptoRandom() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
