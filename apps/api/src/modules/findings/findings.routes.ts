import {
  correctiveActionCreateSchema,
  findingUpdateSchema,
  PERMISSIONS,
  verifyCorrectiveActionSchema,
} from '@siperbun/shared';
import { FindingStatus, Prisma, Severity } from '@prisma/client';
import { Router } from 'express';
import {
  authenticate,
  requireAnyPermission,
  requirePermission,
} from '../../middlewares/auth';
import { uploadSingle } from '../../middlewares/upload';
import { validateBody } from '../../middlewares/validate';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { AuthedRequest, success } from '../../utils/response';
import {
  AccessUser,
  isInspectorUser,
  isProducerUser,
  requireProducerId,
} from '../../utils/access-scope';
import {
  saveMulterFile,
  serializeStoredFile,
} from '../../utils/storage';

export const findingsRouter = Router();

findingsRouter.use(authenticate);

function findingAccessWhere(
  user: AccessUser,
): Prisma.InspectionFindingWhereInput {
  if (isProducerUser(user)) {
    return { application: { producerId: requireProducerId(user) } };
  }
  if (isInspectorUser(user)) {
    return { inspection: { inspectorId: user.id } };
  }
  return {};
}

function serializeFinding<T extends Record<string, unknown>>(item: T) {
  const row = item as T & {
    correctiveActions?: Array<{
      file?: {
        id: string;
        originalName: string;
        storageName: string;
        mimeType: string;
        size: bigint;
        sha256: string;
        path: string;
        uploadedById: string | null;
        createdAt: Date;
      } | null;
      [k: string]: unknown;
    }>;
  };
  return {
    ...row,
    correctiveActions: (row.correctiveActions ?? []).map((ca) => ({
      ...ca,
      file: ca.file ? serializeStoredFile(ca.file) : null,
    })),
  };
}

const listInclude = {
  application: {
    select: {
      id: true,
      applicationNumber: true,
      status: true,
      producer: { select: { id: true, businessName: true } },
    },
  },
  inspection: {
    select: {
      id: true,
      assignmentId: true,
      isFinalized: true,
    },
  },
} as const;

const detailInclude = {
  ...listInclude,
  correctiveActions: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' as const },
    include: { file: true },
  },
} as const;

findingsRouter.get(
  '/',
  requirePermission(PERMISSIONS.INSPECTION_VIEW),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10)));
      const search = String(req.query.search ?? '').trim();

      const where: Prisma.InspectionFindingWhereInput = {
        deletedAt: null,
        AND: [findingAccessWhere(user)],
        ...(req.query.status
          ? { status: req.query.status as FindingStatus }
          : {}),
        ...(req.query.severity
          ? { severity: req.query.severity as Severity }
          : {}),
        ...(req.query.applicationId
          ? { applicationId: String(req.query.applicationId) }
          : {}),
        ...(search
          ? {
              OR: [
                { findingType: { contains: search } },
                { description: { contains: search } },
                {
                  application: {
                    applicationNumber: { contains: search },
                  },
                },
              ],
            }
          : {}),
      };

      const [total, items] = await Promise.all([
        prisma.inspectionFinding.count({ where }),
        prisma.inspectionFinding.findMany({
          where,
          include: listInclude,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return success(
        res,
        items,
        'Daftar temuan berhasil dimuat',
        200,
        { page, limit, total, totalPages: Math.ceil(total / limit) },
      );
    } catch (e) {
      next(e);
    }
  },
);

findingsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.INSPECTION_VIEW),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await prisma.inspectionFinding.findFirst({
        where: {
          id: String(req.params.id),
          deletedAt: null,
          AND: [findingAccessWhere(user)],
        },
        include: detailInclude,
      });
      if (!item) throw new AppError('Temuan tidak ditemukan', 404);
      return success(
        res,
        serializeFinding(item as unknown as Record<string, unknown>),
        'Detail temuan berhasil dimuat',
      );
    } catch (e) {
      next(e);
    }
  },
);

findingsRouter.put(
  '/:id',
  requireAnyPermission(
    PERMISSIONS.INSPECTION_EXECUTE,
    PERMISSIONS.APPLICATION_VERIFY,
  ),
  validateBody(findingUpdateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const existing = await prisma.inspectionFinding.findFirst({
        where: {
          id: String(req.params.id),
          deletedAt: null,
          AND: [findingAccessWhere(user)],
        },
      });
      if (!existing) throw new AppError('Temuan tidak ditemukan', 404);

      const body = req.body as {
        status?: FindingStatus;
        description?: string;
        findingType?: string;
        severity?: Severity;
        recommendation?: string | null;
        dueDate?: string | null;
      };

      const item = await prisma.inspectionFinding.update({
        where: { id: existing.id },
        data: {
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body.findingType !== undefined
            ? { findingType: body.findingType }
            : {}),
          ...(body.severity !== undefined ? { severity: body.severity } : {}),
          ...(body.recommendation !== undefined
            ? { recommendation: body.recommendation }
            : {}),
          ...(body.dueDate !== undefined
            ? { dueDate: body.dueDate ? new Date(body.dueDate) : null }
            : {}),
        },
        include: detailInclude,
      });

      return success(
        res,
        serializeFinding(item as unknown as Record<string, unknown>),
        'Temuan berhasil diperbarui',
      );
    } catch (e) {
      next(e);
    }
  },
);

