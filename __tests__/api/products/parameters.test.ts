import { vi, beforeEach, afterAll } from "vitest";
import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/products/parameters/route";
import { PUT, DELETE } from "@/app/api/products/parameters/[id]/route";
import { NextRequest } from "next/server";
import prisma from "@/shared/lib/db/prisma";

// Mock the api-handler module
vi.mock("@/shared/lib/api/api-handler", () => ({
  apiHandler: (handler: any) => handler,
  apiHandlerWithParams: (handler: any) => (req: any, ctx: any) => {
    const params = ctx?.params instanceof Promise ? ctx.params : Promise.resolve(ctx?.params ?? {});
    return params.then(resolvedParams => handler(req, ctx, resolvedParams));
  },
}));

// Mock Prisma client
vi.mock("@/shared/lib/db/prisma", () => ({
  default: {
    productParameter: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
    } catch (e) {
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
      const mockParams = [
        { id: "1", name_en: "Param 1", catalogId: "cat1" },
        { id: "2", name_en: "Param 2", catalogId: "cat1" },
      ];
      vi.mocked(prisma.productParameter.findMany).mockResolvedValue(mockParams as any);

      const res = await GET(
        new NextRequest("http://localhost/api/products/parameters?catalogId=cat1"),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data).toHaveLength(2);
      expect(prisma.productParameter.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { catalogId: "cat1" }
      }));
    });

    it("should return 400 if catalogId is missing", async () => {
      const res = await GET(
        new NextRequest("http://localhost/api/products/parameters"),
        { params: Promise.resolve({}) } as any
      );
      expect(res.status).toEqual(400);
    });
  });

  describe("POST /api/products/parameters", () => {
    it("should create a new parameter", async () => {
      const newParam = { name_en: "New Param", catalogId: "cat1" };
      vi.mocked(prisma.productParameter.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.productParameter.create).mockResolvedValue({ id: "3", ...newParam } as any);

      const res = await POST(
        new NextRequest("http://localhost/api/products/parameters", {
          method: "POST",
          body: JSON.stringify(newParam),
        }),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(201);
      expect(data.name_en).toEqual("New Param");
      expect(prisma.productParameter.create).toHaveBeenCalled();
    });

    it("should return 409 if parameter name already exists in catalog", async () => {
      const existingParam = { id: "1", name_en: "Existing", catalogId: "cat1" };
      vi.mocked(prisma.productParameter.findFirst).mockResolvedValue(existingParam as any);

      const res = await POST(
        new NextRequest("http://localhost/api/products/parameters", {
          method: "POST",
          body: JSON.stringify({ name_en: "Existing", catalogId: "cat1" }),
        }),
        { params: Promise.resolve({}) } as any
      );
      expect(res.status).toEqual(409);
    });
  });

  describe("PUT /api/products/parameters/[id]", () => {
    it("should update an existing parameter", async () => {
      const paramId = "123";
      const updateData = { name_en: "Updated Name" };
      vi.mocked(prisma.productParameter.findUnique).mockResolvedValue({ id: paramId, catalogId: "cat1" } as any);
      vi.mocked(prisma.productParameter.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.productParameter.update).mockResolvedValue({ id: paramId, ...updateData, catalogId: "cat1" } as any);

      const res = await PUT(
        new NextRequest(`http://localhost/api/products/parameters/${paramId}`, {
          method: "PUT",
          body: JSON.stringify(updateData),
        }),
        { params: Promise.resolve({ id: paramId }) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.name_en).toEqual("Updated Name");
    });

    it("should return 404 if parameter not found", async () => {
      vi.mocked(prisma.productParameter.findUnique).mockResolvedValue(null);
      const res = await PUT(
        new NextRequest("http://localhost/api/products/parameters/non-existent", {
          method: "PUT",
          body: JSON.stringify({ name_en: "New Name" }),
        }),
        { params: Promise.resolve({ id: "non-existent" }) } as any
      );
      expect(res.status).toEqual(404);
    });
  });

  describe("DELETE /api/products/parameters/[id]", () => {
    it("should delete a parameter", async () => {
      const paramId = "123";
      const res = await DELETE(
        new NextRequest(`http://localhost/api/products/parameters/${paramId}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: paramId }) } as any
      );
      expect(res.status).toEqual(200);
      expect(prisma.productParameter.delete).toHaveBeenCalledWith({ where: { id: paramId } });
    });
  });
});
