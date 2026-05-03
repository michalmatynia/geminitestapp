import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { markParsedTraderaMatchesClosedMock } = vi.hoisted(() => ({
  markParsedTraderaMatchesClosedMock: vi.fn(),
}));

vi.mock('@/features/products/server/product-parse-actions', () => ({
  markParsedTraderaMatchesClosed: (...args: unknown[]) =>
    markParsedTraderaMatchesClosedMock(...args),
}));

import { postHandler, productParseActionsMarkTraderaClosedRequestSchema } from './handler';

describe('products parse-actions Tradera mark-closed handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markParsedTraderaMatchesClosedMock.mockResolvedValue({
      status: 'ok',
      requested: 1,
      updated: 1,
      skipped: 0,
      failed: 0,
      results: [
        {
          rowId: 'tradera:727745365',
          productId: 'product-1',
          listingId: 'listing-1',
          status: 'updated',
          message: null,
        },
      ],
    });
  });

  it('exports the mark-closed handler and request schema', () => {
    expect(typeof postHandler).toBe('function');
    expect(typeof productParseActionsMarkTraderaClosedRequestSchema.safeParse).toBe('function');
  });

  it('marks matched Tradera listings as closed', async () => {
    const matches = [
      {
        rowId: 'tradera:727745365',
        productId: 'product-1',
        listingId: 'listing-1',
        objectNumber: '727745365',
        title: 'Link | 3 cm | Metal | Gaming Pin | Zelda',
      },
    ];
    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products/parse-actions/tradera/mark-closed', {
        method: 'POST',
      }),
      {
        body: { matches },
      } as ApiHandlerContext
    );

    expect(markParsedTraderaMatchesClosedMock).toHaveBeenCalledWith(matches);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      requested: 1,
      updated: 1,
      skipped: 0,
      failed: 0,
      results: [
        {
          rowId: 'tradera:727745365',
          productId: 'product-1',
          listingId: 'listing-1',
          status: 'updated',
          message: null,
        },
      ],
    });
  });
});
