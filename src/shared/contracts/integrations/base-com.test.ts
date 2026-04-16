import { describe, expect, it } from 'vitest';

import { baseImportRunStartPayloadSchema } from './base-com';

describe('baseImportRunStartPayloadSchema', () => {
  it('defaults imageMode to download', () => {
    const result = baseImportRunStartPayloadSchema.parse({
      connectionId: 'connection-1',
      inventoryId: 'inventory-1',
      catalogId: 'catalog-1',
    });

    expect(result.imageMode).toBe('download');
    expect(result.uniqueOnly).toBe(true);
    expect(result.allowDuplicateSku).toBe(false);
  });
});
