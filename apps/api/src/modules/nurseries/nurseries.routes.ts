import {
  nurseryCreateSchema,
  nurseryUpdateSchema,
  PERMISSIONS,
} from '@siperbun/shared';
import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { success } from '../../utils/response';
import { nurseriesService } from './nurseries.service';

export const nurseriesRouter = Router();

nurseriesRouter.use(authenticate);

nurseriesRouter.get(
  '/',
  requirePermission(PERMISSIONS.NURSERY_VIEW),
  async (req, res, next) => {
    try {
      const result = await nurseriesService.list({
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 10),
        search: req.query.search as string | undefined,
        producerId: req.query.producerId as string | undefined,
        status: req.query.status as string | undefined,
      });
      return success(
        res,
        result.items,
        'Daftar lokasi pembibitan berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

nurseriesRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.NURSERY_VIEW),
  async (req, res, next) => {
    try {
      const item = await nurseriesService.getById(String(req.params.id));
      return success(res, item, 'Detail lokasi pembibitan berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

nurseriesRouter.post(
  '/',
  requirePermission(PERMISSIONS.NURSERY_CREATE),
  validateBody(nurseryCreateSchema),
  async (req, res, next) => {
    try {
      const item = await nurseriesService.create(req.body);
      return success(res, item, 'Lokasi pembibitan berhasil ditambahkan', 201);
    } catch (e) {
      next(e);
    }
  },
);

nurseriesRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.NURSERY_UPDATE),
  validateBody(nurseryUpdateSchema),
  async (req, res, next) => {
    try {
      const item = await nurseriesService.update(String(req.params.id), req.body);
      return success(res, item, 'Lokasi pembibitan berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

nurseriesRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.NURSERY_DELETE),
  async (req, res, next) => {
    try {
      const item = await nurseriesService.softDelete(String(req.params.id));
      return success(res, item, 'Lokasi pembibitan berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);
