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
import { isInspectorUser, isProducerUser, requireProducerId } from '../../utils/access-scope';

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
          inspectionPhotos: {
            select: {
              inspection: {
                select: {
                  inspectorId: true,
                  assignment: { select: { application: { select: { producerId: true } } } },
                },
              },
            },
          },
          correctiveActions: {
            select: {
              finding: {
                select: {
                  application: { select: { producerId: true } },
                  inspection: { select: { inspectorId: true } },
                },
              },
            },
          },
          certificateCurrent: {
            select: {
              producerId: true,
              application: { select: { assignments: { select: { inspectorId: true } } } },
            },
          },
          certificateVersions: {
            select: {
              certificate: {
                select: {
                  producerId: true,
                  application: { select: { assignments: { select: { inspectorId: true } } } },
                },
              },
            },
          },
          applicationDocuments: {
            select: { application: { select: { producerId: true } } },
          },
          inspectionReports: {
            select: {
              application: {
                select: {
                  producerId: true,
                  assignments: { select: { inspectorId: true } },
                },
              },
            },
          },
          paymentProofs: {
            select: {
              invoice: {
                select: {
                  application: {
                    select: {
                      producerId: true,
                      assignments: { select: { inspectorId: true } },
                    },
                  },
                },
              },
            },
          },
          producerDocuments: { select: { producerId: true } },
          registrationDocuments: {
            select: {
              registration: { select: { createdProducerId: true, email: true } },
            },
          },
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

      if (isProducerUser(user)) {
        const producerId = requireProducerId(user);
        const ownsFile =
          file.inspectionPhotos.some(
            (item) => item.inspection.assignment.application.producerId === producerId,
          ) ||
          file.correctiveActions.some(
            (item) => item.finding.application?.producerId === producerId,
          ) ||
          file.certificateCurrent.some((item) => item.producerId === producerId) ||
          file.certificateVersions.some(
            (item) => item.certificate.producerId === producerId,
          ) ||
          file.applicationDocuments.some(
            (item) => item.application.producerId === producerId,
          ) ||
          file.inspectionReports.some(
            (item) => item.application.producerId === producerId,
          ) ||
          file.paymentProofs.some(
            (item) => item.invoice.application.producerId === producerId,
          ) ||
          file.producerDocuments.some((item) => item.producerId === producerId) ||
          file.registrationDocuments.some(
            (item) =>
              item.registration.createdProducerId === producerId ||
              item.registration.email === user.email,
          );
        if (!ownsFile) throw new AppError('File tidak ditemukan', 404);
      }

      if (isInspectorUser(user)) {
        const canAccessFile =
          file.inspectionPhotos.some(
            (item) => item.inspection.inspectorId === user.id,
          ) ||
          file.correctiveActions.some(
            (item) => item.finding.inspection?.inspectorId === user.id,
          ) ||
          file.certificateCurrent.some((item) =>
            item.application.assignments.some((assignment) => assignment.inspectorId === user.id),
          ) ||
          file.certificateVersions.some((item) =>
            item.certificate.application.assignments.some(
              (assignment) => assignment.inspectorId === user.id,
            ),
          ) ||
          file.inspectionReports.some((item) =>
            item.application.assignments.some(
              (assignment) => assignment.inspectorId === user.id,
            ),
          ) ||
          file.paymentProofs.some((item) =>
            item.invoice.application.assignments.some(
              (assignment) => assignment.inspectorId === user.id,
            ),
          );
        if (!canAccessFile) throw new AppError('File tidak ditemukan', 404);
      }

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
