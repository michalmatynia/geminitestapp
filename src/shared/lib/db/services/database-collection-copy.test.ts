import { describe, expect, it } from 'vitest';

import { copyCollection, getSupportedCollections } from './database-collection-copy';

describe('database-collection-copy', () => {
  it('returns no supported collections in the MongoDB-only runtime', () => {
    expect(getSupportedCollections()).toEqual([]);
  });

  it('throws the MongoDB-only removal error when collection copy is requested', async () => {
    await expect(copyCollection()).rejects.toMatchObject({
      code: 'OPERATION_FAILED',
      message:
        'Collection copy is unavailable because the legacy SQL copy pipeline has been removed. The application is MongoDB-only.',
    });
  });
});
