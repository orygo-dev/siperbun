import { PERMISSIONS } from '@siperbun/shared';
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import {
  authenticate,
  requireAnyPermission,
} from '../../middlewares/auth';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { AuthedRequest } from '../../utils/response';
import { resolveStoragePath } from '../../utils/storage';

export const filesRouter = Router();

filesRouter.get(
  '/:id',
  authenticate,
  requireAnyPermission(
    PERMISSIONS.INSPECTION_VIEW,
    PERMISSIONS.CERTIFICATE_VIEW,
    PERMISSIONS.APPLICATION_VIEW,
    PERMISSIONS.PRODUCER_VIEW,
  ),
  async (req, res, next) => {
    try {
      const file = await prisma.storedFile.findFirst({
        where: { id: String(req.params.id), deletedAt: null },
        include: {
          inspectionPhotos: { select: { id: true }, take: 1 },
          correctiveActions: { select: { id: true }, take: 1 },
          certificateCurrent: { select: { id: true }, take: 1 },
          certificateVersions: { select: { id: true }, take: 1 },
          applicationDocuments: { select: { id: true }, take: 1 },
          producerDocuments: { select: { id: true }, take: 1 },
        },
      });
      if (!file) throw new AppError('File tidak ditemukan', 404);

      const user = (req as AuthedRequest).user!;
      const isAdmin = user.roles.includes('SUPER_ADMIN');
      const isInspectionFile =
        file.inspectionPhotos.length > 0 || file.correctiveActions.length > 0;
      const isCertFile =
        file.certificateCurrent.length > 0 ||
        file.certificateVersions.length > 0;

      if (!isAdmin) {
        if (
          isInspectionFile &&
          !user.permissions.includes(PERMISSIONS.INSPECTION_VIEW)
        ) {
          throw new AppError('Forbidden', 403);
        }
        if (
          isCertFile &&
          !user.permissions.includes(PERMISSIONS.CERTIFICATE_VIEW)
        ) {
          throw new AppError('Forbidden', 403);
        }
      }

      const absolute = resolveStoragePath(file.path);
      if (!fs.existsSync(absolute)) {
        throw new AppError('File fisik tidak ditemukan', 404);
      }

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(file.originalName)}"`,
      );
      return res.sendFile(path.resolve(absolute));
    } catch (e) {
      next(e);
    }
  },
);
