import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

const productionBase = {
  NODE_ENV: 'production',
  DATABASE_URL: 'mysql://user:pass@localhost:3306/siperbun',
  CORS_ORIGIN: 'https://siperbun.example',
};

describe('production environment security', () => {
  it('rejects missing JWT secrets', () => {
    expect(() => loadEnv(productionBase)).toThrow('JWT_ACCESS_SECRET');
  });

  it('rejects short JWT secrets', () => {
    expect(() =>
      loadEnv({
        ...productionBase,
        JWT_ACCESS_SECRET: 'too-short',
        JWT_REFRESH_SECRET: 'also-too-short',
      }),
    ).toThrow('at least 32 characters');
  });

  it('forces secure cookies in production', () => {
    const loaded = loadEnv({
      ...productionBase,
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      COOKIE_SECURE: 'false',
    });

    expect(loaded.cookieSecure).toBe(true);
  });
});
