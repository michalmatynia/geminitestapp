import { vi, beforeEach, afterAll } from "vitest";
import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/products/categories/route";
import { GET as GET_TREE } from "@/app/api/products/categories/tree/route";
import { GET as GET_BY_ID, PUT, DELETE } from "@/app/api/products/categories/[id]/route";
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
    productCategory: {
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

describe("Product Categories API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://mock";
  });

  afterAll(() => {
    vi.restoreAllMocks();
    delete process.env.DATABASE_URL;
  });

  describe("GET /api/products/categories", () => {
    it("should return categories for a given catalogId", async () => {
      const mockCategories = [
        { id: "1", name: "Cat 1", catalogId: "cat1", parentId: null },
        { id: "2", name: "Cat 2", catalogId: "cat1", parentId: "1" },
      ];
      vi.mocked(prisma.productCategory.findMany).mockResolvedValue(mockCategories as any);

      const res = await GET(
        new NextRequest("http://localhost/api/products/categories?catalogId=cat1"),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data).toHaveLength(2);
      expect(prisma.productCategory.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { catalogId: "cat1" }
      }));
    });

    it("should return 400 if catalogId is missing", async () => {
      const res = await GET(
        new NextRequest("http://localhost/api/products/categories"),
        { params: Promise.resolve({}) } as any
      );
      expect(res.status).toEqual(400);
    });
  });

  describe("GET /api/products/categories/tree", () => {
    it("should return categories as a tree", async () => {
      const mockCategories = [
        { id: "1", name: "Parent", catalogId: "cat1", parentId: null },
        { id: "2", name: "Child", catalogId: "cat1", parentId: "1" },
      ];
      vi.mocked(prisma.productCategory.findMany).mockResolvedValue(mockCategories as any);

      const res = await GET_TREE(
        new NextRequest("http://localhost/api/products/categories/tree?catalogId=cat1"),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data).toHaveLength(1);
      expect(data[0].id).toEqual("1");
      expect(data[0].children).toHaveLength(1);
      expect(data[0].children[0].id).toEqual("2");
    });
  });

  describe("POST /api/products/categories", () => {
    it("should create a new category", async () => {
      const newCategory = { name: "New Category", catalogId: "cat1", parentId: null };
      vi.mocked(prisma.productCategory.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.productCategory.create).mockResolvedValue({ id: "3", ...newCategory } as any);

      const res = await POST(
        new NextRequest("http://localhost/api/products/categories", {
          method: "POST",
          body: JSON.stringify(newCategory),
        }),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(201);
      expect(data.name).toEqual("New Category");
      expect(prisma.productCategory.create).toHaveBeenCalled();
    });

    it("should return 409 if category name already exists at the same level", async () => {
      const existingCategory = { id: "1", name: "Existing", catalogId: "cat1", parentId: null };
      vi.mocked(prisma.productCategory.findFirst).mockResolvedValue(existingCategory as any);

      const res = await POST(
        new NextRequest("http://localhost/api/products/categories", {
          method: "POST",
          body: JSON.stringify({ name: "Existing", catalogId: "cat1", parentId: null }),
        }),
        { params: Promise.resolve({}) } as any
      );
      expect(res.status).toEqual(409);
    });
  });

  describe("GET /api/products/categories/[id]", () => {
    it("should return a category by ID with its children", async () => {
      const catId = "123";
      const mockCategory = { id: catId, name: "Cat 1", children: [], parent: null };
      vi.mocked(prisma.productCategory.findUnique).mockResolvedValue(mockCategory as any);

      const res = await GET_BY_ID(
        new NextRequest(`http://localhost/api/products/categories/${catId}`),
        { params: Promise.resolve({ id: catId }) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.id).toEqual(catId);
    });

    it("should return 404 if category not found", async () => {
      vi.mocked(prisma.productCategory.findUnique).mockResolvedValue(null);
      const res = await GET_BY_ID(
        new NextRequest("http://localhost/api/products/categories/non-existent"),
        { params: Promise.resolve({ id: "non-existent" }) } as any
      );
      expect(res.status).toEqual(404);
    });
  });

  describe("PUT /api/products/categories/[id]", () => {
    it("should update a category", async () => {
      const catId = "123";
      const updateData = { name: "Updated Name" };
      vi.mocked(prisma.productCategory.findUnique).mockResolvedValue({ id: catId, catalogId: "cat1", parentId: null } as any);
      vi.mocked(prisma.productCategory.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.productCategory.update).mockResolvedValue({ id: catId, ...updateData } as any);

      const res = await PUT(
        new NextRequest(`http://localhost/api/products/categories/${catId}`, {
          method: "PUT",
          body: JSON.stringify(updateData),
        }),
        { params: Promise.resolve({ id: catId }) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.name).toEqual("Updated Name");
    });
  });

  describe("DELETE /api/products/categories/[id]", () => {
    it("should delete a category", async () => {
      const catId = "123";
      const res = await DELETE(
        new NextRequest(`http://localhost/api/products/categories/${catId}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: catId }) } as any
      );
      expect(res.status).toEqual(200);
      expect(prisma.productCategory.delete).toHaveBeenCalledWith({ where: { id: catId } });
    });
  });
});
