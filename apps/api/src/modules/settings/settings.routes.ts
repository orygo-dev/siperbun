import {
  BANNER_PLACEMENTS,
  PERMISSIONS,
  brandingUpdateSchema,
  dashboardBannerCreateSchema,
  dashboardBannerUpdateSchema,
  type BannerPlacement,
} from '@siperbun/shared';
import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth';
import { uploadSingle } from '../../middlewares/upload';
import { validateBody } from '../../middlewares/validate';
import { AppError } from '../../utils/errors';
import { AuthedRequest, success } from '../../utils/response';
import { bannersService } from './banners.service';
import { settingsService } from './settings.service';

function parsePlacement(value: unknown): BannerPlacement | undefined {
  if (value === BANNER_PLACEMENTS.MOBILE) return BANNER_PLACEMENTS.MOBILE;
  if (value === BANNER_PLACEMENTS.DASHBOARD) return BANNER_PLACEMENTS.DASHBOARD;
  return undefined;
}

export const settingsRouter = Router();

/** Publik — dipakai halaman login & branding UI */
settingsRouter.get('/branding', async (_req, res, next) => {
  try {
    return success(
      res,
      await settingsService.getBranding(),
      'Branding berhasil dimuat',
    );
  } catch (e) {
    next(e);
  }
});

/** Publik — stream logo tanpa auth */
settingsRouter.get('/branding/logo', async (_req, res, next) => {
  try {
    const logo = await settingsService.getLogoAbsolutePath();
    if (!logo) throw new AppError('Logo belum diatur', 404);
    res.setHeader('Content-Type', logo.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(logo.originalName)}"`,
    );
    return res.sendFile(logo.absolute);
  } catch (e) {
    next(e);
  }
});

settingsRouter.put(
  '/branding',
  authenticate,
  requirePermission(PERMISSIONS.USER_MANAGE),
  validateBody(brandingUpdateSchema),
  async (req, res, next) => {
    try {
      const data = await settingsService.updateBranding(req.body);
      return success(res, data, 'Branding berhasil disimpan');
    } catch (e) {
      next(e);
    }
  },
);

settingsRouter.post(
  '/branding/logo',
  authenticate,
  requirePermission(PERMISSIONS.USER_MANAGE),
  uploadSingle,
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError('File logo wajib diunggah', 400);
      const user = (req as AuthedRequest).user;
      const data = await settingsService.uploadLogo(req.file, user?.id);
      return success(res, data, 'Logo berhasil diunggah');
    } catch (e) {
      next(e);
    }
  },
);

settingsRouter.delete(
  '/branding/logo',
  authenticate,
  requirePermission(PERMISSIONS.USER_MANAGE),
  async (_req, res, next) => {
    try {
      const data = await settingsService.clearLogo();
      return success(res, data, 'Logo berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);

/** Publik — daftar banner aktif (portal & dashboard) */
settingsRouter.get('/banners/active', async (req, res, next) => {
  try {
    const placement =
      parsePlacement(req.query.placement) ?? BANNER_PLACEMENTS.DASHBOARD;
    return success(
      res,
      await bannersService.listActive(placement),
      'Banner aktif',
    );
  } catch (e) {
    next(e);
  }
});

/** Publik — stream gambar banner */
settingsRouter.get('/banners/:id/image', async (req, res, next) => {
  try {
    const image = await bannersService.getImageAbsolutePath(req.params.id);
    if (!image) throw new AppError('Gambar banner tidak ditemukan', 404);
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(image.originalName)}"`,
    );
    return res.sendFile(image.absolute);
  } catch (e) {
    next(e);
  }
});

settingsRouter.get(
  '/banners',
  authenticate,
  requirePermission(PERMISSIONS.USER_MANAGE),
  async (req, res, next) => {
    try {
      const placement = parsePlacement(req.query.placement);
      return success(
        res,
        await bannersService.listAdmin(placement),
        'Daftar banner',
      );
    } catch (e) {
      next(e);
    }
  },
);

settingsRouter.post(
  '/banners',
  authenticate,
  requirePermission(PERMISSIONS.USER_MANAGE),
  validateBody(dashboardBannerCreateSchema),
  async (req, res, next) => {
    try {
      const data = await bannersService.create(req.body);
      return success(res, data, 'Banner berhasil ditambahkan', 201);
    } catch (e) {
      next(e);
    }
  },
);

settingsRouter.put(
  '/banners/:id',
  authenticate,
  requirePermission(PERMISSIONS.USER_MANAGE),
  validateBody(dashboardBannerUpdateSchema),
  async (req, res, next) => {
    try {
      const data = await bannersService.update(req.params.id, req.body);
      return success(res, data, 'Banner berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

settingsRouter.delete(
  '/banners/:id',
  authenticate,
  requirePermission(PERMISSIONS.USER_MANAGE),
  async (req, res, next) => {
    try {
      await bannersService.remove(req.params.id);
      return success(res, null, 'Banner berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);

settingsRouter.post(
  '/banners/:id/image',
  authenticate,
  requirePermission(PERMISSIONS.USER_MANAGE),
  uploadSingle,
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError('File gambar wajib diunggah', 400);
      const user = (req as AuthedRequest).user;
      const data = await bannersService.uploadImage(
        req.params.id,
        req.file,
        user?.id,
      );
      return success(res, data, 'Gambar banner berhasil diunggah');
    } catch (e) {
      next(e);
    }
  },
);

settingsRouter.delete(
  '/banners/:id/image',
  authenticate,
  requirePermission(PERMISSIONS.USER_MANAGE),
  async (req, res, next) => {
    try {
      const data = await bannersService.clearImage(req.params.id);
      return success(res, data, 'Gambar banner berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);
