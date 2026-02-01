import { vi } from "vitest";
import { describe, it, expect, beforeEach, afterAll } from "vitest";

// Mock the api-handler module
vi.mock("@/shared/lib/api/api-handler", () => ({
  apiHandler: (handler: any) => handler,
  apiHandlerWithParams: (handler: any) => (req: any, ctx: any) => {
    const resolvedParams =
      ctx?.params && typeof ctx.params.then === "function"
        ? ctx.params
        : Promise.resolve(ctx?.params ?? {});
    return handler(req, ctx, resolvedParams);
  },
}));

// Mock Prisma client
vi.mock("@/shared/lib/db/prisma", () => ({
  default: {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    productImage: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    imageFile: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

// Mock the api-handler for [id] routes
vi.mock("@/app/api/products/[id]/route", () => ({
  PUT: vi.fn(),
  DELETE: vi.fn(),
}));

// Mock the api-handler for image routes
vi.mock("@/app/api/products/[id]/images/[imageFileId]/route", () => ({
  DELETE: vi.fn(),
}));

// Mock the api-handler for duplicate route
vi.mock("@/app/api/products/[id]/duplicate/route", () => ({
  POST: vi.fn(),
}));

// Mock the public products route
vi.mock("@/app/api/public/products/[id]/route", () => ({
  GET: vi.fn(),
}));

import { GET as GET_LIST, POST } from "@/app/api/products/route";
import { PUT, DELETE } from "@/app/api/products/[id]/route";
import { DELETE as DELETE_IMAGE } from "@/app/api/products/[id]/images/[imageFileId]/route";
import { POST as POST_DUPLICATE } from "@/app/api/products/[id]/duplicate/route";
import { GET as GET_PUBLIC } from "@/app/api/public/products/[id]/route";
import { NextRequest } from "next/server";
import prisma from "@/shared/lib/db/prisma";
import { Product } from "@prisma/client";

// Helper to create mock product data
const createMockProductData = (overrides: Record<string, unknown> = {}) => ({
  id: `test-product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  sku: overrides.sku || `SKU-${Date.now()}`,
  name_en: overrides.name_en || "Test Product (EN)",
  name_pl: overrides.name_pl || "Test Product (PL)",
  name_de: overrides.name_de || "Test Product (DE)",
  description_en: overrides.description_en || "Description (EN)",
  description_pl: overrides.description_pl || "Description (PL)",
  description_de: overrides.description_de || "Description (DE)",
  price: overrides.price || 100,
  stock: overrides.stock || 10,
  weight: overrides.weight || 100,
  length: overrides.length || 20,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Helper to create mock image file
const createMockImageFile = (id: string = `image-${Date.now()}`) => ({
  id,
  filename: "test.jpg",
  filepath: "/uploads/test.jpg",
  mimetype: "image/jpeg",
  size: 1234,
  width: 100,
  height: 100,
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("Products API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.product.create).mockImplementation(async (args: any) => {
      const data = args.data;
      return {
        id: `created-${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
    vi.mocked(prisma.product.update).mockImplementation(async (args: any) => {
      return {
        ...args.data,
        id: args.where.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
    vi.mocked(prisma.product.delete).mockResolvedValue({} as any);
    vi.mocked(prisma.product.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.product.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.product.count).mockResolvedValue(0);
    vi.mocked(prisma.productImage.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.productImage.create).mockResolvedValue({} as any);
    vi.mocked(prisma.productImage.findMany).mockResolvedValue([]);
    vi.mocked(prisma.productImage.createMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.imageFile.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.imageFile.create).mockImplementation((args: any) => ({
      id: `image-${Date.now()}`,
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    vi.mocked(prisma.imageFile.findMany).mockResolvedValue([]);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/products", () => {
    it("should return all products when no filters are applied", async () => {
      await createMockProduct({ name_en: "Product 1" });
      await createMockProduct({ name_en: "Product 2" });
      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products"),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(2);
    });

    it("should return an empty array if no products exist", async () => {
      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products"),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products).toEqual([]);
    });

    it("should filter products by name_en using the search parameter", async () => {
      await createMockProduct({ name_en: "Laptop" });
      await createMockProduct({ name_en: "Mouse" });
      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?search=lap"),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0]!.name_en).toEqual("Laptop");
    });

    it("should filter products by name_pl using the search parameter", async () => {
      await createMockProduct({ name_pl: "Laptop (PL)" });
      await createMockProduct({ name_pl: "Mysz (PL)" });
      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?search=mysz"),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0]!.name_pl).toEqual("Mysz (PL)");
    });

    it("should filter products by name_de using the search parameter", async () => {
      await createMockProduct({ name_de: "Laptop (DE)" });
      await createMockProduct({ name_de: "Maus (DE)" });
      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?search=maus"),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0]!.name_de).toEqual("Maus (DE)");
    });

    it("should filter products by description_en using the search parameter", async () => {
      await createMockProduct({ description_en: "Fast laptop for gaming" });
      await createMockProduct({ description_en: "Ergonomic mouse" });
      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?search=gaming"),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0]!.description_en).toEqual("Fast laptop for gaming");
    });

    it("should filter products by description_pl using the search parameter", async () => {
      await createMockProduct({ description_pl: "Szybki laptop do gier" });
      await createMockProduct({ description_pl: "Ergonomiczna mysz" });
      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?search=gier"),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0]!.description_pl).toEqual("Szybki laptop do gier");
    });

    it("should filter products by description_de using the search parameter", async () => {
      await createMockProduct({
        description_de: "Schneller Laptop für Spiele",
      });
      await createMockProduct({ description_de: "Ergonomische Maus" });
      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?search=spiele"),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0]!.description_de).toEqual(
        "Schneller Laptop für Spiele",
      );
    });

    it("should filter products by minPrice", async () => {
      await createMockProduct({ name_en: "Product Min Price 1", price: "100" });
      await createMockProduct({ name_en: "Product Min Price 2", price: "500" });
      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?minPrice=200"),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should filter products by maxPrice", async () => {
      await createMockProduct({ name_en: "Product Max Price 1", price: "100" });
      await createMockProduct({ name_en: "Product Max Price 2", price: "500" });
      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?maxPrice=200"),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should filter products by startDate", async () => {
      await createMockProduct({
        name_en: "product",
        sku: "1",
        price: "1",
        stock: 1,
      });
      await createMockProduct({
        name_en: "product",
        sku: "2",
        price: "1",
        stock: 1,
      });
      await prisma.product.updateMany({
        where: { sku: "1" },
        data: { createdAt: new Date("2023-01-01") },
      });
      await prisma.product.updateMany({
        where: { sku: "2" },
        data: { createdAt: new Date("2023-04-01") },
      });
      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?startDate=2023-03-01"),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should filter products by endDate", async () => {
      await createMockProduct({
        name_en: "product",
        sku: "1",
        price: "1",
        stock: 1,
      });
      await createMockProduct({
        name_en: "product",
        sku: "2",
        price: "1",
        stock: 1,
      });
      await prisma.product.updateMany({
        where: { sku: "1" },
        data: { createdAt: new Date("2023-01-01") },
      });
      await prisma.product.updateMany({
        where: { sku: "2" },
        data: { createdAt: new Date("2023-04-01") },
      });
      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?endDate=2023-03-01"),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should filter products by a combination of search, minPrice, and maxPrice", async () => {
      await createMockProduct({ name_en: "Laptop", price: "1200" });
      await createMockProduct({ name_en: "Mouse", price: "50" });
      const res = await GET_LIST(
        new NextRequest(
          "http://localhost/api/products?search=lap&minPrice=1000&maxPrice=1500",
        ),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should filter products by SKU", async () => {
      await createMockProduct({ name_en: "SKU 1", sku: "ABC123" });
      await createMockProduct({ name_en: "SKU 2", sku: "XYZ999" });
      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?sku=ABC"),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0]!.sku).toEqual("ABC123");
    });

    it("should return the correct response structure", async () => {
      await createMockProduct({
        name_en: "Product 1 (EN)",
        name_pl: "Product 1 (PL)",
        name_de: "Product 1 (DE)",
        description_en: "Description 1 (EN)",
        description_pl: "Description 1 (PL)",
        description_de: "Description 1 (DE)",
        price: "100",
        sku: "SKU-001",
        weight: 500,
        length: 20,
      });
      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products"),
      );
      const products = (await res.json()) as (Product & {
        images: unknown[];
      })[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      const product = products[0]!;
      expect(product).toHaveProperty("id");
      expect(product).toHaveProperty("name_en");
      expect(product.name_en).toEqual("Product 1 (EN)");
      expect(product).toHaveProperty("name_pl");
      expect(product.name_pl).toEqual("Product 1 (PL)");
      expect(product).toHaveProperty("name_de");
      expect(product.name_de).toEqual("Product 1 (DE)");
      expect(product).toHaveProperty("description_en");
      expect(product.description_en).toEqual("Description 1 (EN)");
      expect(product).toHaveProperty("description_pl");
      expect(product.description_pl).toEqual("Description 1 (PL)");
      expect(product).toHaveProperty("description_de");
      expect(product.description_de).toEqual("Description 1 (DE)");
      expect(product).toHaveProperty("price");
      expect(product).toHaveProperty("sku");
      expect(product.sku).toEqual("SKU-001");
      expect(product).toHaveProperty("createdAt");
      expect(product).toHaveProperty("updatedAt");
      expect(product).toHaveProperty("images");
      expect(Array.isArray(product.images)).toBe(true);
      expect(product).toHaveProperty("weight");
      expect(product.weight).toEqual(500);
      expect(product).toHaveProperty("length");
      expect(product.length).toEqual(20);
    });
  });

  describe("POST /api/products", () => {
    it("should reject invalid product data (invalid price)", async () => {
      const formData = new FormData();
      formData.append("price", "not-a-number");
      formData.append("sku", "SKU123");
      const req = new NextRequest("http://localhost/api/products", {
        method: "POST",
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toEqual(400);
    });

    it("should successfully create a product with localized name and description fields", async () => {
      const formData = new FormData();
      formData.append("name_en", "New Product (EN)");
      formData.append("name_pl", "Nowy Produkt (PL)");
      formData.append("name_de", "Neues Produkt (DE)");
      formData.append("description_en", "Description in English");
      formData.append("description_pl", "Opis po polsku");
      formData.append("description_de", "Beschreibung auf Deutsch");
      formData.append("price", "200");
      formData.append("sku", "NEW-SKU-001");
      formData.append("stock", "50");
      formData.append("weight", "1000");
      formData.append("length", "30");

      const req = {
        headers: new Headers(),
        formData: () => Promise.resolve(formData),
        url: "http://localhost/api/products",
        method: "POST",
      } as unknown as NextRequest;

      const res = await POST(req);
      const product = (await res.json()) as Product;

      expect(res.status).toEqual(200);
      expect(product.name_en).toEqual("New Product (EN)");
      expect(product.name_pl).toEqual("Nowy Produkt (PL)");
      expect(product.name_de).toEqual("Neues Produkt (DE)");
      expect(product.description_en).toEqual("Description in English");
      expect(product.description_pl).toEqual("Opis po polsku");
      expect(product.description_de).toEqual("Beschreibung auf Deutsch");
      expect(product.price).toEqual(200);
      expect(product.sku).toEqual("NEW-SKU-001");
      expect(product.stock).toEqual(50);
      expect(product.weight).toEqual(1000);
      expect(product.length).toEqual(30);

      const fetchedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(fetchedProduct).toBeDefined();
      expect(fetchedProduct?.name_en).toEqual("New Product (EN)");
      expect(fetchedProduct?.weight).toEqual(1000);
      expect(fetchedProduct?.length).toEqual(30);
    });
  });

  describe("PUT /api/products/[id]", () => {
    it("should return 404 when updating a non-existent product", async () => {
      const formData = new FormData();
      formData.append("name_en", "Updated Product");
      formData.append("price", "150");
      formData.append("sku", "SKU123");

      const req = {
        headers: new Headers(),
        formData: () => Promise.resolve(formData),
        url: "http://localhost/api/products/non-existent-id",
        method: "PUT",
      } as unknown as NextRequest;

      const res = await PUT(req, {
        params: Promise.resolve({ id: "non-existent-id" }),
      });
      expect(res.status).toEqual(404);
    });

    it("should link an existing image to a product", async () => {
      const product = await createMockProduct({ name_en: "Product 1" });
      const imageFile = await prisma.imageFile.create({
        data: {
          filename: "test.jpg",
          filepath: "/test.jpg",
          mimetype: "image/jpeg",
          size: 123,
        },
      });

      const formData = new FormData();
      formData.append("name_en", "Updated Product (EN)");
      formData.append("price", "150");
      formData.append("sku", "SKU456");
      formData.append("imageFileIds", imageFile.id);

      const req = {
        headers: new Headers(),
        formData: () => Promise.resolve(formData),
        url: `http://localhost/api/products/${product.id}`,
        method: "PUT",
      } as unknown as NextRequest;

      const res = await PUT(req, {
        params: Promise.resolve({ id: product.id }),
      });
      expect(res.status).toEqual(200);

      const productImages = await prisma.productImage.findMany({
        where: { productId: product.id },
      });
      expect(productImages.length).toEqual(1);
      expect(productImages[0]!.imageFileId).toEqual(imageFile.id);
    });

    it("should successfully update localized name and description fields", async () => {
      const product = await createMockProduct({
        name_en: "Original Product (EN)",
        description_en: "Original description (EN)",
      });

      const formData = new FormData();
      formData.append("name_en", "Updated Name (EN)");
      formData.append("name_pl", "Zaktualizowana Nazwa (PL)");
      formData.append("name_de", "Aktualisierter Name (DE)");
      formData.append("description_en", "Updated description (EN)");
      formData.append("description_pl", "Zaktualizowany opis (PL)");
      formData.append("description_de", "Aktualisierte Beschreibung (DE)");
      formData.append("price", "999");
      formData.append("sku", "UPDATED-SKU");
      formData.append("weight", "1500");
      formData.append("length", "40");

      const req = {
        headers: new Headers(),
        formData: () => Promise.resolve(formData),
        url: `http://localhost/api/products/${product.id}`,
        method: "PUT",
      } as unknown as NextRequest;

      const res = await PUT(req, {
        params: Promise.resolve({ id: product.id }),
      });
      const updatedProduct = (await res.json()) as Product;

      expect(res.status).toEqual(200);
      expect(updatedProduct.id).toEqual(product.id);
      expect(updatedProduct.name_en).toEqual("Updated Name (EN)");
      expect(updatedProduct.name_pl).toEqual("Zaktualizowana Nazwa (PL)");
      expect(updatedProduct.name_de).toEqual("Aktualisierter Name (DE)");
      expect(updatedProduct.description_en).toEqual("Updated description (EN)");
      expect(updatedProduct.description_pl).toEqual("Zaktualizowany opis (PL)");
      expect(updatedProduct.description_de).toEqual(
        "Aktualisierte Beschreibung (DE)",
      );
      expect(updatedProduct.price).toEqual(999);
      expect(updatedProduct.sku).toEqual("UPDATED-SKU");
      expect(updatedProduct.weight).toEqual(1500);
      expect(updatedProduct.length).toEqual(40);
    });
  });

  describe("DELETE /api/products/[id]", () => {
    it("should return 404 when deleting a non-existent product", async () => {
      const req = new NextRequest(
        "http://localhost/api/products/non-existent-id",
        {
          method: "DELETE",
        },
      );
      const res = await DELETE(req, {
        params: Promise.resolve({ id: "non-existent-id" }),
      });
      expect(res.status).toEqual(404);
    });
  });

  describe("DELETE /api/products/[id]/images/[imageFileId]", () => {
    it("should unlink an image from a product", async () => {
      const product = await createMockProduct({
        name_en: "Product with image",
      });
      const imageFile = await prisma.imageFile.create({
        data: {
          filename: "test.jpg",
          filepath: "/test.jpg",
          mimetype: "image/jpeg",
          size: 123,
        },
      });
      await prisma.productImage.create({
        data: {
          productId: product.id,
          imageFileId: imageFile.id,
        },
      });

      const req = new NextRequest(
        `http://localhost/api/products/${product.id}/images/${imageFile.id}`,
        {
          method: "DELETE",
        },
      );
      const res = await DELETE_IMAGE(req, {
        params: Promise.resolve({ id: product.id, imageFileId: imageFile.id }),
      });

      expect(res.status).toEqual(204);

      const productImages = await prisma.productImage.findMany({
        where: {
          productId: product.id,
        },
      });
      expect(productImages.length).toEqual(0);
    });
  });

  describe("GET /api/public/products/[id]", () => {
    it("should return a single product", async () => {
      const product = await createMockProduct({ name_en: "Product 1 (EN)" });
      const req = new NextRequest(
        `http://localhost/api/products/${product.id}`,
      );
      const res = await GET_PUBLIC(req, {
        params: Promise.resolve({ id: product.id }),
      });
      const fetchedProduct = (await res.json()) as Product;
      expect(res.status).toEqual(200);
      expect(fetchedProduct.name_en).toEqual("Product 1 (EN)");
    });

    it("should return a single product when params is a Promise", async () => {
      const product = await createMockProduct({ name_en: "Product 1 (EN)" });
      const req = new NextRequest(
        `http://localhost/api/products/${product.id}`,
      );
      const res = await GET_PUBLIC(req, {
        params: Promise.resolve({ id: product.id }),
      });
      const fetchedProduct = (await res.json()) as Product;
      expect(res.status).toEqual(200);
      expect(fetchedProduct.name_en).toEqual("Product 1 (EN)");
    });
  });

  describe("POST /api/products/[id]/duplicate", () => {
    it("should return 404 when product does not exist", async () => {
      const req = new NextRequest(
        "http://localhost/api/products/non-existent-id/duplicate",
        {
          method: "POST",
          body: JSON.stringify({ sku: "NEW123" }),
        },
      );
      const res = await POST_DUPLICATE(req, {
        params: Promise.resolve({ id: "non-existent-id" }),
      });
      expect(res.status).toEqual(404);
    });

    it("should reject invalid SKU format", async () => {
      const product = await createMockProduct({ name_en: "Product 1 (EN)" });
      const req = new NextRequest(
        `http://localhost/api/products/${product.id}/duplicate`,
        {
          method: "POST",
          body: JSON.stringify({ sku: "bad-sku" }),
        },
      );
      const res = await POST_DUPLICATE(req, {
        params: Promise.resolve({ id: product.id }),
      });
      expect(res.status).toEqual(400);
    });

    it("should reject duplicate SKU", async () => {
      await createMockProduct({ name_en: "Product 1 (EN)", sku: "DUP123" });
      const product = await createMockProduct({ name_en: "Product 2 (EN)" });
      const req = new NextRequest(
        `http://localhost/api/products/${product.id}/duplicate`,
        {
          method: "POST",
          body: JSON.stringify({ sku: "DUP123" }),
        },
      );
      const res = await POST_DUPLICATE(req, {
        params: Promise.resolve({ id: product.id }),
      });
      expect(res.status).toEqual(409);
    });

    it("should duplicate a product without images and with a new SKU", async () => {
      const product = await createMockProduct({
        name_en: "Product 1 (EN)",
        sku: "ORIGINAL1",
        price: "200",
      });
      const imageFile = await prisma.imageFile.create({
        data: {
          filename: "test.jpg",
          filepath: "/uploads/products/temp/test.jpg",
          mimetype: "image/jpeg",
          size: 123,
        },
      });
      await prisma.productImage.create({
        data: {
          productId: product.id,
          imageFileId: imageFile.id,
        },
      });

      const req = new NextRequest(
        `http://localhost/api/products/${product.id}/duplicate`,
        {
          method: "POST",
          body: JSON.stringify({ sku: "NEW123" }),
        },
      );
      const res = await POST_DUPLICATE(req, {
        params: Promise.resolve({ id: product.id }),
      });
      const duplicated = (await res.json()) as Product;

      expect(res.status).toEqual(200);
      expect(duplicated.sku).toEqual("NEW123");
      expect(duplicated.name_en).toEqual("Product 1 (EN)");

      const duplicatedImages = await prisma.productImage.findMany({
        where: { productId: duplicated.id },
      });
      expect(duplicatedImages.length).toEqual(0);
    });
  });
});
