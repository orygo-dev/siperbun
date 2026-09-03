import {
  fieldAssignmentUpdateSchema,
  fieldInspectionCreateSchema,
  PERMISSIONS,
} from '@siperbun/shared';
import { Router } from 'express';
import {
  authenticate,
  requireAnyPermission,
  requirePermission,
} from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { AuthedRequest, success } from '../../utils/response';
import { fieldAssignmentsService } from './field-assignments.service';

export const fieldAssignmentsRouter = Router();

fieldAssignmentsRouter.use(authenticate);

fieldAssignmentsRouter.get(
  '/',
  requireAnyPermission(
    PERMISSIONS.INSPECTION_VIEW,
    PERMISSIONS.APPLICATION_ASSIGN,
  ),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const result = await fieldAssignmentsService.list(
        {
          page: Number(req.query.page ?? 1),
          limit: Number(req.query.limit ?? 10),
          search: req.query.search as string | undefined,
          inspectorId: req.query.inspectorId as string | undefined,
          status: req.query.status as string | undefined,
          dateFrom: req.query.dateFrom as string | undefined,
          dateTo: req.query.dateTo as string | undefined,
        },
        user,
      );
      return success(
        res,
        result.items,
        'Daftar penugasan berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

fieldAssignmentsRouter.get(
  '/:id',
  requireAnyPermission(
    PERMISSIONS.INSPECTION_VIEW,
    PERMISSIONS.APPLICATION_ASSIGN,
  ),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await fieldAssignmentsService.getById(String(req.params.id), user);
      return success(res, item, 'Detail penugasan berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

fieldAssignmentsRouter.put(
  '/:id',
  requireAnyPermission(
    PERMISSIONS.APPLICATION_ASSIGN,
    PERMISSIONS.INSPECTION_EXECUTE,
  ),
  validateBody(fieldAssignmentUpdateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await fieldAssignmentsService.update(
        String(req.params.id),
        req.body,
        user,
      );
      return success(res, item, 'Penugasan berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

fieldAssignmentsRouter.post(
  '/:id/confirm',
  requirePermission(PERMISSIONS.INSPECTION_EXECUTE),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await fieldAssignmentsService.confirm(
        String(req.params.id),
        user,
      );
      return success(res, item, 'Penugasan dikonfirmasi');
    } catch (e) {
      next(e);
    }
  },
);

fieldAssignmentsRouter.post(
  '/:id/start-inspection',
  requirePermission(PERMISSIONS.INSPECTION_EXECUTE),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      // optional body counts — validate lightly if present
      const body = req.body ?? {};
      if (body.assignmentId || Object.keys(body).length > 0) {
        const parsed = fieldInspectionCreateSchema
          .partial()
          .omit({ assignmentId: true })
          .safeParse(body);
        if (!parsed.success && Object.keys(body).length > 0) {
          // ignore invalid optional fields — start without counts
        }
      }
      const item = await fieldAssignmentsService.startInspection(
        String(req.params.id),
        user,
        req.body,
      );
      return success(res, item, 'Pemeriksaan lapangan dimulai', 201);
    } catch (e) {
      next(e);
    }
  },
);
