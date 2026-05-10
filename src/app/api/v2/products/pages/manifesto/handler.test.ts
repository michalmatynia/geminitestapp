import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  readEcommercePagesCmsManifesto: vi.fn(),
  saveEcommercePagesCmsManifesto: vi.fn(),
}));

vi.mock('@/features/products/pages/ecommerce-pages-cms/ecommerce-pages-cms.server', () => ({
  readEcommercePagesCmsManifesto: mocks.readEcommercePagesCmsManifesto,
  saveEcommercePagesCmsManifesto: mocks.saveEcommercePagesCmsManifesto,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: vi.fn(),
  },
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
  new Request('http://localhost/api/v2/products/pages/manifesto', {
    method: 'PUT',
    body: JSON.stringify(body),
  }) as NextRequest;

describe('products pages CMS manifesto handler', () => {
  beforeEach(() => {
    mocks.readEcommercePagesCmsManifesto.mockReset();
    mocks.saveEcommercePagesCmsManifesto.mockReset();
  });

  it('returns the saved Collector Creed content', async () => {
    mocks.readEcommercePagesCmsManifesto.mockResolvedValue({
      backgroundImageUrl: '',
      body: 'Body',
      cloudConfigured: true,
      ctaHref: '/products',
      ctaLabel: 'Explore The Cache',
      eyebrow: "The Collector's Creed",
      quoteEmphasis: 'a piece you can hold',
      quotePrefix: 'Every universe deserves',
      quoteSuffix: '.',
      updatedAt: '2026-05-10T12:00:00.000Z',
      updatedBy: 'user-1',
    });

    const response = await getHandler(
      new Request('http://localhost/api/v2/products/pages/manifesto') as NextRequest,
      buildContext()
    );
    const body = (await response.json()) as { manifesto: { eyebrow: string } };

    expect(response.status).toBe(200);
    expect(body.manifesto.eyebrow).toBe("The Collector's Creed");
  });

  it('saves Collector Creed content with the authenticated user id', async () => {
    const manifesto = {
      backgroundImageUrl: 'https://sparksofsindri.com/creed.webp',
      body: 'Body',
      ctaHref: '/products',
      ctaLabel: 'Explore',
      eyebrow: 'Creed',
      quoteEmphasis: 'a relic',
      quotePrefix: 'Every world needs',
      quoteSuffix: '.',
    };
    mocks.saveEcommercePagesCmsManifesto.mockResolvedValue({
      ...manifesto,
      cloudConfigured: true,
      cloudMirrored: true,
      updatedAt: '2026-05-10T12:00:00.000Z',
      updatedBy: 'admin-1',
    });

    const response = await putHandler(buildPutRequest({ manifesto }), buildContext('admin-1'));
    const body = (await response.json()) as { manifesto: { cloudMirrored: boolean } };

    expect(response.status).toBe(200);
    expect(body.manifesto.cloudMirrored).toBe(true);
    expect(mocks.saveEcommercePagesCmsManifesto).toHaveBeenCalledWith({
      manifesto,
      userId: 'admin-1',
    });
  });

  it('rejects unauthenticated save requests before parsing the payload', async () => {
    await expect(putHandler(buildPutRequest({}), buildContext(null))).rejects.toThrow(
      'Unauthorized'
    );
    expect(mocks.saveEcommercePagesCmsManifesto).not.toHaveBeenCalled();
  });
});
