import { REFRESH_COOKIE_NAME, loginSchema } from '@siperbun/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { AuthedRequest, success } from '../../utils/response';
import {
  authService,
  changePasswordSchema,
  forgotPasswordSchema,
  profileUpdateSchema,
  resetPasswordSchema,
} from './auth.service';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan. Coba lagi nanti.',
  },
});

export const authRouter = Router();

authRouter.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  async (req, res, next) => {
    try {
      const data = await authService.login(
        req.body,
        {
          ip: req.ip,
          ua: req.headers['user-agent'],
        },
        res,
      );
      return success(res, data, 'Login berhasil');
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post('/refresh', authLimiter, async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    const data = await authService.refresh(token, res);
    return success(res, data, 'Token diperbarui');
  } catch (e) {
    next(e);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    await authService.logout(token, res);
    return success(res, null, 'Logout berhasil');
  } catch (e) {
    next(e);
  }
});

authRouter.post('/logout-all', authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    await authService.logoutAll(user.id, res);
    return success(res, null, 'Logout dari semua perangkat berhasil');
  } catch (e) {
    next(e);
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const data = await authService.me(user.id);
    return success(res, data, 'Profil berhasil dimuat');
  } catch (e) {
    next(e);
  }
});

authRouter.patch(
  '/profile',
  authenticate,
  validateBody(profileUpdateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const data = await authService.updateProfile(user.id, req.body);
      return success(res, data, 'Profil berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  '/change-password',
  authenticate,
  authLimiter,
  validateBody(changePasswordSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const data = await authService.changePassword(user.id, req.body);
      return success(res, data, 'Password berhasil diganti');
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  '/forgot-password',
  authLimiter,
  validateBody(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const data = await authService.forgotPassword(req.body.email);
      return success(res, data, data.message);
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  '/reset-password',
  authLimiter,
  validateBody(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const data = await authService.resetPassword(
        req.body.token,
        req.body.password,
      );
      return success(res, data, data.message);
    } catch (e) {
      next(e);
    }
  },
);
