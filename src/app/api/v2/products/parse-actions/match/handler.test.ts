import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { matchParsedProductActionsMock } = vi.hoisted(() => ({
  matchParsedProductActionsMock: vi.fn(),
}));

vi.mock('@/features/products/server/product-parse-actions', () => ({
  matchParsedProductActions: (...args: unknown[]) => matchParsedProductActionsMock(...args),
}));

import { postHandler, productParseActionsMatchRequestSchema } from './handler';

describe('products parse-actions match handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    matchParsedProductActionsMock.mockResolvedValue({
      source: 'tradera',
      parsedCount: 1,
      matchedCount: 1,
      actionableCount: 1,
      rows: [
        {
          row: {
            rowId: 'tradera:727745365',
            source: 'tradera',
            title: 'Link | 3 cm | Metal | Gaming Pin | Zelda',
            normalizedTitle: 'link 3 cm metal gaming pin zelda',
            objectNumber: '727745365',
            status: 'closed',
            currency: 'EUR',
            price: 6.17,
            rawPrice: 'EUR 6.17',
            rawText: 'Object no. 727745365',
          },
          matchStatus: 'confirmed',
          confidence: 1,
          reason: 'external_listing_id',
          product: { id: 'product-1', sku: 'SKU-1', name: 'Link' },
          listing: {
            id: 'listing-1',
            productId: 'product-1',
            integrationId: 'integration-tradera',
            externalListingId: '727745365',
            status: 'active',
          },
          candidates: [{ id: 'product-1', sku: 'SKU-1', name: 'Link' }],
        },
      ],
    });
  });

  it('exports the match handler and request schema', () => {
    expect(typeof postHandler).toBe('function');
    expect(typeof productParseActionsMatchRequestSchema.safeParse).toBe('function');
  });

  it('parses pasted marketplace action text into product matches', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products/parse-actions/match', {
        method: 'POST',
      }),
      {
        body: {
          source: 'tradera',
          text: 'Object no. 727745365',
        },
      } as ApiHandlerContext
    );

    expect(matchParsedProductActionsMock).toHaveBeenCalledWith('Object no. 727745365');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        source: 'tradera',
        parsedCount: 1,
        matchedCount: 1,
        actionableCount: 1,
      })
    );
  });
});
