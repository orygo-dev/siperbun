import {
  CertificateStatus as CertStatusShared,
  type CertificateCancelInput,
  type CertificateCreateInput,
  type CertificateReplaceScanInput,
  type CertificateUpdateInput,
  type CertificateVerifyScanInput,
} from '@siperbun/shared';
import {
  ApplicationStatus,
  CertificateStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { type AccessUser, isInspectorUser, isProducerUser, requireProducerId } from '../../utils/access-scope';
import { writeAudit } from '../../utils/audit';
import {
  saveCertificateScanFile,
  serializeStoredFile,
} from '../../utils/storage';

const CREATABLE_APP_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.PAYMENT_VERIFIED,
  ApplicationStatus.CERTIFICATE_ISSUED_MANUALLY,
];

const UPLOAD_ALLOWED: CertificateStatus[] = [
  CertificateStatus.WAITING_SCAN,
  CertificateStatus.ISSUED_MANUALLY,
  CertificateStatus.REJECTED,
];

const REPLACE_ALLOWED: CertificateStatus[] = [
  CertificateStatus.ACTIVE,
  CertificateStatus.WAITING_VERIFICATION,
  CertificateStatus.SCAN_UPLOADED,
];

const CERT_PHASE_APP_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.CERTIFICATE_ISSUED_MANUALLY,
  ApplicationStatus.WAITING_CERTIFICATE_SCAN,
  ApplicationStatus.CERTIFICATE_SCAN_UPLOADED,
];

const userSelect = { id: true, name: true, email: true } as const;

const listInclude = {
  producer: {
    select: { id: true, businessName: true, registrationNumber: true },
  },
  application: {
    select: {
      id: true,
      applicationNumber: true,
      status: true,
      seedlingCount: true,
      commodity: { select: { id: true, name: true, code: true } },
      variety: { select: { id: true, name: true, code: true } },
    },
  },
  batch: {
    select: { id: true, batchNumber: true, status: true },
  },
  currentFile: true,
  uploadedBy: { select: userSelect },
  verifiedBy: { select: userSelect },
} as const;

const detailInclude = {
  ...listInclude,
  versions: {
    orderBy: { version: 'desc' as const },
    include: { file: true },
  },
} as const;

function serializeCertificate<T extends Record<string, unknown>>(item: T) {
  const row = item as T & {
    certifiedCount?: bigint | number;
    currentFile?: Parameters<typeof serializeStoredFile>[0] | null;
    versions?: Array<{
      id: string;
      version: number;
      reason?: string | null;
      createdAt: Date;
      fileId?: string | null;
      file?: Parameters<typeof serializeStoredFile>[0] | null;
    }>;
    application?: {
      seedlingCount?: bigint | number;
      [key: string]: unknown;
    } | null;
  };

  return {
    ...row,
    certifiedCount:
      row.certifiedCount != null ? Number(row.certifiedCount) : 0,
    currentFile: row.currentFile
      ? serializeStoredFile(row.currentFile)
      : null,
    versions: row.versions?.map((v) => ({
      id: v.id,
      version: v.version,
      reason: v.reason ?? null,
      createdAt: v.createdAt,
      fileId: v.fileId ?? null,
      file: v.file ? serializeStoredFile(v.file) : null,
    })),
    application: row.application
      ? {
          ...row.application,
          seedlingCount:
            row.application.seedlingCount != null
              ? Number(row.application.seedlingCount)
              : 0,
        }
      : row.application,
  };
}

