import { describe, expect, it } from 'vitest';

import {
  getProductMigrationTotal,
  migrateProductBatch,
} from '@/shared/lib/products/services/product-migration';

describe('productMigration', () => {
  it('rejects legacy total requests now that the SQL migration is removed', async () => {
    await expect(getProductMigrationTotal('mongo-only')).rejects.toMatchObject({
      message: 'Legacy product migration has been removed. Products are stored in MongoDB only.',
    });
  });

  it('rejects legacy batch migration requests now that the SQL migration is removed', async () => {
    await expect(
      migrateProductBatch({
        direction: 'mongo-only',
        batchSize: 10,
      })
    ).rejects.toMatchObject({
      message: 'Legacy product migration has been removed. Products are stored in MongoDB only.',
    });
  });
});
