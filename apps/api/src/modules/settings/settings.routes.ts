import {
  BANNER_PLACEMENTS,
  PERMISSIONS,
  ROLES,
  brandingUpdateSchema,
  dashboardBannerCreateSchema,
  dashboardBannerUpdateSchema,
  type BannerPlacement,
  portalContentSchema,
} from '@siperbun/shared';
import { Router } from 'express';
import { authenticate, requirePermission, requireRole } from '../../middlewares/auth';
import { uploadSingle } from '../../middlewares/upload';
import { requiredUuidParam, validateBody } from '../../middlewares/validate';
import { AppError } from '../../utils/errors';
import { AuthedRequest, success } from '../../utils/response';
import { bannersService } from './banners.service';
import { settingsService, type PortalMediaSlot } from './settings.service';

function parsePlacement(value: unknown): BannerPlacement | undefined {
  if (value === BANNER_PLACEMENTS.MOBILE) return BANNER_PLACEMENTS.MOBILE;
  if (value === BANNER_PLACEMENTS.DASHBOARD) return BANNER_PLACEMENTS.DASHBOARD;
  return undefined;
}

export const settingsRouter = Router();

function parsePortalMediaSlot(value: unknown): PortalMediaSlot {
  if (value === 'hero' || value === 'service') return value;
  throw new AppError('Slot media portal tidak valid', 400);
}

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

/** Publik — seluruh konten landing page yang sudah tersimpan. */
settingsRouter.get('/portal-content', async (_req, res, next) => {
  try {
    return success(
      res,
      await settingsService.getPortalContent(),
      'Konten portal berhasil dimuat',
    );
  } catch (e) {
    next(e);
  }
});

settingsRouter.get('/portal-content/media/:slot', async (req, res, next) => {
  try {
    const media = await settingsService.getPortalMediaAbsolute(
      parsePortalMediaSlot(req.params.slot),
    );
    if (!media) throw new AppError('Media portal belum diatur', 404);
    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(media.originalName)}"`,
    );
    return res.sendFile(media.absolute);
  } catch (e) {
    next(e);
  }
});

settingsRouter.put(
  '/portal-content',
  authenticate,
  requireRole(ROLES.SUPER_ADMIN),
  validateBody(portalContentSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      return success(
        res,
        await settingsService.updatePortalContent(req.body, {
          id: user.id,
          req,
        }),
        'Konten portal berhasil disimpan',
      );
    } catch (e) {
      next(e);
    }
  },
);

settingsRouter.post(
  '/portal-content/media/:slot',
  authenticate,
  requireRole(ROLES.SUPER_ADMIN),
  uploadSingle,
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError('File gambar wajib diunggah', 400);
      const user = (req as AuthedRequest).user!;
      return success(
        res,
        await settingsService.uploadPortalMedia(
          parsePortalMediaSlot(req.params.slot),
          req.file,
          { id: user.id, req },
        ),
        'Media portal berhasil diunggah',
      );
    } catch (e) {
      next(e);
    }
  },
);

settingsRouter.delete(
  '/portal-content/media/:slot',
  authenticate,
  requireRole(ROLES.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      return success(
        res,
        await settingsService.clearPortalMedia(
          parsePortalMediaSlot(req.params.slot),
          { id: user.id, req },
        ),
        'Media portal berhasil dihapus',
      );
    } catch (e) {
      next(e);
    }
  },
);

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
    const image = await bannersService.getImageAbsolutePath(
      requiredUuidParam(req.params.id),
    );
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
      const data = await bannersService.update(
        requiredUuidParam(req.params.id),
        req.body,
      );
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
      await bannersService.remove(requiredUuidParam(req.params.id));
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
        requiredUuidParam(req.params.id),
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
      const data = await bannersService.clearImage(
        requiredUuidParam(req.params.id),
      );
      return success(res, data, 'Gambar banner berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);
