import 'dotenv/config';

function required(source: NodeJS.ProcessEnv, key: string, fallback?: string): string {
  const value = source[key] ?? fallback;
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
}

function jwtSecret(
  source: NodeJS.ProcessEnv,
  nodeEnv: string,
  key: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET',
) {
  const value = source[key];
  if (nodeEnv === 'production') {
    if (!value) throw new Error(`Missing env: ${key}`);
    if (value.length < 32) {
      throw new Error(`${key} must contain at least 32 characters in production`);
    }
    return value;
  }
  return value ?? (key === 'JWT_ACCESS_SECRET' ? 'dev-access' : 'dev-refresh');
}

function corsOrigin(source: NodeJS.ProcessEnv, nodeEnv: string) {
  if (nodeEnv === 'production') return required(source, 'CORS_ORIGIN');
  return source.CORS_ORIGIN ?? 'http://localhost:5173';
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env) {
  const nodeEnv = source.NODE_ENV ?? 'development';
  return {
    nodeEnv,
    port: Number(source.PORT ?? 3111),
    databaseUrl: required(source, 'DATABASE_URL'),
    jwtAccessSecret: jwtSecret(source, nodeEnv, 'JWT_ACCESS_SECRET'),
    jwtRefreshSecret: jwtSecret(source, nodeEnv, 'JWT_REFRESH_SECRET'),
    jwtAccessExpires: source.JWT_ACCESS_EXPIRES ?? '15m',
    jwtRefreshExpires: source.JWT_REFRESH_EXPIRES ?? '7d',
    corsOrigin: corsOrigin(source, nodeEnv),
    cookieSecure: nodeEnv === 'production' || source.COOKIE_SECURE === 'true',
    storagePath: source.STORAGE_PATH ?? './storage',
    isDev: nodeEnv !== 'production',
  };
}

export const env = loadEnv();
