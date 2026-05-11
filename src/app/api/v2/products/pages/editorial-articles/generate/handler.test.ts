import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  generateEcommercePagesCmsEditorialArticleWithAiPath: vi.fn(),
}));

vi.mock('@/features/products/pages/ecommerce-pages-cms/ecommerce-pages-cms.server', () => ({
  generateEcommercePagesCmsEditorialArticleWithAiPath:
    mocks.generateEcommercePagesCmsEditorialArticleWithAiPath,
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

const buildPostRequest = (body: unknown): NextRequest =>
  new Request('http://localhost/api/v2/products/pages/editorial-articles/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as NextRequest;

describe('products pages CMS editorial article AI generate handler', () => {
  beforeEach(() => {
    mocks.generateEcommercePagesCmsEditorialArticleWithAiPath.mockReset();
  });

  it('generates an article with the submitted prompt and draft context', async () => {
    mocks.generateEcommercePagesCmsEditorialArticleWithAiPath.mockResolvedValue({
      body: 'Generated long content',
      excerpt: 'Generated short form',
      modelId: 'gemma3',
      title: 'Generated Article',
    });

    const response = await postHandler(
      buildPostRequest({
        draft: { tag: 'Gaming Drop', title: 'Existing' },
        imageUrl: '/uploads/context.png',
        prompt: 'Use this image.',
      }),
      buildContext()
    );
    const body = (await response.json()) as {
      article: { title: string };
      ok: boolean;
    };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      article: expect.objectContaining({ title: 'Generated Article' }),
    });
    expect(mocks.generateEcommercePagesCmsEditorialArticleWithAiPath).toHaveBeenCalledWith({
      draft: { tag: 'Gaming Drop', title: 'Existing' },
      imageUrl: '/uploads/context.png',
      prompt: 'Use this image.',
    });
  });

  it('rejects unauthenticated generate requests before parsing the payload', async () => {
    await expect(postHandler(buildPostRequest({}), buildContext(null))).rejects.toThrow(
      'Unauthorized'
    );
    expect(mocks.generateEcommercePagesCmsEditorialArticleWithAiPath).not.toHaveBeenCalled();
  });
});
