import {
  PERMISSIONS,
  seedGardenCreateSchema,
  seedGardenUpdateSchema,
} from '@siperbun/shared';
import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { success } from '../../utils/response';
import { seedGardensService } from './seed-gardens.service';

export const seedGardensRouter = Router();

seedGardensRouter.use(authenticate);

seedGardensRouter.get(
  '/',
  requirePermission(PERMISSIONS.SEED_GARDEN_VIEW),
  async (req, res, next) => {
    try {
      const result = await seedGardensService.list({
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 10),
        search: req.query.search as string | undefined,
        producerId: req.query.producerId as string | undefined,
        commodityId: req.query.commodityId as string | undefined,
        status: req.query.status as string | undefined,
      });
      return success(
        res,
        result.items,
        'Daftar kebun sumber berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

seedGardensRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.SEED_GARDEN_VIEW),
  async (req, res, next) => {
    try {
      const item = await seedGardensService.getById(String(req.params.id));
      return success(res, item, 'Detail kebun sumber berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

seedGardensRouter.post(
  '/',
  requirePermission(PERMISSIONS.SEED_GARDEN_CREATE),
  validateBody(seedGardenCreateSchema),
  async (req, res, next) => {
    try {
      const item = await seedGardensService.create(req.body);
      return success(res, item, 'Kebun sumber berhasil ditambahkan', 201);
    } catch (e) {
      next(e);
    }
  },
);

seedGardensRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.SEED_GARDEN_UPDATE),
  validateBody(seedGardenUpdateSchema),
  async (req, res, next) => {
    try {
      const item = await seedGardensService.update(String(req.params.id), req.body);
      return success(res, item, 'Kebun sumber berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

seedGardensRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.SEED_GARDEN_DELETE),
  async (req, res, next) => {
    try {
      const item = await seedGardensService.softDelete(String(req.params.id));
      return success(res, item, 'Kebun sumber berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);