findingsRouter.post(
  '/:id/corrective-actions',
  requireAnyPermission(
    PERMISSIONS.INSPECTION_EXECUTE,
    PERMISSIONS.APPLICATION_VERIFY,
    PERMISSIONS.APPLICATION_CREATE,
  ),
  (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        if (err instanceof AppError) return next(err);
        // file optional — multer error only if present
        if (
          err instanceof Error &&
          err.message.includes('Unexpected field')
        ) {
          return next();
        }
        return next(
          new AppError(
            err instanceof Error ? err.message : 'Gagal mengunggah file',
            400,
          ),
        );
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const finding = await prisma.inspectionFinding.findFirst({
        where: {
          id: String(req.params.id),
          deletedAt: null,
          AND: [findingAccessWhere(user)],
        },
      });
      if (!finding) throw new AppError('Temuan tidak ditemukan', 404);

      const parsed = correctiveActionCreateSchema.safeParse({
        description: req.body?.description,
        evidenceNotes: req.body?.evidenceNotes,
      });
      if (!parsed.success) {
        throw new AppError('Data tidak valid', 400, {
          form: parsed.error.issues.map((i) => i.message),
        });
      }

      let fileId: string | null = null;
      if (req.file) {
        const stored = await saveMulterFile(req.file, {
          inspectionId: finding.inspectionId ?? finding.id,
          uploadedById: user.id,
        });
        fileId = stored.id;
      }

      const action = await prisma.correctiveAction.create({
        data: {
          findingId: finding.id,
          description: parsed.data.description,
          evidenceNotes: parsed.data.evidenceNotes ?? null,
          fileId,
          status: FindingStatus.WAITING_VERIFICATION,
        },
        include: { file: true },
      });

      await prisma.inspectionFinding.update({
        where: { id: finding.id },
        data: { status: FindingStatus.WAITING_VERIFICATION },
      });

      return success(
        res,
        {
          ...action,
          file: action.file ? serializeStoredFile(action.file) : null,
        },
        'Bukti perbaikan berhasil diunggah',
        201,
      );
    } catch (e) {
      next(e);
    }
  },
);

findingsRouter.post(
  '/:id/corrective-actions/:actionId/verify',
  requireAnyPermission(
    PERMISSIONS.INSPECTION_EXECUTE,
    PERMISSIONS.APPLICATION_VERIFY,
  ),
  validateBody(verifyCorrectiveActionSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const finding = await prisma.inspectionFinding.findFirst({
        where: {
          id: String(req.params.id),
          deletedAt: null,
          AND: [findingAccessWhere(user)],
        },
      });
      if (!finding) throw new AppError('Temuan tidak ditemukan', 404);

      const action = await prisma.correctiveAction.findFirst({
        where: {
          id: String(req.params.actionId),
          findingId: finding.id,
          deletedAt: null,
        },
      });
      if (!action) throw new AppError('Tindakan perbaikan tidak ditemukan', 404);

      const decision = req.body.decision as 'ACCEPTED' | 'REJECTED';
      const newStatus =
        decision === 'ACCEPTED'
          ? FindingStatus.ACCEPTED
          : FindingStatus.REJECTED;

      const updated = await prisma.$transaction(async (tx) => {
        const ca = await tx.correctiveAction.update({
          where: { id: action.id },
          data: {
            status: newStatus,
            verifiedAt: new Date(),
            evidenceNotes:
              req.body.notes != null
                ? `${action.evidenceNotes ?? ''}\n[Verifikasi] ${req.body.notes}`.trim()
                : action.evidenceNotes,
          },
          include: { file: true },
        });

        await tx.inspectionFinding.update({
          where: { id: finding.id },
          data: {
            status:
              decision === 'ACCEPTED'
                ? FindingStatus.CLOSED
                : FindingStatus.IN_PROGRESS,
          },
        });

        return ca;
      });

      return success(
        res,
        {
          ...updated,
          file: updated.file ? serializeStoredFile(updated.file) : null,
        },
        decision === 'ACCEPTED'
          ? 'Perbaikan diterima'
          : 'Perbaikan ditolak',
      );
    } catch (e) {
      next(e);
    }
  },
);
