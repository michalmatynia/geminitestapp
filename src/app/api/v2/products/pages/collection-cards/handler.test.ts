import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  readEcommercePagesCmsCollectionCards: vi.fn(),
  saveEcommercePagesCmsCollectionCards: vi.fn(),
}));

vi.mock('@/features/products/pages/ecommerce-pages-cms/ecommerce-pages-cms.server', () => ({
  readEcommercePagesCmsCollectionCards: mocks.readEcommercePagesCmsCollectionCards,
  saveEcommercePagesCmsCollectionCards: mocks.saveEcommercePagesCmsCollectionCards,
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
  new Request('http://localhost/api/v2/products/pages/collection-cards', {
    method: 'PUT',
    body: JSON.stringify(body),
  }) as NextRequest;

describe('products pages CMS collection cards handler', () => {
  beforeEach(() => {
    mocks.readEcommercePagesCmsCollectionCards.mockReset();
    mocks.saveEcommercePagesCmsCollectionCards.mockReset();
  });

  it('returns the saved collection card configuration', async () => {
    mocks.readEcommercePagesCmsCollectionCards.mockResolvedValue({
      cards: [{ id: 'anime', label: 'Anime', visible: true }],
      cloudConfigured: true,
      updatedAt: '2026-05-10T12:00:00.000Z',
      updatedBy: 'user-1',
    });

    const response = await getHandler(
      new Request('http://localhost/api/v2/products/pages/collection-cards') as NextRequest,
      buildContext()
    );
    const body = (await response.json()) as { ok: boolean; collectionCards: { cards: unknown[] } };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      collectionCards: expect.objectContaining({
        cards: [expect.objectContaining({ id: 'anime' })],
      }),
    });
  });

  it('saves cards with the authenticated user id', async () => {
    const cards = [
      {
        id: 'gaming',
        label: 'Gaming',
        sublabel: 'RPG',
        tag: 'Hot',
        visible: false,
        href: '/products?themes=Elden%20Ring',
        imageUrl: 'https://sparksofsindri.com/card.webp',
        selectorType: 'theme',
        selectorValues: ['Elden Ring'],
        fallbackCount: 12,
      },
    ];
    mocks.saveEcommercePagesCmsCollectionCards.mockResolvedValue({
      cards,
      cloudConfigured: true,
      cloudMirrored: true,
      updatedAt: '2026-05-10T12:00:00.000Z',
      updatedBy: 'admin-1',
    });

    const response = await putHandler(buildPutRequest({ cards }), buildContext('admin-1'));
    const body = (await response.json()) as { collectionCards: { cloudMirrored: boolean } };

    expect(response.status).toBe(200);
    expect(body.collectionCards.cloudMirrored).toBe(true);
    expect(mocks.saveEcommercePagesCmsCollectionCards).toHaveBeenCalledWith({
      cards,
      userId: 'admin-1',
    });
  });

  it('rejects unauthenticated save requests before parsing the payload', async () => {
    await expect(putHandler(buildPutRequest({}), buildContext(null))).rejects.toThrow(
      'Unauthorized'
    );
    expect(mocks.saveEcommercePagesCmsCollectionCards).not.toHaveBeenCalled();
  });
});
