import {
  applicationNotesSchema,
  applicationStatusChangeSchema,
  assignInspectorSchema,
  certificationApplicationCreateSchema,
  certificationApplicationUpdateSchema,
  PERMISSIONS,
} from '@siperbun/shared';
import { Router } from 'express';
import {
  authenticate,
  requireAnyPermission,
  requirePermission,
} from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import type { AuthedRequest } from '../../utils/response';
import { success } from '../../utils/response';
import { certificationApplicationsService } from './certification-applications.service';

export const certificationApplicationsRouter = Router();

certificationApplicationsRouter.use(authenticate);

certificationApplicationsRouter.get(
  '/',
  requirePermission(PERMISSIONS.APPLICATION_VIEW),
  async (req, res, next) => {
    try {
      const result = await certificationApplicationsService.list({
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 10),
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        producerId: req.query.producerId as string | undefined,
        commodityId: req.query.commodityId as string | undefined,
      });
      return success(
        res,
        result.items,
        'Daftar pengajuan berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.post(
  '/',
  requirePermission(PERMISSIONS.APPLICATION_CREATE),
  validateBody(certificationApplicationCreateSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await certificationApplicationsService.create(
        req.body,
        req.user!.id,
      );
      return success(res, item, 'Pengajuan berhasil dibuat', 201);
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.APPLICATION_VIEW),
  async (req, res, next) => {
    try {
      const item = await certificationApplicationsService.getById(
        String(req.params.id),
      );
      return success(res, item, 'Detail pengajuan berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.APPLICATION_CREATE),
  validateBody(certificationApplicationUpdateSchema),
  async (req, res, next) => {
    try {
      const item = await certificationApplicationsService.update(
        String(req.params.id),
        req.body,
      );
      return success(res, item, 'Pengajuan berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.post(
  '/:id/submit',
  requireAnyPermission(
    PERMISSIONS.APPLICATION_CREATE,
    PERMISSIONS.APPLICATION_VERIFY,
  ),
  validateBody(applicationNotesSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await certificationApplicationsService.submit(
        String(req.params.id),
        req.user!.id,
        req.body.notes,
      );
      return success(res, item, 'Pengajuan berhasil diajukan');
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.post(
  '/:id/verify',
  requirePermission(PERMISSIONS.APPLICATION_VERIFY),
  validateBody(applicationNotesSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await certificationApplicationsService.verify(
        String(req.params.id),
        req.user!.id,
        req.body.notes,
      );
      return success(res, item, 'Pengajuan berhasil diverifikasi');
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.post(
  '/:id/request-revision',
  requirePermission(PERMISSIONS.APPLICATION_VERIFY),
  validateBody(applicationNotesSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await certificationApplicationsService.requestRevision(
        String(req.params.id),
        req.user!.id,
        req.body.notes,
      );
      return success(res, item, 'Permintaan perbaikan berhasil dikirim');
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.post(
  '/:id/assign-inspector',
  requirePermission(PERMISSIONS.APPLICATION_ASSIGN),
  validateBody(assignInspectorSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await certificationApplicationsService.assignInspector(
        String(req.params.id),
        req.body,
        req.user!.id,
      );
      return success(res, item, 'PBT berhasil ditugaskan');
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.post(
  '/:id/change-status',
  requirePermission(PERMISSIONS.APPLICATION_VERIFY),
  validateBody(applicationStatusChangeSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await certificationApplicationsService.changeStatus(
        String(req.params.id),
        req.body,
        req.user!.id,
      );
      return success(res, item, 'Status pengajuan berhasil diubah');
    } catch (e) {
      next(e);
    }
  },
);
