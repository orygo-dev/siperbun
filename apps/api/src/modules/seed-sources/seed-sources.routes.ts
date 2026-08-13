import {
  PERMISSIONS,
  seedSourceCreateSchema,
  seedSourceUpdateSchema,
} from '@siperbun/shared';
import { Router } from 'express';
import {
  authenticate,
  requireAnyPermission,
  requirePermission,
} from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { success } from '../../utils/response';
import { seedSourcesService } from './seed-sources.service';

export const seedSourcesRouter = Router();

seedSourcesRouter.use(authenticate);

seedSourcesRouter.get(
  '/',
  requirePermission(PERMISSIONS.PRODUCTION_VIEW),
  async (req, res, next) => {
    try {
      const result = await seedSourcesService.list({
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 10),
        search: req.query.search as string | undefined,
        producerId: req.query.producerId as string | undefined,
        commodityId: req.query.commodityId as string | undefined,
        verificationStatus: req.query.verificationStatus as string | undefined,
      });
      return success(
        res,
        result.items,
        'Daftar sumber benih berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

seedSourcesRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTION_VIEW),
  async (req, res, next) => {
    try {
      const item = await seedSourcesService.getById(String(req.params.id));
      return success(res, item, 'Detail sumber benih berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

seedSourcesRouter.post(
  '/',
  requirePermission(PERMISSIONS.PRODUCTION_CREATE),
  validateBody(seedSourceCreateSchema),
  async (req, res, next) => {
    try {
      const item = await seedSourcesService.create(req.body);
      return success(res, item, 'Sumber benih berhasil ditambahkan', 201);
    } catch (e) {
      next(e);
    }
  },
);

seedSourcesRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTION_UPDATE),
  validateBody(seedSourceUpdateSchema),
  async (req, res, next) => {
    try {
      const item = await seedSourcesService.update(
        String(req.params.id),
        req.body,
      );
      return success(res, item, 'Sumber benih berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

seedSourcesRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTION_DELETE),
  async (req, res, next) => {
    try {
      const item = await seedSourcesService.softDelete(String(req.params.id));
      return success(res, item, 'Sumber benih berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);

seedSourcesRouter.post(
  '/:id/verify',
  requireAnyPermission(
    PERMISSIONS.PRODUCTION_UPDATE,
    PERMISSIONS.APPLICATION_VERIFY,
  ),
  async (req, res, next) => {
    try {
      const item = await seedSourcesService.verify(String(req.params.id));
      return success(res, item, 'Sumber benih berhasil diverifikasi');
    } catch (e) {
      next(e);
    }
  },
);
