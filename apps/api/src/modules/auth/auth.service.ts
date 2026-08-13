import {
  REFRESH_COOKIE_NAME,
  changePasswordSchema,
  loginSchema,
  profileUpdateSchema,
} from '@siperbun/shared';
import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import {
  hashPassword,
  hashToken,
  parseDurationMs,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from '../../utils/crypto';

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

export { changePasswordSchema, profileUpdateSchema };

async function loadUserAuth(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });
  if (!user) throw new AppError('Unauthorized', 401);

  const roles = user.userRoles.map((ur) => ur.role.slug);
  const permissions = [
    ...new Set(
      user.userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => rp.permission.key),
      ),
    ),
  ];

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    producerId: user.producerId,
    roles,
    permissions,
  };
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: parseDurationMs(env.jwtRefreshExpires),
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/api/v1/auth',
  });
}

export const authService = {
  async login(
    input: z.infer<typeof loginSchema>,
    meta: { ip?: string; ua?: string },
    res: Response,
  ) {
    const user = await prisma.user.findFirst({
      where: { email: input.email.toLowerCase(), deletedAt: null },
    });
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError('Email atau password salah', 401);
    }
    if (!user.isActive) throw new AppError('Akun nonaktif', 403);

    const profile = await loadUserAuth(user.id);
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
    });
    const refreshToken = signRefreshToken({ sub: user.id });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        deviceInfo: meta.ua?.slice(0, 255),
        ipAddress: meta.ip,
        expiresAt: new Date(Date.now() + parseDurationMs(env.jwtRefreshExpires)),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        module: 'auth',
        ipAddress: meta.ip,
        userAgent: meta.ua?.slice(0, 500),
      },
    });

    setRefreshCookie(res, refreshToken);

    return {
      accessToken,
      user: profile,
    };
  },

  async refresh(refreshToken: string | undefined, res: Response) {
    if (!refreshToken) throw new AppError('Refresh token tidak ditemukan', 401);

    let payload: { sub: string };
    try {
      payload = verifyRefreshToken<{ sub: string }>(refreshToken);
    } catch {
      throw new AppError('Refresh token tidak valid', 401);
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!stored) throw new AppError('Refresh token tidak valid', 401);

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const profile = await loadUserAuth(payload.sub);
    const accessToken = signAccessToken({
      sub: profile.id,
      email: profile.email,
    });
    const newRefresh = signRefreshToken({ sub: profile.id });

    await prisma.refreshToken.create({
      data: {
        userId: profile.id,
        tokenHash: hashToken(newRefresh),
        deviceInfo: stored.deviceInfo,
        ipAddress: stored.ipAddress,
        expiresAt: new Date(Date.now() + parseDurationMs(env.jwtRefreshExpires)),
      },
    });

    setRefreshCookie(res, newRefresh);
    return { accessToken, user: profile };
  },

  async logout(refreshToken: string | undefined, res: Response) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    clearRefreshCookie(res);
    return { ok: true };
  },

  async logoutAll(userId: string, res: Response) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    clearRefreshCookie(res);
    return { ok: true };
  },

  async me(userId: string) {
    return loadUserAuth(userId);
  },

  async updateProfile(
    userId: string,
    input: z.infer<typeof profileUpdateSchema>,
  ) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        phone: input.phone,
      },
    });
    return loadUserAuth(userId);
  },

  async changePassword(
    userId: string,
    input: z.infer<typeof changePasswordSchema>,
  ) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
    });
    if (!user) throw new AppError('Unauthorized', 401);

    const ok = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!ok) throw new AppError('Password saat ini salah', 400);

    const passwordHash = await hashPassword(input.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Cabut sesi lain agar password baru efektif
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  },

  async forgotPassword(email: string) {
    // Stub: always succeed to avoid email enumeration
    await prisma.user.findFirst({ where: { email: email.toLowerCase() } });
    return {
      message:
        'Jika email terdaftar, instruksi reset password akan dikirim (stub Stage 1).',
    };
  },

  async resetPassword(_token: string, _password: string) {
    // Stub for Stage 1
    return {
      message:
        'Reset password belum diaktifkan penuh pada Stage 1. Hubungi administrator.',
    };
  },

  hashPassword,
};
