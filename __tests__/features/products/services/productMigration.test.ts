import { describe, expect, it } from 'vitest';

import {
  getProductMigrationTotal,
  migrateProductBatch,
} from '@/shared/lib/products/services/product-migration';

describe('productMigration', () => {
  it('rejects legacy total requests now that Prisma migration is removed', async () => {
    await expect(getProductMigrationTotal('prisma-to-mongo')).rejects.toMatchObject({
      message: 'Legacy Prisma product migration has been removed. Products are stored in MongoDB only.',
    });
  });

  it('rejects legacy batch migration requests now that Prisma migration is removed', async () => {
    await expect(
      migrateProductBatch({
        direction: 'prisma-to-mongo',
        batchSize: 10,
      })
    ).rejects.toMatchObject({
      message: 'Legacy Prisma product migration has been removed. Products are stored in MongoDB only.',
    });
  });
});
