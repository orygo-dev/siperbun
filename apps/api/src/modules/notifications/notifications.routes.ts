import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { AuthedRequest, success } from '../../utils/response';
import { notificationsService } from './notifications.service';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get('/', async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const result = await notificationsService.list(user.id, {
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 20),
    });
    return success(
      res,
      result.items,
      'Notifikasi berhasil dimuat',
      200,
      result.meta,
    );
  } catch (e) {
    next(e);
  }
});

notificationsRouter.post('/read-all', async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const result = await notificationsService.markAllRead(user.id);
    return success(res, result, 'Semua notifikasi ditandai dibaca');
  } catch (e) {
    next(e);
  }
});

notificationsRouter.post('/:id/read', async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const item = await notificationsService.markRead(
      user.id,
      String(req.params.id),
    );
    return success(res, item, 'Notifikasi ditandai dibaca');
  } catch (e) {
    next(e);
  }
});
