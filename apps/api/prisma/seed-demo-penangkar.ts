import {
  ApplicationStatus,
  BannerPlacement,
  CertificateStatus,
  InvoiceStatus,
  PaymentProofStatus,
  PrismaClient,
  ProducerStatus,
  ProductionStatus,
  RegionType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

export const DEMO_PENANGKAR_EMAIL = 'demo.penangkar@siperbun.local';
export const DEMO_PENANGKAR_PASSWORD = 'password';

const DEMO_PRODUCER_REG = 'PNK-DEMO-0001';
const PAYMENT_INSTRUCTIONS =
  'Bank Kalsel\nNo. Rek 140-001-2345678\na.n. UPTD BPSBPTP Provinsi Kalimantan Selatan\nCantumkan nomor pengajuan pada berita transfer.';

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function cryptoRandom(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function pickCommodity<T>(items: T[], index: number): T {
  return items[index % items.length]!;
}

export async function seedDemoPenangkar(prisma: PrismaClient): Promise<void> {
  const role = await prisma.role.findUnique({ where: { slug: 'PENANGKAR' } });
  const commodities = await prisma.commodity.findMany({
    where: { deletedAt: null, isActive: true },
    include: { varieties: { where: { deletedAt: null, isActive: true }, take: 1 } },
    orderBy: { name: 'asc' },
  });
  const office = await prisma.office.findFirst({ where: { deletedAt: null } });
  const province = await prisma.region.findFirst({
    where: { type: RegionType.PROVINSI, deletedAt: null },
  });
  const kabupaten =
    (await prisma.region.findFirst({
      where: { type: RegionType.KABUPATEN, name: 'Banjar', deletedAt: null },
    })) ??
    (await prisma.region.findFirst({
      where: { type: RegionType.KABUPATEN, deletedAt: null },
    }));
  const admin = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      userRoles: { some: { role: { slug: { in: ['SUPER_ADMIN', 'ADMIN'] } } } },
    },
  });

  if (!role || commodities.length === 0 || !office || !province || !kabupaten) {
    throw new Error(
      'Seed demo penangkar membutuhkan role PENANGKAR, komoditas, kantor, dan wilayah. Jalankan seed utama dulu (pnpm db:seed).',
    );
  }

  const passwordHash = await bcrypt.hash(DEMO_PENANGKAR_PASSWORD, 10);

  const producer = await prisma.producer.upsert({
    where: { registrationNumber: DEMO_PRODUCER_REG },
    update: {
      businessName: 'CV Demo Banua Bibit',
      ownerName: 'Ahmad Demo Penangkar',
      status: ProducerStatus.ACTIVE,
      isActive: true,
      deletedAt: null,
    },
    create: {
      registrationNumber: DEMO_PRODUCER_REG,
      businessName: 'CV Demo Banua Bibit',
      businessType: 'CV',
      ownerName: 'Ahmad Demo Penangkar',
      nik: '6301123456780001',
      nib: '1234567890123',
      phone: '081255501001',
      email: DEMO_PENANGKAR_EMAIL,
      address: 'Jl. A. Yani Km 36, Martapura, Banjar',
      nurseryAddress: 'Desa Tunggul Irang, Martapura',
      provinceId: province.id,
      kabupatenId: kabupaten.id,
      kecamatan: 'Martapura',
      desa: 'Tunggul Irang',
      latitude: -3.412,
      longitude: 114.847,
      productionCapacity: BigInt(80000),
      status: ProducerStatus.ACTIVE,
      isActive: true,
      verifiedAt: daysFromNow(-200),
      notes: 'Akun demo penangkar untuk menampilkan seluruh alur aplikasi.',
    },
  });

  let user = await prisma.user.findUnique({ where: { email: DEMO_PENANGKAR_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEMO_PENANGKAR_EMAIL,
        name: 'Ahmad Demo Penangkar',
        passwordHash,
        phone: '081255501001',
        officeId: office.id,
        regionId: kabupaten.id,
        producerId: producer.id,
        isActive: true,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        name: 'Ahmad Demo Penangkar',
        phone: '081255501001',
        officeId: office.id,
        regionId: kabupaten.id,
        producerId: producer.id,
        isActive: true,
        deletedAt: null,
      },
    });
  }

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  const nurserySpecs = [
    {
      name: 'Kebun Demo Martapura',
      address: 'Desa Tunggul Irang, Martapura',
      lat: -3.41,
      lng: 114.85,
    },
    {
      name: 'Kebun Demo Karang Intan',
      address: 'Desa Mandi Angin, Karang Intan',
      lat: -3.48,
      lng: 114.92,
    },
  ];

  const nurseries = [];
  for (const [index, spec] of nurserySpecs.entries()) {
    const commodity = pickCommodity(commodities, index);
    const existing = await prisma.nurseryLocation.findFirst({
      where: { producerId: producer.id, name: spec.name },
    });
    nurseries.push(
      existing ??
        (await prisma.nurseryLocation.create({
          data: {
            producerId: producer.id,
            commodityId: commodity.id,
            regionId: kabupaten.id,
            name: spec.name,
            address: spec.address,
            latitude: spec.lat,
            longitude: spec.lng,
            areaHa: 1.5 + index,
            capacity: BigInt(20000 + index * 5000),
            waterSource: 'Sumur bor',
            status: 'ACTIVE',
            notes: 'Lokasi pembibitan akun demo.',
          },
        })),
    );
  }

  const batchStatuses: Array<{
    number: string;
    status: ProductionStatus;
    notes: string;
    initial: number;
    active: number;
    ready: number;
  }> = [
    { number: 'BTH-DEMO-01', status: ProductionStatus.PREPARATION, notes: 'Persiapan lahan dan media.', initial: 4000, active: 4000, ready: 0 },
    { number: 'BTH-DEMO-02', status: ProductionStatus.SOWING, notes: 'Tahap semai.', initial: 6000, active: 5800, ready: 0 },
    { number: 'BTH-DEMO-03', status: ProductionStatus.GROWING, notes: 'Bibit sedang tumbuh.', initial: 8000, active: 7600, ready: 1200 },
    { number: 'BTH-DEMO-04', status: ProductionStatus.READY_FOR_INSPECTION, notes: 'Siap diajukan pemeriksaan.', initial: 5000, active: 4800, ready: 4800 },
    { number: 'BTH-DEMO-05', status: ProductionStatus.UNDER_INSPECTION, notes: 'Sedang diperiksa PBT.', initial: 4500, active: 4300, ready: 4300 },
    { number: 'BTH-DEMO-06', status: ProductionStatus.PASSED, notes: 'Lulus pemeriksaan.', initial: 7000, active: 6800, ready: 6800 },
    { number: 'BTH-DEMO-07', status: ProductionStatus.FAILED, notes: 'Tidak lulus, perlu perbaikan.', initial: 3000, active: 2100, ready: 0 },
    { number: 'BTH-DEMO-08', status: ProductionStatus.COMPLETED, notes: 'Batch selesai dan tersertifikasi.', initial: 9000, active: 0, ready: 0 },
    { number: 'BTH-DEMO-09', status: ProductionStatus.CANCELLED, notes: 'Batch dibatalkan.', initial: 2000, active: 0, ready: 0 },
  ];

  const batches = [];
  for (const [index, spec] of batchStatuses.entries()) {
    const commodity = pickCommodity(commodities, index);
    const nursery = pickCommodity(nurseries, index);
    const existing = await prisma.productionBatch.findUnique({
      where: { batchNumber: spec.number },
    });
    batches.push(
      existing ??
        (await prisma.productionBatch.create({
          data: {
            batchNumber: spec.number,
            producerId: producer.id,
            nurseryId: nursery.id,
            commodityId: commodity.id,
            varietyId: commodity.varieties[0]?.id,
            startedAt: daysFromNow(-40 + index),
            initialCount: BigInt(spec.initial),
            grownCount: BigInt(Math.floor(spec.initial * 0.9)),
            deadCount: BigInt(Math.floor(spec.initial * 0.05)),
            rejectedCount: BigInt(Math.floor(spec.initial * 0.03)),
            activeCount: BigInt(spec.active),
            readyCount: BigInt(spec.ready),
            status: spec.status,
            notes: spec.notes,
          },
        })),
    );
  }

  async function fakeFile(originalName: string, path: string) {
    return prisma.storedFile.create({
      data: {
        originalName,
        storageName: `${cryptoRandom()}.pdf`,
        mimeType: 'application/pdf',
        size: BigInt(96000),
        sha256: cryptoRandom().padEnd(64, '0').slice(0, 64),
        path,
        uploadedById: admin?.id ?? user.id,
      },
    });
  }

  type AppSpec = {
    number: string;
    status: ApplicationStatus;
    notes: string;
    daysAgo: number;
    count: number;
    invoice?: InvoiceStatus;
    proof?: PaymentProofStatus;
    lhp?: boolean;
    certificate?: CertificateStatus;
  };

  const appSpecs: AppSpec[] = [
    { number: 'SBN-DEMO-01', status: ApplicationStatus.DRAFT, notes: 'Masih draft, belum dikirim.', daysAgo: 1, count: 1200 },
    { number: 'SBN-DEMO-02', status: ApplicationStatus.SUBMITTED, notes: 'Baru diajukan, menunggu antrean.', daysAgo: 2, count: 2500 },
    { number: 'SBN-DEMO-03', status: ApplicationStatus.ADMIN_REVIEW, notes: 'Dokumen sedang diverifikasi admin.', daysAgo: 3, count: 3000 },
    { number: 'SBN-DEMO-04', status: ApplicationStatus.ADMIN_REVISION_REQUIRED, notes: 'Perbaiki dokumen KTP/NIB.', daysAgo: 4, count: 1800 },
    { number: 'SBN-DEMO-05', status: ApplicationStatus.DOCUMENT_COMPLETE, notes: 'Dokumen lengkap.', daysAgo: 5, count: 4000 },
    { number: 'SBN-DEMO-06', status: ApplicationStatus.WAITING_ASSIGNMENT, notes: 'Menunggu penugasan PBT.', daysAgo: 6, count: 3500 },
    { number: 'SBN-DEMO-07', status: ApplicationStatus.INSPECTION_SCHEDULED, notes: 'Pemeriksaan dijadwalkan minggu ini.', daysAgo: 7, count: 4200 },
    { number: 'SBN-DEMO-08', status: ApplicationStatus.INSPECTION_IN_PROGRESS, notes: 'PBT sedang di lokasi.', daysAgo: 8, count: 2800 },
    { number: 'SBN-DEMO-09', status: ApplicationStatus.FIELD_REVISION_REQUIRED, notes: 'Ada temuan lapangan yang harus diperbaiki.', daysAgo: 9, count: 2200 },
    { number: 'SBN-DEMO-10', status: ApplicationStatus.WAITING_RESULT_VALIDATION, notes: 'Hasil pemeriksaan menunggu validasi.', daysAgo: 10, count: 3100 },
    { number: 'SBN-DEMO-11', status: ApplicationStatus.INSPECTION_PASSED, notes: 'Lulus pemeriksaan lapangan.', daysAgo: 11, count: 5000 },
    { number: 'SBN-DEMO-12', status: ApplicationStatus.INSPECTION_FAILED, notes: 'Tidak lulus pemeriksaan.', daysAgo: 12, count: 1600 },
    { number: 'SBN-DEMO-13', status: ApplicationStatus.WAITING_LHP_INVOICE, notes: 'Menunggu penerbitan LHP dan invoice.', daysAgo: 4, count: 4500, lhp: true },
    { number: 'SBN-DEMO-14', status: ApplicationStatus.WAITING_PAYMENT, notes: 'Invoice terbit. Unggah bukti transfer di sini.', daysAgo: 3, count: 6000, lhp: true, invoice: InvoiceStatus.ISSUED },
    { number: 'SBN-DEMO-15', status: ApplicationStatus.PAYMENT_VERIFICATION, notes: 'Bukti bayar sedang diverifikasi dinas.', daysAgo: 2, count: 5500, lhp: true, invoice: InvoiceStatus.PAYMENT_SUBMITTED, proof: PaymentProofStatus.SUBMITTED },
    { number: 'SBN-DEMO-16', status: ApplicationStatus.PAYMENT_REJECTED, notes: 'Bukti bayar ditolak. Unggah ulang.', daysAgo: 2, count: 4800, lhp: true, invoice: InvoiceStatus.PAYMENT_REJECTED, proof: PaymentProofStatus.REJECTED },
    { number: 'SBN-DEMO-17', status: ApplicationStatus.PAYMENT_VERIFIED, notes: 'Pembayaran sudah lunas.', daysAgo: 6, count: 7000, lhp: true, invoice: InvoiceStatus.PAID, proof: PaymentProofStatus.ACCEPTED },
    { number: 'SBN-DEMO-18', status: ApplicationStatus.CERTIFICATE_ISSUED_MANUALLY, notes: 'Sertifikat sudah diterbitkan manual.', daysAgo: 12, count: 6500, lhp: true, invoice: InvoiceStatus.PAID, proof: PaymentProofStatus.ACCEPTED, certificate: CertificateStatus.ISSUED_MANUALLY },
    { number: 'SBN-DEMO-19', status: ApplicationStatus.WAITING_CERTIFICATE_SCAN, notes: 'Menunggu scan sertifikat oleh dinas.', daysAgo: 14, count: 7200, lhp: true, invoice: InvoiceStatus.PAID, proof: PaymentProofStatus.ACCEPTED, certificate: CertificateStatus.WAITING_SCAN },
    { number: 'SBN-DEMO-20', status: ApplicationStatus.CERTIFICATE_SCAN_UPLOADED, notes: 'Scan sudah diunggah, menunggu pengaktifan.', daysAgo: 16, count: 8000, lhp: true, invoice: InvoiceStatus.PAID, proof: PaymentProofStatus.ACCEPTED, certificate: CertificateStatus.SCAN_UPLOADED },
    { number: 'SBN-DEMO-21', status: ApplicationStatus.COMPLETED, notes: 'Selesai. Sertifikat aktif.', daysAgo: 20, count: 9000, lhp: true, invoice: InvoiceStatus.PAID, proof: PaymentProofStatus.ACCEPTED, certificate: CertificateStatus.ACTIVE },
    { number: 'SBN-DEMO-22', status: ApplicationStatus.REJECTED, notes: 'Pengajuan ditolak administrasi.', daysAgo: 18, count: 1400 },
    { number: 'SBN-DEMO-23', status: ApplicationStatus.CANCELLED, notes: 'Pengajuan dibatalkan penangkar.', daysAgo: 15, count: 1000 },
    { number: 'SBN-DEMO-C1', status: ApplicationStatus.COMPLETED, notes: 'Contoh sertifikat kedaluwarsa.', daysAgo: 400, count: 5000, lhp: true, invoice: InvoiceStatus.PAID, proof: PaymentProofStatus.ACCEPTED, certificate: CertificateStatus.EXPIRED },
    { number: 'SBN-DEMO-C2', status: ApplicationStatus.COMPLETED, notes: 'Contoh sertifikat ditolak verifikasi scan.', daysAgo: 30, count: 3200, lhp: true, invoice: InvoiceStatus.PAID, proof: PaymentProofStatus.ACCEPTED, certificate: CertificateStatus.REJECTED },
    { number: 'SBN-DEMO-C3', status: ApplicationStatus.CERTIFICATE_SCAN_UPLOADED, notes: 'Scan menunggu verifikasi.', daysAgo: 11, count: 4100, lhp: true, invoice: InvoiceStatus.PAID, proof: PaymentProofStatus.ACCEPTED, certificate: CertificateStatus.WAITING_VERIFICATION },
    { number: 'SBN-DEMO-C4', status: ApplicationStatus.COMPLETED, notes: 'Sertifikat diganti versi baru.', daysAgo: 90, count: 2800, lhp: true, invoice: InvoiceStatus.PAID, proof: PaymentProofStatus.ACCEPTED, certificate: CertificateStatus.REPLACED },
    { number: 'SBN-DEMO-C5', status: ApplicationStatus.CANCELLED, notes: 'Sertifikat dibatalkan.', daysAgo: 60, count: 2100, lhp: true, invoice: InvoiceStatus.PAID, proof: PaymentProofStatus.ACCEPTED, certificate: CertificateStatus.CANCELLED },
    { number: 'SBN-DEMO-C6', status: ApplicationStatus.CERTIFICATE_ISSUED_MANUALLY, notes: 'Menunggu penerbitan fisik.', daysAgo: 8, count: 3600, lhp: true, invoice: InvoiceStatus.PAID, proof: PaymentProofStatus.ACCEPTED, certificate: CertificateStatus.WAITING_ISSUANCE },
  ];

  const createdApps = [];
  for (const [index, spec] of appSpecs.entries()) {
    const commodity = pickCommodity(commodities, index);
    const nursery = pickCommodity(nurseries, index);
    const batch = pickCommodity(batches, index);
    const submittedAt =
      spec.status === ApplicationStatus.DRAFT ? null : daysFromNow(-spec.daysAgo);

    let app = await prisma.certificationApplication.findUnique({
      where: { applicationNumber: spec.number },
    });
    if (!app) {
      app = await prisma.certificationApplication.create({
        data: {
          applicationNumber: spec.number,
          producerId: producer.id,
          batchId: batch.id,
          commodityId: commodity.id,
          varietyId: commodity.varieties[0]?.id,
          nurseryId: nursery.id,
          seedlingCount: BigInt(spec.count),
          submittedAt,
          status: spec.status,
          notes: spec.notes,
        },
      });
    }
    createdApps.push({ app, spec, batch });

    const historyCount = await prisma.applicationStatusHistory.count({
      where: { applicationId: app.id },
    });
    if (historyCount === 0) {
      await prisma.applicationStatusHistory.create({
        data: {
          applicationId: app.id,
          fromStatus: spec.status === ApplicationStatus.DRAFT ? null : ApplicationStatus.DRAFT,
          toStatus: spec.status,
          changedById: admin?.id ?? user.id,
          notes: spec.notes,
        },
      });
    }

    if (spec.lhp) {
      const existingLhp = await prisma.inspectionReport.findUnique({
        where: { applicationId: app.id },
      });
      if (!existingLhp) {
        const file = await fakeFile(`lhp-${spec.number}.pdf`, `demo/lhp/${spec.number}.pdf`);
        await prisma.inspectionReport.create({
          data: {
            applicationId: app.id,
            reportNumber: `LHP-${spec.number}`,
            fileId: file.id,
            notes: 'LHP demo untuk alur pembayaran dan sertifikasi.',
            createdById: admin?.id,
            issuedAt: daysFromNow(-spec.daysAgo + 1),
          },
        });
      }
    }

    if (spec.invoice) {
      let invoice = await prisma.applicationInvoice.findUnique({
        where: { applicationId: app.id },
      });
      if (!invoice) {
        invoice = await prisma.applicationInvoice.create({
          data: {
            applicationId: app.id,
            invoiceNumber: `INV-${spec.number}`,
            amount: (spec.count * 250).toFixed(2),
            dueDate: daysFromNow(10),
            paymentInstructions: PAYMENT_INSTRUCTIONS,
            status: spec.invoice,
            issuedById: admin?.id,
            issuedAt: daysFromNow(-spec.daysAgo),
            paidAt: spec.invoice === InvoiceStatus.PAID ? daysFromNow(-1) : null,
          },
        });
      }

      if (spec.proof) {
        const existingProof = await prisma.paymentProof.findFirst({
          where: { invoiceId: invoice.id },
        });
        if (!existingProof) {
          const file = await fakeFile(
            `bukti-${spec.number}.pdf`,
            `demo/payment/${spec.number}.pdf`,
          );
          await prisma.paymentProof.create({
            data: {
              invoiceId: invoice.id,
              fileId: file.id,
              submittedById: user.id,
              verifiedById:
                spec.proof === PaymentProofStatus.SUBMITTED ? null : admin?.id,
              status: spec.proof,
              notes: 'Bukti transfer demo.',
              verificationNotes:
                spec.proof === PaymentProofStatus.REJECTED
                  ? 'Nominal tidak sesuai invoice. Unggah ulang bukti yang benar.'
                  : spec.proof === PaymentProofStatus.ACCEPTED
                    ? 'Pembayaran diterima.'
                    : null,
              submittedAt: daysFromNow(-1),
              verifiedAt:
                spec.proof === PaymentProofStatus.SUBMITTED ? null : daysFromNow(0),
            },
          });
        }
      }
    }

    if (spec.certificate) {
      const existingCert = await prisma.certificate.findUnique({
        where: { applicationId: app.id },
      });
      if (!existingCert) {
        const needsFile = ![
          CertificateStatus.WAITING_ISSUANCE,
          CertificateStatus.ISSUED_MANUALLY,
          CertificateStatus.WAITING_SCAN,
        ].includes(spec.certificate);
        const file = needsFile
          ? await fakeFile(`sertifikat-${spec.number}.pdf`, `demo/cert/${spec.number}.pdf`)
          : null;
        const expired = spec.certificate === CertificateStatus.EXPIRED;
        await prisma.certificate.create({
          data: {
            applicationId: app.id,
            producerId: producer.id,
            batchId: batch.id,
            certificateNumber: `SRT-${spec.number}`,
            issuedAt: daysFromNow(expired ? -400 : -spec.daysAgo),
            expiresAt: expired ? daysFromNow(-10) : daysFromNow(365),
            certifiedCount: BigInt(spec.count),
            signatoryName: 'Kepala UPTD BPSBPTP',
            signatoryTitle: 'Kepala UPTD',
            status: spec.certificate,
            currentFileId: file?.id,
            uploadedById: file ? (admin?.id ?? user.id) : null,
            verifiedById:
              spec.certificate === CertificateStatus.ACTIVE ? admin?.id : null,
            uploadedAt: file ? daysFromNow(-spec.daysAgo + 2) : null,
            verifiedAt:
              spec.certificate === CertificateStatus.ACTIVE ? daysFromNow(-spec.daysAgo + 3) : null,
            notes: spec.notes,
          },
        });
      }
    }
  }

  const activeCert = await prisma.certificate.findFirst({
    where: { producerId: producer.id, status: CertificateStatus.ACTIVE, deletedAt: null },
  });
  const distSpecs = [
    {
      note: 'SJ-DEMO-001',
      buyer: 'Dinas Pertanian Kabupaten Banjar',
      kab: 'Banjar',
      qty: 1500,
      daysAgo: 12,
    },
    {
      note: 'SJ-DEMO-002',
      buyer: 'KT Tani Makmur Tanah Laut',
      kab: 'Tanah Laut',
      qty: 800,
      daysAgo: 7,
    },
    {
      note: 'SJ-DEMO-003',
      buyer: 'CV Agro Mandiri Banjarbaru',
      kab: 'Banjarbaru',
      qty: 400,
      daysAgo: 2,
    },
  ];
  for (const spec of distSpecs) {
    const existing = await prisma.seedDistribution.findFirst({
      where: { producerId: producer.id, deliveryNoteNo: spec.note },
    });
    if (!existing) {
      await prisma.seedDistribution.create({
        data: {
          producerId: producer.id,
          certificateId: activeCert?.id,
          batchId: activeCert?.batchId ?? batches[5]?.id,
          buyerName: spec.buyer,
          buyerAddress: `Alamat pembeli demo, ${spec.kab}`,
          destinationKab: spec.kab,
          quantity: BigInt(spec.qty),
          distributedAt: daysFromNow(-spec.daysAgo),
          deliveryNoteNo: spec.note,
          notes: 'Distribusi demo dari sertifikat aktif.',
        },
      });
    }
  }

  const notifCount = await prisma.notification.count({ where: { userId: user.id } });
  if (notifCount === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: user.id,
          type: 'invoice',
          title: 'Invoice sertifikasi terbit',
          body: 'SBN-DEMO-14 menunggu pembayaran. Unggah bukti transfer di detail pengajuan.',
          link: '/pengajuan',
          isRead: false,
        },
        {
          userId: user.id,
          type: 'payment',
          title: 'Bukti pembayaran ditolak',
          body: 'SBN-DEMO-16 ditolak karena nominal tidak sesuai. Unggah ulang bukti yang benar.',
          link: '/pengajuan',
          isRead: false,
        },
        {
          userId: user.id,
          type: 'payment',
          title: 'Pembayaran sedang diverifikasi',
          body: 'SBN-DEMO-15 sudah diterima dan menunggu verifikasi admin.',
          link: '/pengajuan',
          isRead: false,
        },
        {
          userId: user.id,
          type: 'certificate',
          title: 'Sertifikat aktif',
          body: 'SBN-DEMO-21 selesai. Sertifikat SRT-SBN-DEMO-21 sudah aktif.',
          link: '/sertifikat',
          isRead: true,
          readAt: daysFromNow(-1),
        },
        {
          userId: user.id,
          type: 'application',
          title: 'Perbaikan dokumen',
          body: 'SBN-DEMO-04 memerlukan perbaikan dokumen sebelum dilanjutkan.',
          link: '/pengajuan',
          isRead: true,
          readAt: daysFromNow(-3),
        },
      ],
    });
  }

  const mobileBanner = await prisma.dashboardBanner.findFirst({
    where: { placement: BannerPlacement.MOBILE, deletedAt: null },
  });
  if (!mobileBanner) {
    await prisma.dashboardBanner.create({
      data: {
        title: 'Akun demo penangkar',
        subtitle: 'Jelajahi pengajuan, pembayaran, produksi, sertifikat, dan distribusi.',
        linkUrl: '/pengajuan',
        placement: BannerPlacement.MOBILE,
        sortOrder: 1,
        isActive: true,
      },
    });
  }

  console.log('✅ Seed demo penangkar siap');
  console.log(`   Email    : ${DEMO_PENANGKAR_EMAIL}`);
  console.log(`   Password : ${DEMO_PENANGKAR_PASSWORD}`);
  console.log(`   Producer : ${producer.businessName} (${DEMO_PRODUCER_REG})`);
  console.log(`   Pengajuan: ${createdApps.length} kondisi`);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedDemoPenangkar(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

const invokedDirectly = process.argv[1]?.includes('seed-demo-penangkar');
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
