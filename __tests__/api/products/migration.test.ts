import { vi, beforeEach, afterAll } from "vitest";
import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/products/migrate/route";
import { POST as POST_CATEGORIES_MIGRATE } from "@/app/api/products/categories/migrate/route";
import { NextRequest } from "next/server";
import prisma from "@/shared/lib/db/prisma";

// Mock the api-handler module
vi.mock("@/shared/lib/api/api-handler", () => ({
  apiHandler: (handler: any) => handler,
}));

// Mock Prisma client
vi.mock("@/shared/lib/db/prisma", () => ({
  default: {
    productCategory: {
      findMany: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

// Mock Mongo client
vi.mock("@/shared/lib/db/mongo-client", () => ({
  getMongoDb: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      bulkWrite: vi.fn().mockResolvedValue({}),
    }),
  }),
}));

// Mock products server
vi.mock("@/features/products/server", () => ({
  getProductMigrationTotal: vi.fn().mockResolvedValue(100),
  migrateProductBatch: vi.fn().mockResolvedValue({ migrated: 10, nextCursor: "next" }),
  parseJsonBody: async (req: any, schema: any) => {
    try {
      const body = await req.json();
      const result = schema.safeParse(body);
      if (!result.success) {
        return { ok: false, response: new Response(JSON.stringify(result.error), { status: 400 }) };
      }
      return { ok: true, data: result.data };
    } catch (e) {
      return { ok: false, response: new Response("Invalid JSON", { status: 400 }) };
    }
  },
}));

// Mock database server
vi.mock("@/features/database/server", () => ({
  createFullDatabaseBackup: vi.fn().mockResolvedValue({ mongo: true, postgres: true }),
}));

import { getProductMigrationTotal, migrateProductBatch } from "@/features/products/server";
import { createFullDatabaseBackup } from "@/features/database/server";

describe("Product Migration API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://mock";
    process.env.MONGODB_URI = "mongodb://mock";
  });

  afterAll(() => {
    vi.restoreAllMocks();
    delete process.env.DATABASE_URL;
    delete process.env.MONGODB_URI;
  });

  describe("GET /api/products/migrate", () => {
    it("should return total products to migrate", async () => {
      const res = await GET(
        new NextRequest("http://localhost/api/products/migrate?direction=prisma-to-mongo"),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.total).toEqual(100);
      expect(getProductMigrationTotal).toHaveBeenCalledWith("prisma-to-mongo");
    });

    it("should return 400 for invalid direction", async () => {
      const res = await GET(
        new NextRequest("http://localhost/api/products/migrate?direction=invalid"),
        { params: Promise.resolve({}) } as any
      );
      expect(res.status).toEqual(400);
    });
  });

  describe("POST /api/products/migrate", () => {
    it("should run a migration batch and create a backup if starting new", async () => {
      const payload = { direction: "prisma-to-mongo", dryRun: false };
      const res = await POST(
        new NextRequest("http://localhost/api/products/migrate", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.result.migrated).toEqual(10);
      expect(data.backup).toBe(true);
      expect(createFullDatabaseBackup).toHaveBeenCalled();
      expect(migrateProductBatch).toHaveBeenCalled();
    });

    it("should NOT create a backup if dryRun is true", async () => {
      const payload = { direction: "prisma-to-mongo", dryRun: true };
      await POST(
        new NextRequest("http://localhost/api/products/migrate", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
        { params: Promise.resolve({}) } as any
      );
      expect(createFullDatabaseBackup).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/products/categories/migrate", () => {
    it("should migrate categories from prisma to mongo", async () => {
      const mockCategories = [
        { id: "1", name: "Cat 1", catalogId: "cat1", createdAt: new Date(), updatedAt: new Date() },
      ];
      vi.mocked(prisma.productCategory.findMany).mockResolvedValue(mockCategories as any);

      const res = await POST_CATEGORIES_MIGRATE(
        new NextRequest("http://localhost/api/products/categories/migrate", {
          method: "POST",
        }),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.migrated).toEqual(1);
    });
  });
});
