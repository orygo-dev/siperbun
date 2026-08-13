import {
  PERMISSIONS,
  varietyCreateSchema,
  varietyUpdateSchema,
} from '@siperbun/shared';
import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { success } from '../../utils/response';
import { varietiesService } from './varieties.service';

export const varietiesRouter = Router();

varietiesRouter.use(authenticate);

varietiesRouter.get('/', async (req, res, next) => {
  try {
    const result = await varietiesService.list({
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 50),
      search: req.query.search as string | undefined,
      commodityId: req.query.commodityId as string | undefined,
    });
    return success(
      res,
      result.items,
      'Daftar varietas berhasil dimuat',
      200,
      result.meta,
    );
  } catch (e) {
    next(e);
  }
});

varietiesRouter.get('/:id', async (req, res, next) => {
  try {
    const item = await varietiesService.getById(String(req.params.id));
    return success(res, item, 'Detail varietas berhasil dimuat');
  } catch (e) {
    next(e);
  }
});

varietiesRouter.post(
  '/',
  requirePermission(PERMISSIONS.USER_MANAGE),
  validateBody(varietyCreateSchema),
  async (req, res, next) => {
    try {
      const item = await varietiesService.create(req.body);
      return success(res, item, 'Varietas berhasil ditambahkan', 201);
    } catch (e) {
      next(e);
    }
  },
);

varietiesRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.USER_MANAGE),
  validateBody(varietyUpdateSchema),
  async (req, res, next) => {
    try {
      const item = await varietiesService.update(String(req.params.id), req.body);
      return success(res, item, 'Varietas berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

varietiesRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.USER_MANAGE),
  async (req, res, next) => {
    try {
      const item = await varietiesService.softDelete(String(req.params.id));
      return success(res, item, 'Varietas berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);
