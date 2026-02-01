import { vi, beforeEach, afterAll } from "vitest";
import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/products/migrate/route";
import { NextRequest } from "next/server";

// Mock the api-handler module
vi.mock("@/shared/lib/api/api-handler", () => ({
  apiHandler: (handler: any) => handler,
}));

// Mock products server
vi.mock("@/features/products/server", () => ({
  getProductMigrationTotal: vi.fn().mockResolvedValue(100),
  migrateProductBatch: vi.fn().mockResolvedValue({ migrated: 10, nextCursor: "next" }),
  parseJsonBody: async (req: any, schema: any) => {
    try {
      const body = await req.json();
      return { ok: true, data: body };
    } catch (e) {
      return { ok: false, response: new Response("Invalid JSON", { status: 400 }) };
    }
  },
}));

describe("Product Migration API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    });
  });
});
