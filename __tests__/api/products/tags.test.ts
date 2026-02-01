import { vi, beforeEach, afterAll } from "vitest";
import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/products/tags/route";
import { PUT, DELETE } from "@/app/api/products/tags/[id]/route";
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
    productTag: {
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

describe("Product Tags API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://mock";
  });

  afterAll(() => {
    vi.restoreAllMocks();
    delete process.env.DATABASE_URL;
  });

  describe("GET /api/products/tags", () => {
    it("should return tags for a given catalogId", async () => {
      const mockTags = [
        { id: "1", name: "Tag 1", color: "#ff0000", catalogId: "cat1" },
        { id: "2", name: "Tag 2", color: "#00ff00", catalogId: "cat1" },
      ];
      vi.mocked(prisma.productTag.findMany).mockResolvedValue(mockTags as any);

      const res = await GET(
        new NextRequest("http://localhost/api/products/tags?catalogId=cat1"),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data).toHaveLength(2);
      expect(prisma.productTag.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { catalogId: "cat1" }
      }));
    });

    it("should return 400 if catalogId is missing", async () => {
      const res = await GET(
        new NextRequest("http://localhost/api/products/tags"),
        { params: Promise.resolve({}) } as any
      );
      expect(res.status).toEqual(400);
    });
  });

  describe("POST /api/products/tags", () => {
    it("should create a new tag", async () => {
      const newTag = { name: "New Tag", color: "#0000ff", catalogId: "cat1" };
      vi.mocked(prisma.productTag.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.productTag.create).mockResolvedValue({ id: "3", ...newTag } as any);

      const res = await POST(
        new NextRequest("http://localhost/api/products/tags", {
          method: "POST",
          body: JSON.stringify(newTag),
        }),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(201);
      expect(data.name).toEqual("New Tag");
      expect(prisma.productTag.create).toHaveBeenCalled();
    });

    it("should return 409 if tag name already exists in catalog", async () => {
      const existingTag = { id: "1", name: "Existing Tag", catalogId: "cat1" };
      vi.mocked(prisma.productTag.findFirst).mockResolvedValue(existingTag as any);

      const res = await POST(
        new NextRequest("http://localhost/api/products/tags", {
          method: "POST",
          body: JSON.stringify({ name: "Existing Tag", catalogId: "cat1" }),
        }),
        { params: Promise.resolve({}) } as any
      );
      expect(res.status).toEqual(409);
    });
  });

  describe("PUT /api/products/tags/[id]", () => {
    it("should update an existing tag", async () => {
      const tagId = "123";
      const updateData = { name: "Updated Tag", color: "#ffffff" };
      vi.mocked(prisma.productTag.findUnique).mockResolvedValue({ id: tagId, catalogId: "cat1" } as any);
      vi.mocked(prisma.productTag.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.productTag.update).mockResolvedValue({ id: tagId, ...updateData, catalogId: "cat1" } as any);

      const res = await PUT(
        new NextRequest(`http://localhost/api/products/tags/${tagId}`, {
          method: "PUT",
          body: JSON.stringify(updateData),
        }),
        { params: Promise.resolve({ id: tagId }) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.name).toEqual("Updated Tag");
    });

    it("should return 404 if tag not found", async () => {
      vi.mocked(prisma.productTag.findUnique).mockResolvedValue(null);
      const res = await PUT(
        new NextRequest("http://localhost/api/products/tags/non-existent", {
          method: "PUT",
          body: JSON.stringify({ name: "New Name" }),
        }),
        { params: Promise.resolve({ id: "non-existent" }) } as any
      );
      expect(res.status).toEqual(404);
    });
  });

  describe("DELETE /api/products/tags/[id]", () => {
    it("should delete a tag", async () => {
      const tagId = "123";
      const res = await DELETE(
        new NextRequest(`http://localhost/api/products/tags/${tagId}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: tagId }) } as any
      );
      expect(res.status).toEqual(200);
      expect(prisma.productTag.delete).toHaveBeenCalledWith({ where: { id: tagId } });
    });
  });
});
