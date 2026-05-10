import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  uploadEcommercePagesCmsManifestoBackground: vi.fn(),
}));

vi.mock('@/features/products/pages/ecommerce-pages-cms/ecommerce-pages-cms.server', () => ({
  uploadEcommercePagesCmsManifestoBackground:
    mocks.uploadEcommercePagesCmsManifestoBackground,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: vi.fn(),
  },
}));

import { postHandler } from './handler';

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
  return new Request('http://localhost/api/v2/products/pages/manifesto/background', {
    method: 'POST',
    body: formData,
  }) as NextRequest;
};

describe('products pages CMS manifesto background handler', () => {
  beforeEach(() => {
    mocks.uploadEcommercePagesCmsManifestoBackground.mockReset();
  });

  it('uploads the background image', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'Creed.webp', { type: 'image/webp' });
    mocks.uploadEcommercePagesCmsManifestoBackground.mockResolvedValue({
      filename: 'creed.webp',
      localPublicPath: '/uploads/cms/stargater/manifesto/creed.webp',
      mimetype: 'image/webp',
      remoteUrl: 'https://sparksofsindri.com/uploads/cms/stargater/manifesto/creed.webp',
      size: 3,
    });

    const response = await postHandler(buildUploadRequest(file), buildContext('admin-1'));
    const body = (await response.json()) as { image: { remoteUrl: string } };

    expect(response.status).toBe(200);
    expect(body.image.remoteUrl).toContain('/manifesto/creed.webp');
    const [uploadInput] = mocks.uploadEcommercePagesCmsManifestoBackground.mock.calls[0] as [
      { file: File },
    ];
    expect(uploadInput.file.type).toBe('image/webp');
    expect(typeof uploadInput.file.arrayBuffer).toBe('function');
  });

  it('rejects unauthenticated uploads before reading the file', async () => {
    await expect(postHandler(buildUploadRequest(), buildContext(null))).rejects.toThrow(
      'Unauthorized'
    );
    expect(mocks.uploadEcommercePagesCmsManifestoBackground).not.toHaveBeenCalled();
  });
});
