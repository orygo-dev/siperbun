import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();

async function login(email: string) {
  const response = await request(app).post('/api/v1/auth/login').send({
    email,
    password: 'password',
  });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}

describe('Portal content and South Kalimantan map', () => {
  let adminToken = '';
  let penangkarToken = '';
  let originalContent: Record<string, unknown> | null = null;

  beforeAll(async () => {
    adminToken = await login('admin@siperbun.local');
    penangkarToken = await login('penangkar1@siperbun.local');
    const response = await request(app).get('/api/v1/settings/portal-content');
    originalContent = response.body.data.content;
  });

  afterAll(async () => {
    if (!adminToken || !originalContent) return;
    await request(app)
      .put('/api/v1/settings/portal-content')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(originalContent);
  });

  it('serves complete landing content publicly', async () => {
    const response = await request(app).get('/api/v1/settings/portal-content');
    expect(response.status).toBe(200);
    expect(response.body.data.content.hero.title).toContain('Kalimantan Selatan');
    expect(response.body.data.content.services.items.length).toBeGreaterThan(0);
    expect(response.body.data.content.visionMission.missions.length).toBeGreaterThan(0);
  });

  it('restricts content updates to Super Admin', async () => {
    const forbidden = await request(app)
      .put('/api/v1/settings/portal-content')
      .set('Authorization', `Bearer ${penangkarToken}`)
      .send(originalContent);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .put('/api/v1/settings/portal-content')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(originalContent);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.content).toEqual(originalContent);
  });

  it('rejects malformed portal content', async () => {
    const response = await request(app)
      .put('/api/v1/settings/portal-content')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ hero: { title: '' } });
    expect(response.status).toBe(422);
  });

  it('returns district and real producer map data', async () => {
    const response = await request(app).get('/api/v1/public/map');
    expect(response.status).toBe(200);
    expect(response.body.data.districts.length).toBe(13);
    expect(Array.isArray(response.body.data.markers)).toBe(true);
    for (const marker of response.body.data.markers) {
      expect(marker.latitude).toEqual(expect.any(Number));
      expect(marker.longitude).toEqual(expect.any(Number));
    }
  });
});
