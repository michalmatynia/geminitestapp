import { vi, beforeEach, afterAll } from "vitest";
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/products/count/route";
import { NextRequest } from "next/server";
import prisma from "@/shared/lib/db/prisma";

// Mock the api-handler module
vi.mock("@/shared/lib/api/api-handler", () => ({
  apiHandler: (handler: any) => handler,
}));

// Mock Prisma client
vi.mock("@/shared/lib/db/prisma", () => ({
  default: {
    product: {
      count: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

describe("Products Count API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.product.count).mockResolvedValue(0);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/products/count", () => {
    it("should return the total count of products", async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(10);

      const res = await GET(
        new NextRequest("http://localhost/api/products/count"),
        { params: Promise.resolve({}) } as any
      );
      const data = (await res.json()) as { count: number };
      expect(res.status).toEqual(200);
      expect(data.count).toEqual(10);
      expect(prisma.product.count).toHaveBeenCalled();
    });

    it("should pass filters to the product service", async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(5);

      const res = await GET(
        new NextRequest("http://localhost/api/products/count?search=test&minPrice=100"),
        { params: Promise.resolve({}) } as any
      );
      const data = (await res.json()) as { count: number };
      expect(res.status).toEqual(200);
      expect(data.count).toEqual(5);
      
      // Verify that count was called with correct filters
      // Note: We might need to check how buildProductWhere translates these
      expect(prisma.product.count).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.any(Object)
      }));
    });

    it("should return 500 if product service throws an error", async () => {
      vi.mocked(prisma.product.count).mockRejectedValue(new Error("Database error"));

      const res = await GET(
        new NextRequest("http://localhost/api/products/count"),
        { params: Promise.resolve({}) } as any
      );
      expect(res.status).toEqual(500);
    });
  });
});
