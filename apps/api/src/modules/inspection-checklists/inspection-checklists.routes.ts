import { PERMISSIONS } from '@siperbun/shared';
import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth';
import { prisma } from '../../config/database';
import { success } from '../../utils/response';

export const inspectionChecklistsRouter = Router();

inspectionChecklistsRouter.use(authenticate);

inspectionChecklistsRouter.get(
  '/',
  requirePermission(PERMISSIONS.INSPECTION_VIEW),
  async (req, res, next) => {
    try {
      const commodityId = req.query.commodityId as string | undefined;
      const items = await prisma.inspectionChecklist.findMany({
        where: {
          isActive: true,
          OR: [
            { commodityId: null },
            ...(commodityId ? [{ commodityId }] : []),
          ],
        },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      });
      return success(res, items, 'Daftar checklist berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);
