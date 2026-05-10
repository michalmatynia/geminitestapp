import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  readEcommercePagesCmsEditorialArticles: vi.fn(),
  saveEcommercePagesCmsEditorialArticles: vi.fn(),
}));

vi.mock('@/features/products/pages/ecommerce-pages-cms/ecommerce-pages-cms.server', () => ({
  readEcommercePagesCmsEditorialArticles: mocks.readEcommercePagesCmsEditorialArticles,
  saveEcommercePagesCmsEditorialArticles: mocks.saveEcommercePagesCmsEditorialArticles,
}));

import { getHandler, putHandler } from './handler';

const buildContext = (userId: string | null = 'user-1'): ApiHandlerContext => ({
  correlationId: 'correlation-1',
  getElapsedMs: () => 0,
  requestId: 'request-1',
  startTime: 0,
  traceId: 'trace-1',
  userId,
});

const buildPutRequest = (body: unknown): NextRequest =>
  new Request('http://localhost/api/v2/products/pages/editorial-articles', {
    method: 'PUT',
    body: JSON.stringify(body),
  }) as NextRequest;

describe('products pages CMS editorial articles handler', () => {
  beforeEach(() => {
    mocks.readEcommercePagesCmsEditorialArticles.mockReset();
    mocks.saveEcommercePagesCmsEditorialArticles.mockReset();
  });

  it('returns the saved editorial article configuration', async () => {
    mocks.readEcommercePagesCmsEditorialArticles.mockResolvedValue({
      articles: [{ id: 'elden-ring', title: 'Elden Ring', visible: true }],
      cloudConfigured: true,
      updatedAt: '2026-05-10T12:00:00.000Z',
      updatedBy: 'user-1',
    });

    const response = await getHandler(
      new Request('http://localhost/api/v2/products/pages/editorial-articles') as NextRequest,
      buildContext()
    );
    const body = (await response.json()) as {
      editorialArticles: { articles: unknown[] };
      ok: boolean;
    };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      editorialArticles: expect.objectContaining({
        articles: [expect.objectContaining({ id: 'elden-ring' })],
      }),
    });
  });

  it('saves articles with the authenticated user id', async () => {
    const articles = [
      {
        body: 'Long article body',
        excerpt: 'Short summary',
        href: '/lore-drops/gaming-report',
        id: 'gaming-report',
        tag: 'Gaming Drop',
        title: 'Gaming Report',
        visible: true,
      },
    ];
    mocks.saveEcommercePagesCmsEditorialArticles.mockResolvedValue({
      articles,
      cloudConfigured: true,
      cloudMirrored: true,
      updatedAt: '2026-05-10T12:00:00.000Z',
      updatedBy: 'admin-1',
    });

    const response = await putHandler(buildPutRequest({ articles }), buildContext('admin-1'));
    const body = (await response.json()) as { editorialArticles: { cloudMirrored: boolean } };

    expect(response.status).toBe(200);
    expect(body.editorialArticles.cloudMirrored).toBe(true);
    expect(mocks.saveEcommercePagesCmsEditorialArticles).toHaveBeenCalledWith({
      articles,
      userId: 'admin-1',
    });
  });

  it('rejects unauthenticated save requests before parsing the payload', async () => {
    await expect(putHandler(buildPutRequest({}), buildContext(null))).rejects.toThrow(
      'Unauthorized'
    );
    expect(mocks.saveEcommercePagesCmsEditorialArticles).not.toHaveBeenCalled();
  });
});
