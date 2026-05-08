/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  uploadToFastComet: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/fastcometUpload', () => ({
  uploadToFastComet: mocks.uploadToFastComet,
}));

function makeUploadRequest(file?: File): NextRequest {
  const form = new FormData();
  if (file) form.append('file', file);
  return new Request('http://localhost/api/cms/uploads/category-card', {
    method: 'POST',
    body: form,
  }) as NextRequest;
}

describe('CMS category card image upload API route', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.uploadToFastComet.mockReset();
    mocks.getSession.mockResolvedValue({ id: 'admin-1', isSuperAdmin: true });
    mocks.uploadToFastComet.mockResolvedValue('https://sparksofsindri.com/uploads/ecom/category-selectors/anime.webp');
  });

  it('uploads a category selector image to FastComet for super admins', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'Anime Selector.webp', { type: 'image/webp' });

    const response = await POST(makeUploadRequest(file));
    const body = await response.json() as { ok?: boolean; url?: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      url: 'https://sparksofsindri.com/uploads/ecom/category-selectors/anime.webp',
    });
    expect(mocks.uploadToFastComet).toHaveBeenCalledWith(expect.objectContaining({
      buffer: expect.any(Buffer),
      filename: expect.stringMatching(/^\d+-[a-f0-9]{8}-anime-selector\.webp$/),
      mimetype: 'image/webp',
      publicPath: expect.stringMatching(/^\/uploads\/ecom\/category-selectors\/\d+-[a-f0-9]{8}-anime-selector\.webp$/),
      category: 'ecom',
      folder: 'category-selectors',
    }));
  });

  it('rejects non-admin uploads before contacting FastComet', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1', isSuperAdmin: false });
    const file = new File([new Uint8Array([1])], 'selector.png', { type: 'image/png' });

    const response = await POST(makeUploadRequest(file));

    expect(response.status).toBe(403);
    expect(mocks.uploadToFastComet).not.toHaveBeenCalled();
  });

  it('rejects unsupported files', async () => {
    const file = new File([new Uint8Array([1])], 'selector.txt', { type: 'text/plain' });

    const response = await POST(makeUploadRequest(file));
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain('Category card image must be');
    expect(mocks.uploadToFastComet).not.toHaveBeenCalled();
  });
});
