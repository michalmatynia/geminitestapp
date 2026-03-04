import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import type { AnyBulkWriteOperation } from 'mongodb';
import { Product } from '@prisma/client';

vi.unmock('@/shared/lib/db/prisma');

import { migrateProductBatch } from '@/shared/lib/products/services/product-migration';
import { createMockProduct } from '@/shared/lib/products/utils/productUtils';
import prisma from '@/shared/lib/db/prisma';

// Use vi.hoisted to define the mock before it's used in vi.mock
const { mockMongoCollection } = vi.hoisted(() => {
  return {
    mockMongoCollection: {
      bulkWrite: vi.fn().mockResolvedValue({}),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
    },
  };
});

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue(mockMongoCollection),
  }),
}));

let canMutateProductMigrationTables = true;

describe('productMigration', () => {
  const shouldSkipProductMigrationTests = (): boolean =>
    !process.env['DATABASE_URL'] || !canMutateProductMigrationTables;

  beforeEach(async () => {
    if (shouldSkipProductMigrationTests()) return;

    try {
      await prisma.productCatalog.deleteMany({});
      await prisma.productImage.deleteMany({});
      await prisma.imageFile.deleteMany({});
      await prisma.product.deleteMany({});
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EPERM') {
        canMutateProductMigrationTables = false;
        return;
      }
      throw error;
    }
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('prisma-to-mongo', () => {
    it('should process a batch of products and call bulkWrite', async () => {
      if (shouldSkipProductMigrationTests()) return;
      // Use explicit IDs to ensure deterministic ordering by ID
      await createMockProduct({ name_en: 'P1', sku: 'SKU1' });
      await createMockProduct({ name_en: 'P2', sku: 'SKU2' });

      const result = await migrateProductBatch({
        direction: 'prisma-to-mongo',
        batchSize: 10,
      });

      expect(result.productsProcessed).toBe(2);
      expect(result.productsUpserted).toBe(2);
      expect(mockMongoCollection.bulkWrite).toHaveBeenCalled();

      const bulkWriteCall = mockMongoCollection.bulkWrite.mock.calls[0]![0] as AnyBulkWriteOperation[];
      expect(bulkWriteCall.length).toBe(2);

      const skus = bulkWriteCall.map((op) => {
        if ('replaceOne' in op) {
          return (op.replaceOne.replacement as unknown as Product).sku;
        }
        return null;
      });
      expect(skus).toContain('SKU1');
      expect(skus).toContain('SKU2');
    });

    it('should respect batchSize and cursor', async () => {
      if (shouldSkipProductMigrationTests()) return;
      await createMockProduct({ name_en: 'P1' });
      await createMockProduct({ name_en: 'P2' });

      const result = await migrateProductBatch({
        direction: 'prisma-to-mongo',
        batchSize: 1,
      });

      expect(result.productsProcessed).toBe(1);
      expect(result.nextCursor).toBeDefined();
    });

    it('should not call bulkWrite in dryRun mode', async () => {
      if (shouldSkipProductMigrationTests()) return;
      await createMockProduct({ name_en: 'P1' });

      const result = await migrateProductBatch({
        direction: 'prisma-to-mongo',
        dryRun: true,
      });

      expect(result.productsProcessed).toBeGreaterThanOrEqual(1);
      expect(result.productsUpserted).toBe(0);
      expect(mockMongoCollection.bulkWrite).not.toHaveBeenCalled();
    });
  });

  describe('mongo-to-prisma', () => {
    it('should upsert products into Prisma from Mongo docs', async () => {
      if (shouldSkipProductMigrationTests()) return;
      const mockDocs = [
        {
          _id: 'mongo-id-1',
          id: 'mongo-id-1',
          sku: 'MONGO-SKU-1',
          name_en: 'Mongo Product',
          createdAt: new Date(),
          updatedAt: new Date(),
          images: [],
          catalogs: [],
        },
      ];
      mockMongoCollection.find().toArray.mockResolvedValueOnce(mockDocs);

      const result = await migrateProductBatch({
        direction: 'mongo-to-prisma',
        batchSize: 10,
      });

      expect(result.productsProcessed).toBe(1);

      const dbProduct = await prisma.product.findUnique({ where: { id: 'mongo-id-1' } });
      expect(dbProduct).toBeDefined();
      expect(dbProduct?.sku).toBe('MONGO-SKU-1');
    });
  });
});