async function nextCertificateNumber() {
  const year = new Date().getFullYear();
  const suffix = `/BNH/${year}`;
  const rows = await prisma.certificate.findMany({
    where: {
      deletedAt: null,
      certificateNumber: { endsWith: suffix },
    },
    select: { certificateNumber: true },
  });
  let maxSeq = 0;
  for (const row of rows) {
    const seq = Number(row.certificateNumber.split('/')[0]);
    if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  return `${maxSeq + 1}${suffix}`;
}

async function transitionApplication(
  tx: Prisma.TransactionClient,
  applicationId: string,
  steps: Array<{ to: ApplicationStatus; notes?: string | null }>,
  changedById: string,
) {
  let current = await tx.certificationApplication.findFirst({
    where: { id: applicationId, deletedAt: null },
  });
  if (!current) throw new AppError('Pengajuan tidak ditemukan', 404);

  for (const step of steps) {
    if (current!.status === step.to) continue;
    await tx.applicationStatusHistory.create({
      data: {
        applicationId,
        fromStatus: current!.status,
        toStatus: step.to,
        changedById,
        notes: step.notes ?? null,
      },
    });
    current = await tx.certificationApplication.update({
      where: { id: applicationId },
      data: { status: step.to },
    });
  }
  return current;
}

function wantsIssuedManually(status?: string | null) {
  return (
    status === CertStatusShared.ISSUED_MANUALLY ||
    status === CertStatusShared.WAITING_SCAN
  );
}

async function ensureIssuedScanReady(
  tx: Prisma.TransactionClient,
  applicationId: string,
  appStatus: ApplicationStatus,
  changedById: string,
  notes?: string | null,
) {
  const steps: Array<{ to: ApplicationStatus; notes?: string | null }> = [];
  if (appStatus === ApplicationStatus.PAYMENT_VERIFIED) {
    steps.push({
      to: ApplicationStatus.CERTIFICATE_ISSUED_MANUALLY,
      notes: notes ?? 'Sertifikat diterbitkan manual',
    });
    steps.push({
      to: ApplicationStatus.WAITING_CERTIFICATE_SCAN,
      notes: 'Menunggu unggah scan sertifikat',
    });
  } else if (appStatus === ApplicationStatus.CERTIFICATE_ISSUED_MANUALLY) {
    steps.push({
      to: ApplicationStatus.WAITING_CERTIFICATE_SCAN,
      notes: notes ?? 'Menunggu unggah scan sertifikat',
    });
  }
  if (steps.length) {
    await transitionApplication(tx, applicationId, steps, changedById);
  }
}

export const certificatesService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    producerId?: string;
  }, user: AccessUser) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = String(query.search ?? '').trim();

    const where: Prisma.CertificateWhereInput = {
      deletedAt: null,
      ...(isProducerUser(user)
        ? { producerId: requireProducerId(user) }
        : isInspectorUser(user)
          ? { application: { assignments: { some: { inspectorId: user.id, deletedAt: null } } } }
          : query.producerId
            ? { producerId: query.producerId }
            : {}),
      ...(query.status
        ? { status: query.status as CertificateStatus }
        : {}),
      ...(search
        ? {
            OR: [
              { certificateNumber: { contains: search } },
              { producer: { businessName: { contains: search } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.certificate.count({ where }),
      prisma.certificate.findMany({
        where,
        include: listInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((i) => serializeCertificate(i)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string, user?: AccessUser) {
    const item = await prisma.certificate.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(user && isProducerUser(user)
          ? { producerId: requireProducerId(user) }
          : user && isInspectorUser(user)
            ? { application: { assignments: { some: { inspectorId: user.id, deletedAt: null } } } }
            : {}),
      },
      include: detailInclude,
    });
    if (!item) throw new AppError('Sertifikat tidak ditemukan', 404);
    return serializeCertificate(item);
  },

  async create(input: CertificateCreateInput, userId: string) {
    const application = await prisma.certificationApplication.findFirst({
      where: { id: input.applicationId, deletedAt: null },
    });
    if (!application) throw new AppError('Pengajuan tidak ditemukan', 404);

    if (!CREATABLE_APP_STATUSES.includes(application.status)) {
      throw new AppError(
        'Sertifikat hanya dapat dibuat setelah pemeriksaan lulus dan pembayaran lunas',
        400,
      );
    }

    const existing = await prisma.certificate.findFirst({
      where: { applicationId: application.id, deletedAt: null },
    });
    if (existing) {
      throw new AppError(
        'Pengajuan ini sudah memiliki sertifikat',
        400,
      );
    }

    const issuedManually = wantsIssuedManually(input.status);
    const certificateNumber =
      input.certificateNumber?.trim() || (await nextCertificateNumber());

    const dup = await prisma.certificate.findFirst({
      where: { certificateNumber, deletedAt: null },
    });
    if (dup) {
      throw new AppError('Nomor sertifikat sudah digunakan', 400);
    }

    const certifiedCount =
      input.certifiedCount != null
        ? BigInt(Math.round(input.certifiedCount))
        : application.seedlingCount;

    const initialStatus: CertificateStatus = issuedManually
      ? CertificateStatus.WAITING_SCAN
      : ((input.status as CertificateStatus | undefined) ??
        CertificateStatus.WAITING_ISSUANCE);

    const item = await prisma.$transaction(async (tx) => {
      if (issuedManually) {
        await ensureIssuedScanReady(
          tx,
          application.id,
          application.status,
          userId,
          input.notes,
        );
      }

      return tx.certificate.create({
        data: {
          applicationId: application.id,
          producerId: application.producerId,
          batchId: application.batchId,
          certificateNumber,
          issuedAt: input.issuedAt
            ? new Date(input.issuedAt)
            : issuedManually
              ? new Date()
              : null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          certifiedCount,
          signatoryName: input.signatoryName ?? null,
          signatoryTitle: input.signatoryTitle ?? null,
          notes: input.notes ?? null,
          status: initialStatus,
        },
        include: detailInclude,
      });
    });

    const serialized = serializeCertificate(item);
    await writeAudit({
      userId,
      action: 'CREATE',
      module: 'certificate',
      entityId: item.id,
      after: serialized,
    });
    return serialized;
  },

  async update(id: string, input: CertificateUpdateInput, userId: string) {
    const current = await prisma.certificate.findFirst({
      where: { id, deletedAt: null },
      include: { application: true },
    });
    if (!current) throw new AppError('Sertifikat tidak ditemukan', 404);

    if (
      current.status === CertificateStatus.CANCELLED ||
      current.status === CertificateStatus.EXPIRED
    ) {
      throw new AppError('Sertifikat tidak dapat diubah', 400);
    }

    if (
      input.certificateNumber &&
      input.certificateNumber !== current.certificateNumber
    ) {
      const dup = await prisma.certificate.findFirst({
        where: {
          certificateNumber: input.certificateNumber,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new AppError('Nomor sertifikat sudah digunakan', 400);
    }

    const issuedManually = wantsIssuedManually(input.status);

    const item = await prisma.$transaction(async (tx) => {
      let nextStatus = input.status as CertificateStatus | undefined;

      if (issuedManually) {
        await ensureIssuedScanReady(
          tx,
          current.applicationId,
          current.application.status,
          userId,
          input.notes,
        );
        nextStatus = CertificateStatus.WAITING_SCAN;
      }

      const data: Prisma.CertificateUpdateInput = {};
      if (input.certificateNumber != null && input.certificateNumber !== '') {
        data.certificateNumber = input.certificateNumber;
      }
      if (input.issuedAt !== undefined) {
        data.issuedAt = input.issuedAt ? new Date(input.issuedAt) : null;
      } else if (issuedManually && !current.issuedAt) {
        data.issuedAt = new Date();
      }
      if (input.expiresAt !== undefined) {
        data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      }
      if (input.certifiedCount !== undefined && input.certifiedCount != null) {
        data.certifiedCount = BigInt(Math.round(input.certifiedCount));
      }
      if (input.signatoryName !== undefined) {
        data.signatoryName = input.signatoryName;
      }
      if (input.signatoryTitle !== undefined) {
        data.signatoryTitle = input.signatoryTitle;
      }
      if (input.notes !== undefined) {
        data.notes = input.notes;
      }
      if (nextStatus) {
        data.status = nextStatus;
      }

      return tx.certificate.update({
        where: { id },
        data,
        include: detailInclude,
      });
    });

    return serializeCertificate(item);
  },

  async uploadScan(
    id: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    const cert = await prisma.certificate.findFirst({
      where: { id, deletedAt: null },
      include: { application: true },
    });
    if (!cert) throw new AppError('Sertifikat tidak ditemukan', 404);

    if (!UPLOAD_ALLOWED.includes(cert.status)) {
      throw new AppError(
        'Scan hanya dapat diunggah saat status menunggu scan atau ditolak',
        400,
      );
    }

    const stored = await saveCertificateScanFile(file, {
      applicationNumber: cert.application.applicationNumber,
      uploadedById: userId,
    });

    const lastVersion = await prisma.certificateVersion.findFirst({
      where: { certificateId: id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    const item = await prisma.$transaction(async (tx) => {
      await tx.certificateVersion.create({
        data: {
          certificateId: id,
          version: nextVersion,
          fileId: stored.id,
          reason: nextVersion === 1 ? 'Unggah scan awal' : 'Unggah ulang',
        },
      });

      await transitionApplication(
        tx,
        cert.applicationId,
        [
          {
            to: ApplicationStatus.CERTIFICATE_SCAN_UPLOADED,
            notes: 'Scan sertifikat diunggah',
          },
        ],
        userId,
      );

      return tx.certificate.update({
        where: { id },
        data: {
          currentFileId: stored.id,
          uploadedById: userId,
          uploadedAt: new Date(),
          status: CertificateStatus.WAITING_VERIFICATION,
          verifiedById: null,
          verifiedAt: null,
        },
        include: detailInclude,
      });
    });

    return serializeCertificate(item);
  },

  async verifyScan(
    id: string,
    input: CertificateVerifyScanInput,
    userId: string,
  ) {
    const cert = await prisma.certificate.findFirst({
      where: { id, deletedAt: null },
    });
    if (!cert) throw new AppError('Sertifikat tidak ditemukan', 404);

    if (
      cert.status !== CertificateStatus.WAITING_VERIFICATION &&
      cert.status !== CertificateStatus.SCAN_UPLOADED
    ) {
      throw new AppError(
        'Scan hanya dapat diverifikasi saat menunggu verifikasi',
        400,
      );
    }

    if (!cert.currentFileId) {
      throw new AppError('Belum ada file scan untuk diverifikasi', 400);
    }

    const item = await prisma.$transaction(async (tx) => {
      if (input.approved) {
        await transitionApplication(
          tx,
          cert.applicationId,
          [
            {
              to: ApplicationStatus.COMPLETED,
              notes: input.notes ?? 'Scan sertifikat disetujui',
            },
          ],
          userId,
        );

        return tx.certificate.update({
          where: { id },
          data: {
            status: CertificateStatus.ACTIVE,
            verifiedById: userId,
            verifiedAt: new Date(),
            notes: input.notes ?? cert.notes,
          },
          include: detailInclude,
        });
      }

      return tx.certificate.update({
        where: { id },
        data: {
          status: CertificateStatus.REJECTED,
          verifiedById: userId,
          verifiedAt: new Date(),
          notes: input.notes ?? cert.notes,
        },
        include: detailInclude,
      });
    });

    return serializeCertificate(item);
  },

  async replaceScan(
    id: string,
    file: Express.Multer.File,
    input: CertificateReplaceScanInput,
    userId: string,
  ) {
    const cert = await prisma.certificate.findFirst({
      where: { id, deletedAt: null },
      include: { application: true },
    });
    if (!cert) throw new AppError('Sertifikat tidak ditemukan', 404);

    if (!REPLACE_ALLOWED.includes(cert.status)) {
      throw new AppError(
        'Scan hanya dapat diganti pada status aktif atau menunggu verifikasi',
        400,
      );
    }

    const stored = await saveCertificateScanFile(file, {
      applicationNumber: cert.application.applicationNumber,
      uploadedById: userId,
    });

    const lastVersion = await prisma.certificateVersion.findFirst({
      where: { certificateId: id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    const item = await prisma.$transaction(async (tx) => {
      await tx.certificateVersion.create({
        data: {
          certificateId: id,
          version: nextVersion,
          fileId: stored.id,
          reason: input.reason ?? 'Penggantian scan',
        },
      });

      // Keep COMPLETED apps as-is; only nudge apps still in scan phase
      if (
        cert.application.status ===
          ApplicationStatus.WAITING_CERTIFICATE_SCAN ||
        cert.application.status ===
          ApplicationStatus.CERTIFICATE_ISSUED_MANUALLY
      ) {
        await transitionApplication(
          tx,
          cert.applicationId,
          [
            {
              to: ApplicationStatus.CERTIFICATE_SCAN_UPLOADED,
              notes: input.reason ?? 'Scan diganti, menunggu verifikasi ulang',
            },
          ],
          userId,
        );
      }

      return tx.certificate.update({
        where: { id },
        data: {
          currentFileId: stored.id,
          uploadedById: userId,
          uploadedAt: new Date(),
          status: CertificateStatus.WAITING_VERIFICATION,
          verifiedById: null,
          verifiedAt: null,
        },
        include: detailInclude,
      });
    });

    return serializeCertificate(item);
  },

  async cancel(
    id: string,
    input: CertificateCancelInput,
    userId: string,
  ) {
    const cert = await prisma.certificate.findFirst({
      where: { id, deletedAt: null },
      include: { application: true },
    });
    if (!cert) throw new AppError('Sertifikat tidak ditemukan', 404);

    if (cert.status === CertificateStatus.CANCELLED) {
      throw new AppError('Sertifikat sudah dibatalkan', 400);
    }

    const item = await prisma.$transaction(async (tx) => {
      if (CERT_PHASE_APP_STATUSES.includes(cert.application.status)) {
        await transitionApplication(
          tx,
          cert.applicationId,
          [
            {
              to: ApplicationStatus.CANCELLED,
              notes: input.reason ?? 'Sertifikat dibatalkan',
            },
          ],
          userId,
        );
      }

      return tx.certificate.update({
        where: { id },
        data: {
          status: CertificateStatus.CANCELLED,
          notes: input.reason
            ? `${cert.notes ? `${cert.notes}\n` : ''}Dibatalkan: ${input.reason}`
            : cert.notes,
        },
        include: detailInclude,
      });
    });

    return serializeCertificate(item);
  },

  async getDownloadFile(id: string, user: AccessUser) {
    const cert = await prisma.certificate.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(isProducerUser(user)
          ? { producerId: requireProducerId(user) }
          : isInspectorUser(user)
            ? { application: { assignments: { some: { inspectorId: user.id, deletedAt: null } } } }
            : {}),
      },
      include: { currentFile: true },
    });
    if (!cert) throw new AppError('Sertifikat tidak ditemukan', 404);
    if (!cert.currentFile || cert.currentFile.deletedAt) {
      throw new AppError('File scan tidak ditemukan', 404);
    }
    return cert.currentFile;
  },
};
