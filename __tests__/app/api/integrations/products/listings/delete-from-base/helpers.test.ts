import { describe, expect, it } from 'vitest';

import { resolveDeleteInventoryId } from '@/app/api/integrations/products/[id]/listings/[listingId]/delete-from-base/helpers';

describe('resolveDeleteInventoryId', () => {
  it('prefers explicit inventory id from request body', () => {
    const result = resolveDeleteInventoryId('  inv-override  ', 'inv-listing');
    expect(result).toBe('inv-override');
  });

  it('uses listing inventory id when request body does not include inventory', () => {
    const result = resolveDeleteInventoryId(undefined, '  inv-listing  ');
    expect(result).toBe('inv-listing');
  });

  it('throws when no specific inventory id is available', () => {
    expect(() => resolveDeleteInventoryId(undefined, null)).toThrow(
      'Inventory ID is required for Base.com deletion. Default inventory fallback is disabled.'
    );
  });
});
