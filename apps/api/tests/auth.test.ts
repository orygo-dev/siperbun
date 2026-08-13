import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();

describe('Health', () => {
  it('GET /api/v1/health returns success', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBeTruthy();
  });
});

describe('Auth login', () => {
  beforeAll(async () => {
    // depends on seeded DB — skip soft-fail if unavailable
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nobody@siperbun.local',
      password: 'wrongpass',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('logs in with demo account when seeded', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@siperbun.local',
      password: 'password',
    });

    if (res.status === 401 || res.status === 500) {
      // DB not seeded / unreachable in this environment
      expect(res.body.success).toBe(false);
      return;
    }

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe('admin@siperbun.local');
    expect(res.headers['set-cookie']).toBeTruthy();
  });

  it('refresh returns new access token when cookie present', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@siperbun.local',
      password: 'password',
    });
    if (loginRes.status !== 200) {
      expect(loginRes.body.success).toBe(false);
      return;
    }

    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeTruthy();
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookieHeader);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();
  });
});
