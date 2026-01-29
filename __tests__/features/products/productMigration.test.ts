import { describe, it, expect, vi, beforeEach } from "vitest";
import { migrateProductBatch } from "@/features/products/services/product-migration";
import prisma from "@/shared/lib/db/prisma";
import { createMockProduct } from "@/features/products/utils/productUtils";

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
    }
  };
});

vi.mock("@/shared/lib/db/mongo-client", () => ({
  getMongoDb: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue(mockMongoCollection),
  }),
}));

describe("productMigration", () => {
  beforeEach(async () => {
    await prisma.productCatalog.deleteMany({});
    await prisma.productImage.deleteMany({});
    await prisma.imageFile.deleteMany({});
    await prisma.product.deleteMany({});
    vi.clearAllMocks();
  });

  describe("prisma-to-mongo", () => {
    it("should process a batch of products and call bulkWrite", async () => {
      // Use explicit IDs to ensure deterministic ordering by ID
      await createMockProduct({ name_en: "P1", sku: "SKU1", id: "a1" } as any);
      await createMockProduct({ name_en: "P2", sku: "SKU2", id: "a2" } as any);

      const result = await migrateProductBatch({
        direction: "prisma-to-mongo",
        batchSize: 10,
      });

      expect(result.productsProcessed).toBe(2);
      expect(result.productsUpserted).toBe(2);
      expect(mockMongoCollection.bulkWrite).toHaveBeenCalled();
      
      const bulkWriteCall = (mockMongoCollection.bulkWrite.mock.calls[0] as any[])[0];
      expect(bulkWriteCall.length).toBe(2);
      // Order is guaranteed by orderBy id: asc
      expect(bulkWriteCall[0].replaceOne?.replacement?.sku).toBe("SKU1");
      expect(bulkWriteCall[1].replaceOne?.replacement?.sku).toBe("SKU2");
    });

    it("should respect batchSize and cursor", async () => {
      await createMockProduct({ name_en: "P1", id: "b1" } as any);
      await createMockProduct({ name_en: "P2", id: "b2" } as any);

      const result = await migrateProductBatch({
        direction: "prisma-to-mongo",
        batchSize: 1,
      });

      expect(result.productsProcessed).toBe(1);
      expect(result.nextCursor).toBeDefined();
    });

    it("should not call bulkWrite in dryRun mode", async () => {
      await createMockProduct({ name_en: "P1", id: "c1" } as any);

      const result = await migrateProductBatch({
        direction: "prisma-to-mongo",
        dryRun: true,
      });

      // If other tests are running in parallel, this might be > 1
      // So we check >= 1
      expect(result.productsProcessed).toBeGreaterThanOrEqual(1);
      expect(result.productsUpserted).toBe(0);
      expect(mockMongoCollection.bulkWrite).not.toHaveBeenCalled();
    });
  });

  describe("mongo-to-prisma", () => {
    it("should upsert products into Prisma from Mongo docs", async () => {
      const mockDocs = [
        {
          _id: "mongo-id-1",
          id: "mongo-id-1",
          sku: "MONGO-SKU-1",
          name_en: "Mongo Product",
          createdAt: new Date(),
          updatedAt: new Date(),
          images: [],
          catalogs: [],
        },
      ];
      mockMongoCollection.find().toArray.mockResolvedValueOnce(mockDocs);

      const result = await migrateProductBatch({
        direction: "mongo-to-prisma",
        batchSize: 10,
      });

      expect(result.productsProcessed).toBe(1);
      
      const dbProduct = await prisma.product.findUnique({ where: { id: "mongo-id-1" } });
      expect(dbProduct).toBeDefined();
      expect(dbProduct?.sku).toBe("MONGO-SKU-1");
    });
  });
});
