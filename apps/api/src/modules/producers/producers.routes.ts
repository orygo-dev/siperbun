import {
  PERMISSIONS,
  producerCreateSchema,
  producerUpdateSchema,
} from '@siperbun/shared';
import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { AuthedRequest, success } from '../../utils/response';
import { producersService } from './producers.service';

export const producersRouter = Router();

producersRouter.use(authenticate);

producersRouter.get(
  '/',
  requirePermission(PERMISSIONS.PRODUCER_VIEW),
  async (req, res, next) => {
    try {
      const result = await producersService.list({
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 10),
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        kabupatenId: req.query.kabupatenId as string | undefined,
        isActive: req.query.isActive as string | undefined,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      }, (req as AuthedRequest).user!);
      return success(
        res,
        result.items,
        'Daftar penangkar berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

producersRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCER_VIEW),
  async (req, res, next) => {
    try {
      const item = await producersService.getById(
        String(req.params.id),
        (req as AuthedRequest).user!,
      );
      return success(res, item, 'Detail penangkar berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

producersRouter.post(
  '/',
  requirePermission(PERMISSIONS.PRODUCER_CREATE),
  validateBody(producerCreateSchema),
  async (req, res, next) => {
    try {
      const item = await producersService.create(req.body);
      return success(res, item, 'Penangkar berhasil ditambahkan', 201);
    } catch (e) {
      next(e);
    }
  },
);

producersRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCER_UPDATE),
  validateBody(producerUpdateSchema),
  async (req, res, next) => {
    try {
      const item = await producersService.update(String(req.params.id), req.body);
      return success(res, item, 'Penangkar berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

producersRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCER_DELETE),
  async (req, res, next) => {
    try {
      const item = await producersService.softDelete(String(req.params.id));
      return success(res, item, 'Penangkar berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);

producersRouter.post(
  '/:id/verify',
  requirePermission(PERMISSIONS.PRODUCER_UPDATE),
  async (req, res, next) => {
    try {
      const item = await producersService.verify(String(req.params.id));
      return success(res, item, 'Penangkar berhasil diverifikasi');
    } catch (e) {
      next(e);
    }
  },
);

producersRouter.post(
  '/:id/activate',
  requirePermission(PERMISSIONS.PRODUCER_UPDATE),
  async (req, res, next) => {
    try {
      const item = await producersService.activate(String(req.params.id));
      return success(res, item, 'Penangkar berhasil diaktifkan');
    } catch (e) {
      next(e);
    }
  },
);

producersRouter.post(
  '/:id/deactivate',
  requirePermission(PERMISSIONS.PRODUCER_UPDATE),
  async (req, res, next) => {
    try {
      const item = await producersService.deactivate(String(req.params.id));
      return success(res, item, 'Penangkar berhasil dinonaktifkan');
    } catch (e) {
      next(e);
    }
  },
);
