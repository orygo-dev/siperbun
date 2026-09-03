import {
  circulationFindingCreateSchema,
  circulationInspectionCreateSchema,
  circulationInspectionUpdateSchema,
  PERMISSIONS,
} from '@siperbun/shared';
import { Router } from 'express';
import {
  authenticate,
  requirePermission,
} from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { AuthedRequest, success } from '../../utils/response';
import { circulationInspectionsService } from './circulation-inspections.service';

export const circulationInspectionsRouter = Router();

circulationInspectionsRouter.use(authenticate);

circulationInspectionsRouter.get(
  '/',
  requirePermission(PERMISSIONS.INSPECTION_VIEW),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const result = await circulationInspectionsService.list(
        {
          page: Number(req.query.page ?? 1),
          limit: Number(req.query.limit ?? 10),
          search: req.query.search as string | undefined,
          dateFrom: req.query.dateFrom as string | undefined,
          dateTo: req.query.dateTo as string | undefined,
        },
        user,
      );
      return success(
        res,
        result.items,
        'Daftar pengawasan peredaran berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

circulationInspectionsRouter.post(
  '/',
  requirePermission(PERMISSIONS.INSPECTION_EXECUTE),
  validateBody(circulationInspectionCreateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await circulationInspectionsService.create(
        req.body,
        user.id,
        user,
      );
      return success(res, item, 'Pengawasan peredaran berhasil dicatat', 201);
    } catch (e) {
      next(e);
    }
  },
);

circulationInspectionsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.INSPECTION_VIEW),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await circulationInspectionsService.getById(
        String(req.params.id),
        user,
      );
      return success(res, item, 'Detail pengawasan peredaran berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

circulationInspectionsRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.INSPECTION_EXECUTE),
  validateBody(circulationInspectionUpdateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await circulationInspectionsService.update(
        String(req.params.id),
        req.body,
        user.id,
        user,
      );
      return success(res, item, 'Pengawasan peredaran berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

circulationInspectionsRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.INSPECTION_EXECUTE),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await circulationInspectionsService.softDelete(
        String(req.params.id),
        user.id,
        user,
      );
      return success(res, item, 'Pengawasan peredaran berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);

circulationInspectionsRouter.post(
  '/:id/findings',
  requirePermission(PERMISSIONS.INSPECTION_EXECUTE),
  validateBody(circulationFindingCreateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await circulationInspectionsService.addFinding(
        String(req.params.id),
        req.body,
        user.id,
        user,
      );
      return success(res, item, 'Temuan pengawasan berhasil ditambahkan', 201);
    } catch (e) {
      next(e);
    }
  },
);
