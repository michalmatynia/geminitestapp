import { describe, expect, it } from 'vitest';

import {
  buildProductSyncRelinkJobInput,
  buildProductSyncRelinkResponse,
  PRODUCT_SYNC_RELINK_SOURCE,
} from './handler.helpers';

describe('product-sync relink handler helpers', () => {
  it('builds a defined-only relink job payload and preserves nullable catalog ids', () => {
    expect(
      buildProductSyncRelinkJobInput({
        connectionId: 'connection-1',
        inventoryId: 'inventory-1',
        catalogId: null,
        limit: 25,
      })
    ).toEqual({
      connectionId: 'connection-1',
      inventoryId: 'inventory-1',
      catalogId: null,
      limit: 25,
      source: PRODUCT_SYNC_RELINK_SOURCE,
    });

    expect(buildProductSyncRelinkJobInput({})).toEqual({
      source: PRODUCT_SYNC_RELINK_SOURCE,
    });
  });

  it('builds the queued relink response', () => {
    expect(buildProductSyncRelinkResponse('job-1')).toEqual({
      status: 'queued',
      jobId: 'job-1',
    });
  });
});
