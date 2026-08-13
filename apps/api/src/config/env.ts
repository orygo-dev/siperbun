import 'dotenv/config';

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-access'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh'),
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  storagePath: process.env.STORAGE_PATH ?? './storage',
  isDev: (process.env.NODE_ENV ?? 'development') !== 'production',
};
