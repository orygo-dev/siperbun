import {
  fieldInspectionCreateSchema,
  fieldInspectionUpdateSchema,
  finalizeInspectionSchema,
  inspectionFindingCreateSchema,
  inspectionResultsUpsertSchema,
  PERMISSIONS,
  validateInspectionSchema,
} from '@siperbun/shared';
import { Router } from 'express';
import {
  authenticate,
  requireAnyPermission,
  requirePermission,
} from '../../middlewares/auth';
import { uploadSingle } from '../../middlewares/upload';
import { validateBody } from '../../middlewares/validate';
import { AppError } from '../../utils/errors';
import { AuthedRequest, success } from '../../utils/response';
import { fieldInspectionsService } from './field-inspections.service';

export const fieldInspectionsRouter = Router();

fieldInspectionsRouter.use(authenticate);

fieldInspectionsRouter.get(
  '/',
  requirePermission(PERMISSIONS.INSPECTION_VIEW),
  async (req, res, next) => {
    try {
      const result = await fieldInspectionsService.list({
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 10),
        search: req.query.search as string | undefined,
        inspectorId: req.query.inspectorId as string | undefined,
        isFinalized: req.query.isFinalized as string | undefined,
      });
      return success(
        res,
        result.items,
        'Daftar pemeriksaan berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

fieldInspectionsRouter.post(
  '/',
  requirePermission(PERMISSIONS.INSPECTION_EXECUTE),
  validateBody(fieldInspectionCreateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await fieldInspectionsService.create(req.body, user);
      return success(res, item, 'Pemeriksaan berhasil dibuat', 201);
    } catch (e) {
      next(e);
    }
  },
);

fieldInspectionsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.INSPECTION_VIEW),
  async (req, res, next) => {
    try {
      const item = await fieldInspectionsService.getById(String(req.params.id));
      return success(res, item, 'Detail pemeriksaan berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

fieldInspectionsRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.INSPECTION_EXECUTE),
  validateBody(fieldInspectionUpdateSchema),
  async (req, res, next) => {
    try {
      const item = await fieldInspectionsService.update(
        String(req.params.id),
        req.body,
      );
      return success(res, item, 'Pemeriksaan berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

fieldInspectionsRouter.post(
  '/:id/photos',
  requirePermission(PERMISSIONS.INSPECTION_EXECUTE),
  (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        if (err instanceof AppError) return next(err);
        const message =
          err instanceof Error ? err.message : 'Gagal mengunggah file';
        return next(new AppError(message, 400));
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const file = req.file;
      if (!file) throw new AppError('File wajib diunggah', 400);
      const item = await fieldInspectionsService.addPhoto(
        String(req.params.id),
        file,
        {
          caption: (req.body?.caption as string | undefined) ?? null,
          uploadedById: user.id,
        },
      );
      return success(res, item, 'Foto berhasil diunggah', 201);
    } catch (e) {
      next(e);
    }
  },
);

fieldInspectionsRouter.post(
  '/:id/findings',
  requirePermission(PERMISSIONS.INSPECTION_EXECUTE),
  validateBody(inspectionFindingCreateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await fieldInspectionsService.addFinding(
        String(req.params.id),
        req.body,
        user.id,
      );
      return success(res, item, 'Temuan berhasil ditambahkan', 201);
    } catch (e) {
      next(e);
    }
  },
);

fieldInspectionsRouter.post(
  '/:id/results',
  requirePermission(PERMISSIONS.INSPECTION_EXECUTE),
  validateBody(inspectionResultsUpsertSchema),
  async (req, res, next) => {
    try {
      const item = await fieldInspectionsService.upsertResults(
        String(req.params.id),
        req.body,
      );
      return success(res, item, 'Hasil checklist berhasil disimpan');
    } catch (e) {
      next(e);
    }
  },
);

fieldInspectionsRouter.post(
  '/:id/finalize',
  requireAnyPermission(
    PERMISSIONS.INSPECTION_FINALIZE,
    PERMISSIONS.INSPECTION_EXECUTE,
  ),
  validateBody(finalizeInspectionSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await fieldInspectionsService.finalize(
        String(req.params.id),
        req.body,
        user,
      );
      return success(res, item, 'Pemeriksaan berhasil difinalisasi');
    } catch (e) {
      next(e);
    }
  },
);

fieldInspectionsRouter.post(
  '/:id/validate',
  requirePermission(PERMISSIONS.APPLICATION_VERIFY),
  validateBody(validateInspectionSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await fieldInspectionsService.validate(
        String(req.params.id),
        req.body,
        user,
      );
      return success(res, item, 'Hasil pemeriksaan berhasil divalidasi');
    } catch (e) {
      next(e);
    }
  },
);
