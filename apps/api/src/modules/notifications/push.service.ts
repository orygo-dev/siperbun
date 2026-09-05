import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

export type NotifyPayload = {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
};

type GoogleTokenCache = {
  accessToken: string;
  expiresAt: number;
};

let googleToken: GoogleTokenCache | null = null;

export function isPushConfigured() {
  return Boolean(env.fcmProjectId && env.fcmClientEmail && env.fcmPrivateKey);
}

async function getGoogleAccessToken() {
  if (!isPushConfigured()) return null;
  const now = Math.floor(Date.now() / 1000);
  if (googleToken && googleToken.expiresAt - 60 > now) {
    return googleToken.accessToken;
  }

  const assertion = jwt.sign(
    {
      iss: env.fcmClientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    },
    env.fcmPrivateKey,
    { algorithm: 'RS256' },
  );

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || `Gagal mengambil token FCM (${res.status})`);
  }

  googleToken = {
    accessToken: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600),
  };
  return googleToken.accessToken;
}

async function sendFcm(token: string, item: NotifyPayload) {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return { ok: true as const };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${env.fcmProjectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: item.title,
            body: item.body,
          },
          data: {
            type: item.type,
            link: item.link ?? '',
          },
          android: {
            priority: 'HIGH',
            notification: {
              channelId: 'siperbun_default',
            },
          },
        },
      }),
    },
  );

  if (res.ok) return { ok: true as const };

  const payload = (await res.json().catch(() => ({}))) as {
    error?: { status?: string; message?: string };
  };
  return {
    ok: false as const,
    status: payload.error?.status,
    message: payload.error?.message ?? `FCM ${res.status}`,
  };
}

export async function dispatchPush(items: NotifyPayload[]) {
  if (!items.length || !isPushConfigured()) return;

  const userIds = [...new Set(items.map((item) => item.userId))];
  const devices = await prisma.devicePushToken.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, userId: true, token: true },
  });
  if (!devices.length) return;

  const staleIds: string[] = [];
  for (const device of devices) {
    const latest = items.find((item) => item.userId === device.userId);
    if (!latest) continue;
    try {
      const result = await sendFcm(device.token, latest);
      if (
        !result.ok &&
        (result.status === 'NOT_FOUND' ||
          result.status === 'UNREGISTERED' ||
          result.message?.includes('UNREGISTERED'))
      ) {
        staleIds.push(device.id);
      } else if (!result.ok) {
        logger.warn({ token: device.token.slice(0, 12), err: result.message }, 'FCM send failed');
      }
    } catch (error) {
      logger.warn({ err: error }, 'FCM send error');
    }
  }

  if (staleIds.length) {
    await prisma.devicePushToken.deleteMany({ where: { id: { in: staleIds } } });
  }
}

export function queuePush(items: NotifyPayload[]) {
  if (!items.length) return;
  void dispatchPush(items).catch((error) => {
    logger.warn({ err: error }, 'Push notification queue failed');
  });
}

export async function notifyUsers(items: NotifyPayload[]) {
  if (!items.length) return;
  await prisma.notification.createMany({ data: items });
  queuePush(items);
}
