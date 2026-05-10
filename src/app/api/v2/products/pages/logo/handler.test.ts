import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  readEcommercePagesCmsLogo: vi.fn(),
  uploadEcommercePagesCmsLogo: vi.fn(),
}));

vi.mock('@/features/products/pages/ecommerce-pages-cms/ecommerce-pages-cms.server', () => ({
  readEcommercePagesCmsLogo: mocks.readEcommercePagesCmsLogo,
  uploadEcommercePagesCmsLogo: mocks.uploadEcommercePagesCmsLogo,
}));

import { getHandler, postHandler } from './handler';

const buildContext = (userId: string | null = 'user-1'): ApiHandlerContext => ({
  correlationId: 'correlation-1',
  getElapsedMs: () => 0,
  requestId: 'request-1',
  startTime: 0,
  traceId: 'trace-1',
  userId,
});

const buildUploadRequest = (file?: File): NextRequest => {
  const formData = new FormData();
  if (file !== undefined) formData.append('file', file);
  formData.append('alt', 'Store mark');
  return new Request('http://localhost/api/v2/products/pages/logo', {
    method: 'POST',
    body: formData,
  }) as NextRequest;
};

describe('products pages CMS logo handler', () => {
  beforeEach(() => {
    mocks.readEcommercePagesCmsLogo.mockReset();
    mocks.uploadEcommercePagesCmsLogo.mockReset();
  });

  it('returns the locally saved ecommerce CMS logo', async () => {
    mocks.readEcommercePagesCmsLogo.mockResolvedValue({
      cloudConfigured: true,
      logoAlt: 'Store mark',
      logoUrl: 'https://sparksofsindri.com/uploads/cms/stargater/logo/logo.webp',
      updatedAt: '2026-05-10T12:00:00.000Z',
      updatedBy: 'user-1',
    });

    const response = await getHandler(
      new Request('http://localhost/api/v2/products/pages/logo') as NextRequest,
      buildContext()
    );
    const body = (await response.json()) as { ok: boolean; logo: { logoUrl: string } };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      logo: expect.objectContaining({
        logoUrl: 'https://sparksofsindri.com/uploads/cms/stargater/logo/logo.webp',
      }),
    });
  });

  it('uploads the logo with the authenticated user id', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'Logo.webp', { type: 'image/webp' });
    mocks.uploadEcommercePagesCmsLogo.mockResolvedValue({
      cloudConfigured: true,
      cloudMirrored: true,
      filename: 'logo.webp',
      localPublicPath: '/uploads/cms/stargater/logo/logo.webp',
      logoAlt: 'Store mark',
      logoUrl: 'https://sparksofsindri.com/uploads/cms/stargater/logo/logo.webp',
      mimetype: 'image/webp',
      remoteUrl: 'https://sparksofsindri.com/uploads/cms/stargater/logo/logo.webp',
      size: 3,
      updatedAt: '2026-05-10T12:00:00.000Z',
      updatedBy: 'user-1',
    });

    const response = await postHandler(buildUploadRequest(file), buildContext('admin-1'));
    const body = (await response.json()) as { ok: boolean; logo: { cloudMirrored: boolean } };

    expect(response.status).toBe(200);
    expect(body.logo.cloudMirrored).toBe(true);
    const [uploadInput] = mocks.uploadEcommercePagesCmsLogo.mock.calls[0] as [
      { file: File; logoAlt: string; userId: string },
    ];
    expect(uploadInput.logoAlt).toBe('Store mark');
    expect(uploadInput.userId).toBe('admin-1');
    expect(uploadInput.file.type).toBe('image/webp');
    expect(typeof uploadInput.file.arrayBuffer).toBe('function');
  });

  it('rejects unauthenticated logo uploads before reading the file', async () => {
    await expect(postHandler(buildUploadRequest(), buildContext(null))).rejects.toThrow(
      'Unauthorized'
    );
    expect(mocks.uploadEcommercePagesCmsLogo).not.toHaveBeenCalled();
  });
});
