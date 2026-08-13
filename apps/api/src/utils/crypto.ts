import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(payload: object) {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpires as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: object) {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpires as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken<T = jwt.JwtPayload>(token: string): T {
  return jwt.verify(token, env.jwtAccessSecret) as T;
}

export function verifyRefreshToken<T = jwt.JwtPayload>(token: string): T {
  return jwt.verify(token, env.jwtRefreshSecret) as T;
}

export function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = match[2];
  const map: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return n * (map[unit!] ?? 86_400_000);
}
