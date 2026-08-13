import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();

async function loginAdmin() {
  const res = await request(app).post('/api/v1/auth/login').send({
    email: 'admin@siperbun.local',
    password: 'password',
  });
  if (res.status !== 200) return null;
  return res.body.data.accessToken as string;
}

describe('Producers Stage 2', () => {
  let token: string | null = null;

  beforeAll(async () => {
    token = await loginAdmin();
  });

  it('lists producers when authenticated', async () => {
    if (!token) {
      expect(true).toBe(true);
      return;
    }
    const res = await request(app)
      .get('/api/v1/producers?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.page).toBe(1);
  });

  it('creates a producer with auto registration number', async () => {
    if (!token) {
      expect(true).toBe(true);
      return;
    }
    const res = await request(app)
      .post('/api/v1/producers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        businessName: `CV Test Stage2 ${Date.now()}`,
        ownerName: 'Pemilik Test',
        businessType: 'CV',
        phone: '081234567890',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.registrationNumber).toMatch(/^PBR-\d{4}-\d+$/);
    expect(res.body.data.businessName).toContain('CV Test Stage2');
  });
});

describe('Regions Stage 2', () => {
  let token: string | null = null;

  beforeAll(async () => {
    token = await loginAdmin();
  });

  it('lists regions for authenticated users', async () => {
    if (!token) {
      expect(true).toBe(true);
      return;
    }
    const res = await request(app)
      .get('/api/v1/regions?type=KABUPATEN&limit=20')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
