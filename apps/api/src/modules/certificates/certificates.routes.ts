import {
  certificateCancelSchema,
  certificateCreateSchema,
  certificateReplaceScanSchema,
  certificateUpdateSchema,
  certificateVerifyScanSchema,
  PERMISSIONS,
} from '@siperbun/shared';
import { Router, type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  authenticate,
  requireAnyPermission,
  requirePermission,
} from '../../middlewares/auth';
import { uploadSingle } from '../../middlewares/upload';
import { validateBody } from '../../middlewares/validate';
import { AppError } from '../../utils/errors';
import { AuthedRequest, success } from '../../utils/response';
import { resolveStoragePath } from '../../utils/storage';
import { certificatesService } from './certificates.service';

export const certificatesRouter = Router();

certificatesRouter.use(authenticate);

certificatesRouter.get(
  '/',
  requirePermission(PERMISSIONS.CERTIFICATE_VIEW),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const result = await certificatesService.list({
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 10),
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        producerId: req.query.producerId as string | undefined,
      }, user);
      return success(
        res,
        result.items,
        'Daftar sertifikat berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

certificatesRouter.post(
  '/',
  requireAnyPermission(
    PERMISSIONS.CERTIFICATE_UPLOAD,
    PERMISSIONS.APPLICATION_VERIFY,
  ),
  validateBody(certificateCreateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await certificatesService.create(req.body, user.id);
      return success(res, item, 'Sertifikat berhasil dibuat', 201);
    } catch (e) {
      next(e);
    }
  },
);

certificatesRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.CERTIFICATE_VIEW),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await certificatesService.getById(String(req.params.id), user);
      return success(res, item, 'Detail sertifikat berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

certificatesRouter.put(
  '/:id',
  requireAnyPermission(
    PERMISSIONS.CERTIFICATE_UPLOAD,
    PERMISSIONS.APPLICATION_VERIFY,
  ),
  validateBody(certificateUpdateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await certificatesService.update(
        String(req.params.id),
        req.body,
        user.id,
      );
      return success(res, item, 'Sertifikat berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

function handleUpload(req: Request, res: Response, next: NextFunction) {
  uploadSingle(req, res, (err) => {
    if (err) {
      if (err instanceof AppError) return next(err);
      const message =
        err instanceof Error ? err.message : 'Gagal mengunggah file';
      return next(new AppError(message, 400));
    }
    next();
  });
}

certificatesRouter.post(
  '/:id/upload-scan',
  requirePermission(PERMISSIONS.CERTIFICATE_UPLOAD),
  handleUpload,
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      if (!req.file) throw new AppError('File wajib diunggah', 400);
      const item = await certificatesService.uploadScan(
        String(req.params.id),
        req.file,
        user.id,
      );
      return success(res, item, 'Scan sertifikat berhasil diunggah', 201);
    } catch (e) {
      next(e);
    }
  },
);

certificatesRouter.post(
  '/:id/verify-scan',
  requirePermission(PERMISSIONS.CERTIFICATE_VERIFY),
  validateBody(certificateVerifyScanSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await certificatesService.verifyScan(
        String(req.params.id),
        req.body,
        user.id,
      );
      return success(
        res,
        item,
        req.body.approved
          ? 'Scan sertifikat disetujui'
          : 'Scan sertifikat ditolak',
      );
    } catch (e) {
      next(e);
    }
  },
);

certificatesRouter.post(
  '/:id/replace-scan',
  requirePermission(PERMISSIONS.CERTIFICATE_REPLACE),
  handleUpload,
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      if (!req.file) throw new AppError('File wajib diunggah', 400);
      const parsed = certificateReplaceScanSchema.safeParse({
        reason: req.body?.reason,
      });
      if (!parsed.success) {
        throw new AppError('Data tidak valid', 400, {
          form: parsed.error.issues.map((i) => i.message),
        });
      }
      const item = await certificatesService.replaceScan(
        String(req.params.id),
        req.file,
        parsed.data,
        user.id,
      );
      return success(res, item, 'Scan sertifikat berhasil diganti');
    } catch (e) {
      next(e);
    }
  },
);

certificatesRouter.post(
  '/:id/cancel',
  requireAnyPermission(
    PERMISSIONS.CERTIFICATE_VERIFY,
    PERMISSIONS.CERTIFICATE_UPLOAD,
  ),
  validateBody(certificateCancelSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await certificatesService.cancel(
        String(req.params.id),
        req.body,
        user.id,
      );
      return success(res, item, 'Sertifikat berhasil dibatalkan');
    } catch (e) {
      next(e);
    }
  },
);

certificatesRouter.get(
  '/:id/download',
  requirePermission(PERMISSIONS.CERTIFICATE_VIEW),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const file = await certificatesService.getDownloadFile(
        String(req.params.id),
        user,
      );
      const absolute = resolveStoragePath(file.path);
      if (!fs.existsSync(absolute)) {
        throw new AppError('File fisik tidak ditemukan', 404);
      }
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      );
      return res.sendFile(path.resolve(absolute));
    } catch (e) {
      next(e);
    }
  },
);
