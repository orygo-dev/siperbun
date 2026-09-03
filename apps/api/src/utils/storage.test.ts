import fs from 'fs/promises';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import {
  detectFileMimeType,
  resolveStoragePath,
  saveMulterFile,
} from './storage';

describe('storage hardening', () => {
  it('detects supported signatures and rejects unknown content', () => {
    expect(
      detectFileMimeType(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe('image/png');
    expect(detectFileMimeType(Buffer.from('<script>alert(1)</script>'))).toBeNull();
  });

  it('rejects paths outside the configured storage root', () => {
    expect(() => resolveStoragePath('../outside.txt')).toThrow(
      'Path penyimpanan tidak valid',
    );
  });

  it('rejects a file whose declared MIME does not match its contents', async () => {
    const file = {
      buffer: Buffer.from('<script>alert(1)</script>'),
      mimetype: 'image/png',
      originalname: 'payload.html',
    } as Express.Multer.File;

    await expect(
      saveMulterFile(file, { relativeDir: 'security-tests' }),
    ).rejects.toThrow('Isi file tidak cocok');
  });

  it('does not expose files through the removed /storage static route', async () => {
    const markerPath = resolveStoragePath('security-test-marker.txt');
    await fs.writeFile(markerPath, 'not public');
    try {
      const response = await request(createApp()).get(
        '/storage/security-test-marker.txt',
      );
      expect(response.status).toBe(404);
    } finally {
      await fs.unlink(markerPath);
    }
  });
});
