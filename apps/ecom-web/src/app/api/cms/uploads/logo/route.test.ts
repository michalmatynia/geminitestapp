/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  revalidateLocalizedPath: vi.fn(),
  saveSiteLogo: vi.fn(),
  uploadToFastComet: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/cms', () => ({
  saveSiteLogo: mocks.saveSiteLogo,
}));

vi.mock('@/lib/cmsRevalidation', () => ({
  revalidateLocalizedPath: mocks.revalidateLocalizedPath,
}));

vi.mock('@/lib/fastcometUpload', () => ({
  uploadToFastComet: mocks.uploadToFastComet,
}));

function makeLogoRequest(file?: File): NextRequest {
  const form = new FormData();
  if (file) form.append('file', file);
  return new Request('http://localhost/api/cms/uploads/logo', {
    method: 'POST',
    body: form,
  }) as NextRequest;
}

describe('CMS logo upload API route', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.revalidateLocalizedPath.mockReset();
    mocks.saveSiteLogo.mockReset();
    mocks.uploadToFastComet.mockReset();
    mocks.getSession.mockResolvedValue({ id: 'admin-1', isSuperAdmin: true });
    mocks.saveSiteLogo.mockResolvedValue({
      content: {
        nav: {
          logoAlt: 'STARGATER NEXUS',
        },
      },
      updatedAt: '2026-05-08T12:00:00.000Z',
      updatedBy: 'admin-1',
    });
    mocks.uploadToFastComet.mockResolvedValue('https://sparksofsindri.com/uploads/ecom/logos/logo.png');
  });

  it('uploads a validated logo to FastComet for super admins', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'Stargater Mark.png', { type: 'image/png' });

    const response = await POST(makeLogoRequest(file));
    const body = await response.json() as { ok?: boolean; url?: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      url: 'https://sparksofsindri.com/uploads/ecom/logos/logo.png',
      logoAlt: 'STARGATER NEXUS',
      updatedAt: '2026-05-08T12:00:00.000Z',
      updatedBy: 'admin-1',
    });
    expect(mocks.uploadToFastComet).toHaveBeenCalledWith(expect.objectContaining({
      buffer: expect.any(Buffer),
      filename: expect.stringMatching(/^\d+-[a-f0-9]{8}-arcana-mark\.png$/),
      mimetype: 'image/png',
      publicPath: expect.stringMatching(/^\/uploads\/ecom\/logos\/\d+-[a-f0-9]{8}-arcana-mark\.png$/),
      category: 'ecom',
      folder: 'logos',
    }));
    expect(mocks.saveSiteLogo).toHaveBeenCalledWith(
      'https://sparksofsindri.com/uploads/ecom/logos/logo.png',
      '',
      'admin-1',
    );
    expect(mocks.revalidateLocalizedPath).toHaveBeenCalledWith('/', 'layout');
  });

  it('rejects non-admin uploads before contacting FastComet', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1', isSuperAdmin: false });
    const file = new File([new Uint8Array([1])], 'logo.png', { type: 'image/png' });

    const response = await POST(makeLogoRequest(file));

    expect(response.status).toBe(403);
    expect(mocks.uploadToFastComet).not.toHaveBeenCalled();
    expect(mocks.saveSiteLogo).not.toHaveBeenCalled();
  });

  it('rejects unsupported logo file types', async () => {
    const file = new File([new Uint8Array([1])], 'logo.txt', { type: 'text/plain' });

    const response = await POST(makeLogoRequest(file));
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain('Logo must be');
    expect(mocks.uploadToFastComet).not.toHaveBeenCalled();
    expect(mocks.saveSiteLogo).not.toHaveBeenCalled();
  });
});
