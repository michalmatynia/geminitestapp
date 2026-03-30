/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';

import { getProductMigrationTotal, migrateProductBatch } from './product-migration';

describe('product-migration', () => {
  it('rejects total and batch migration requests now that legacy migration is removed', async () => {
    await expect(getProductMigrationTotal('mongo-only')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      httpStatus: 400,
      message: 'Legacy product migration has been removed. Products are stored in MongoDB only.',
    });

    await expect(
      migrateProductBatch({
        direction: 'mongo-only',
        batchSize: 10,
      })
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      httpStatus: 400,
      message: 'Legacy product migration has been removed. Products are stored in MongoDB only.',
    });
  });
});
