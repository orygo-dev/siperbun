import {
  PERMISSIONS,
  regionCreateSchema,
  regionUpdateSchema,
} from '@siperbun/shared';
import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { success } from '../../utils/response';
import { regionsService } from './regions.service';

export const regionsRouter = Router();

regionsRouter.use(authenticate);

regionsRouter.get('/tree', async (_req, res, next) => {
  try {
    const tree = await regionsService.tree();
    return success(res, tree, 'Pohon wilayah berhasil dimuat');
  } catch (e) {
    next(e);
  }
});

regionsRouter.get('/', async (req, res, next) => {
  try {
    const result = await regionsService.list({
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 50),
      search: req.query.search as string | undefined,
      type: req.query.type as string | undefined,
      parentId: req.query.parentId as string | undefined,
    });
    return success(res, result.items, 'Daftar wilayah berhasil dimuat', 200, result.meta);
  } catch (e) {
    next(e);
  }
});

regionsRouter.get('/:id', async (req, res, next) => {
  try {
    const item = await regionsService.getById(String(req.params.id));
    return success(res, item, 'Detail wilayah berhasil dimuat');
  } catch (e) {
    next(e);
  }
});

regionsRouter.post(
  '/',
  requirePermission(PERMISSIONS.USER_MANAGE),
  validateBody(regionCreateSchema),
  async (req, res, next) => {
    try {
      const item = await regionsService.create(req.body);
      return success(res, item, 'Wilayah berhasil ditambahkan', 201);
    } catch (e) {
      next(e);
    }
  },
);

regionsRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.USER_MANAGE),
  validateBody(regionUpdateSchema),
  async (req, res, next) => {
    try {
      const item = await regionsService.update(String(req.params.id), req.body);
      return success(res, item, 'Wilayah berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

regionsRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.USER_MANAGE),
  async (req, res, next) => {
    try {
      const item = await regionsService.softDelete(String(req.params.id));
      return success(res, item, 'Wilayah berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);
