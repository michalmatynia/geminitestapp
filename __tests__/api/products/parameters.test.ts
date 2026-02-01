import { vi, beforeEach, afterAll } from "vitest";
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/products/parameters/route";
import { NextRequest } from "next/server";
import prisma from "@/shared/lib/db/prisma";

// Mock the api-handler module
vi.mock("@/shared/lib/api/api-handler", () => ({
  apiHandler: (handler: any) => handler,
}));

// Mock Prisma client
vi.mock("@/shared/lib/db/prisma", () => ({
  default: {
    productParameter: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

// Mock data provider
vi.mock("@/features/products/server", () => ({
  getProductDataProvider: vi.fn().mockResolvedValue("prisma"),
  parseJsonBody: async (req: any, schema: any) => {
    try {
      const body = await req.json();
      const result = schema.safeParse(body);
      if (!result.success) {
        return { ok: false, response: new Response(JSON.stringify(result.error), { status: 400 }) };
      }
      return { ok: true, data: result.data };
    } catch {
      return { ok: false, response: new Response("Invalid JSON", { status: 400 }) };
    }
  },
}));

describe("Product Parameters API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://mock";
  });

  afterAll(() => {
    vi.restoreAllMocks();
    delete process.env.DATABASE_URL;
  });

  describe("GET /api/products/parameters", () => {
    it("should return parameters for a given catalogId", async () => {
      const mockParams = [{ id: "1", name_en: "Param 1", catalogId: "cat1" }];
      vi.mocked(prisma.productParameter.findMany).mockResolvedValue(mockParams as any);

      const res = await GET(
        new NextRequest("http://localhost/api/products/parameters?catalogId=cat1")
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data).toHaveLength(1);
    });
  });
});
