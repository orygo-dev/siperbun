import {
  registerDeviceSchema,
  unregisterDeviceSchema,
} from '@siperbun/shared';
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { AuthedRequest, success } from '../../utils/response';
import { isPushConfigured } from './push.service';
import { notificationsService } from './notifications.service';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get('/devices', async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const items = await notificationsService.listDevices(user.id);
    return success(res, items, 'Perangkat push berhasil dimuat', 200, {
      pushEnabled: isPushConfigured(),
    });
  } catch (e) {
    next(e);
  }
});

notificationsRouter.post(
  '/devices',
  validateBody(registerDeviceSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await notificationsService.registerDevice(user.id, req.body);
      return success(res, item, 'Perangkat Android terdaftar untuk push', 201);
    } catch (e) {
      next(e);
    }
  },
);

notificationsRouter.delete(
  '/devices',
  validateBody(unregisterDeviceSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const result = await notificationsService.unregisterDevice(
        user.id,
        req.body.token,
      );
      return success(res, result, 'Perangkat dilepas dari push');
    } catch (e) {
      next(e);
    }
  },
);

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
