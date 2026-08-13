import {
  PERMISSIONS,
  productionBatchCreateSchema,
  productionBatchUpdateSchema,
  productionLogCreateSchema,
  productionStatusChangeSchema,
} from '@siperbun/shared';
import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import type { AuthedRequest } from '../../utils/response';
import { success } from '../../utils/response';
import { productionBatchesService } from './production-batches.service';

export const productionBatchesRouter = Router();

productionBatchesRouter.use(authenticate);

productionBatchesRouter.get(
  '/',
  requirePermission(PERMISSIONS.PRODUCTION_VIEW),
  async (req, res, next) => {
    try {
      const result = await productionBatchesService.list({
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
        'Daftar batch produksi berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

productionBatchesRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTION_VIEW),
  async (req, res, next) => {
    try {
      const item = await productionBatchesService.getById(String(req.params.id));
      return success(res, item, 'Detail batch produksi berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

productionBatchesRouter.post(
  '/',
  requirePermission(PERMISSIONS.PRODUCTION_CREATE),
  validateBody(productionBatchCreateSchema),
  async (req, res, next) => {
    try {
      const item = await productionBatchesService.create(req.body);
      return success(res, item, 'Batch produksi berhasil ditambahkan', 201);
    } catch (e) {
      next(e);
    }
  },
);

productionBatchesRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTION_UPDATE),
  validateBody(productionBatchUpdateSchema),
  async (req, res, next) => {
    try {
      const item = await productionBatchesService.update(
        String(req.params.id),
        req.body,
      );
      return success(res, item, 'Batch produksi berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

productionBatchesRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTION_DELETE),
  async (req, res, next) => {
    try {
      const item = await productionBatchesService.softDelete(
        String(req.params.id),
      );
      return success(res, item, 'Batch produksi berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);

productionBatchesRouter.post(
  '/:id/logs',
  requirePermission(PERMISSIONS.PRODUCTION_UPDATE),
  validateBody(productionLogCreateSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await productionBatchesService.addLog(
        String(req.params.id),
        req.body,
        req.user!.id,
      );
      return success(res, item, 'Log produksi berhasil ditambahkan', 201);
    } catch (e) {
      next(e);
    }
  },
);

productionBatchesRouter.post(
  '/:id/change-status',
  requirePermission(PERMISSIONS.PRODUCTION_UPDATE),
  validateBody(productionStatusChangeSchema),
  async (req, res, next) => {
    try {
      const item = await productionBatchesService.changeStatus(
        String(req.params.id),
        req.body,
      );
      return success(res, item, 'Status produksi berhasil diubah');
    } catch (e) {
      next(e);
    }
  },
);
