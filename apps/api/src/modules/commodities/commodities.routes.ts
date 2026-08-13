import {
  commodityCreateSchema,
  commodityUpdateSchema,
  PERMISSIONS,
} from '@siperbun/shared';
import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { success } from '../../utils/response';
import { commoditiesService } from './commodities.service';

export const commoditiesRouter = Router();

commoditiesRouter.use(authenticate);

commoditiesRouter.get('/', async (req, res, next) => {
  try {
    const result = await commoditiesService.list({
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 50),
      search: req.query.search as string | undefined,
      isActive: req.query.isActive as string | undefined,
    });
    return success(
      res,
      result.items,
      'Daftar komoditas berhasil dimuat',
      200,
      result.meta,
    );
  } catch (e) {
    next(e);
  }
});

commoditiesRouter.get('/:id', async (req, res, next) => {
  try {
    const item = await commoditiesService.getById(String(req.params.id));
    return success(res, item, 'Detail komoditas berhasil dimuat');
  } catch (e) {
    next(e);
  }
});

commoditiesRouter.post(
  '/',
  requirePermission(PERMISSIONS.USER_MANAGE),
  validateBody(commodityCreateSchema),
  async (req, res, next) => {
    try {
      const item = await commoditiesService.create(req.body);
      return success(res, item, 'Komoditas berhasil ditambahkan', 201);
    } catch (e) {
      next(e);
    }
  },
);

commoditiesRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.USER_MANAGE),
  validateBody(commodityUpdateSchema),
  async (req, res, next) => {
    try {
      const item = await commoditiesService.update(String(req.params.id), req.body);
      return success(res, item, 'Komoditas berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

commoditiesRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.USER_MANAGE),
  async (req, res, next) => {
    try {
      const item = await commoditiesService.softDelete(String(req.params.id));
      return success(res, item, 'Komoditas berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);
