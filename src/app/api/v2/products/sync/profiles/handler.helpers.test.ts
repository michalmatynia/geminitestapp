import { describe, expect, it } from 'vitest';

import {
  buildProductSyncProfileCreateInput,
  buildProductSyncProfilesResponse,
  PRODUCT_SYNC_NO_STORE_HEADERS,
} from './handler.helpers';

describe('product-sync profiles handler helpers', () => {
  it('builds the no-store list response wrapper', () => {
    expect(PRODUCT_SYNC_NO_STORE_HEADERS).toEqual({
      'Cache-Control': 'no-store',
    });
    expect(buildProductSyncProfilesResponse([{ id: 'profile-1' } as never])).toEqual({
      profiles: [{ id: 'profile-1' }],
    });
  });

  it('builds a defined-only create input and backfills missing field-rule ids', () => {
    const createId = () => 'generated-rule-id';

    expect(
      buildProductSyncProfileCreateInput(
        {
          connectionId: 'connection-1',
          inventoryId: 'inventory-1',
          fieldRules: [
            {
              appField: 'stock',
              baseField: 'stock',
              direction: 'base_to_app',
            },
            {
              id: 'rule-2',
              appField: 'sku',
              baseField: 'sku',
              direction: 'disabled',
            },
          ],
        },
        createId
      )
    ).toEqual({
      connectionId: 'connection-1',
      inventoryId: 'inventory-1',
      fieldRules: [
        {
          id: 'generated-rule-id',
          appField: 'stock',
          baseField: 'stock',
          direction: 'base_to_app',
        },
        {
          id: 'rule-2',
          appField: 'sku',
          baseField: 'sku',
          direction: 'disabled',
        },
      ],
    });
  });
});
