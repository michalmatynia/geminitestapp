import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  uploadEcommercePagesCmsEditorialArticleImage: vi.fn(),
}));

vi.mock('@/features/products/pages/ecommerce-pages-cms/ecommerce-pages-cms.server', () => ({
  uploadEcommercePagesCmsEditorialArticleImage:
    mocks.uploadEcommercePagesCmsEditorialArticleImage,
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
  return new Request('http://localhost/api/v2/products/pages/editorial-articles/image', {
    method: 'POST',
    body: formData,
  }) as NextRequest;
};

describe('products pages CMS editorial article image handler', () => {
  beforeEach(() => {
    mocks.uploadEcommercePagesCmsEditorialArticleImage.mockReset();
  });

  it('uploads a lore article image', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'Lore.webp', { type: 'image/webp' });
    mocks.uploadEcommercePagesCmsEditorialArticleImage.mockResolvedValue({
      filename: 'lore.webp',
      localPublicPath: '/uploads/cms/stargater/editorial-articles/lore.webp',
      mimetype: 'image/webp',
      remoteUrl: 'https://sparksofsindri.com/uploads/cms/stargater/editorial-articles/lore.webp',
      size: 3,
    });

    const response = await postHandler(buildUploadRequest(file), buildContext('admin-1'));
    const body = (await response.json()) as { image: { remoteUrl: string } };

    expect(response.status).toBe(200);
    expect(body.image.remoteUrl).toContain('/editorial-articles/lore.webp');
    const [uploadInput] = mocks.uploadEcommercePagesCmsEditorialArticleImage.mock.calls[0] as [
      { file: File },
    ];
    expect(uploadInput.file.type).toBe('image/webp');
  });

  it('rejects unauthenticated uploads before reading multipart data', async () => {
    await expect(postHandler(buildUploadRequest(), buildContext(null))).rejects.toThrow(
      'Unauthorized'
    );
    expect(mocks.uploadEcommercePagesCmsEditorialArticleImage).not.toHaveBeenCalled();
  });
});
