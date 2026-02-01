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
    });
  });
});
