import { PERMISSIONS } from '@siperbun/shared';
import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth';
import { success } from '../../utils/response';
import { auditLogsService } from './audit-logs.service';

export const auditLogsRouter = Router();

auditLogsRouter.use(authenticate);

auditLogsRouter.get(
  '/',
  requirePermission(PERMISSIONS.AUDIT_VIEW),
  async (req, res, next) => {
    try {
      const result = await auditLogsService.list({
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 20),
        module: req.query.module as string | undefined,
        action: req.query.action as string | undefined,
        userId: req.query.userId as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        search: req.query.search as string | undefined,
      });
      return success(
        res,
        result.items,
        'Daftar audit log berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

auditLogsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.AUDIT_VIEW),
  async (req, res, next) => {
    try {
      const item = await auditLogsService.getById(String(req.params.id));
      return success(res, item, 'Detail audit log berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);
