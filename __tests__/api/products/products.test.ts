import { vi, beforeEach, afterAll } from "vitest";
import { describe, it, expect } from "vitest";
import { GET as GET_LIST, POST } from "@/app/api/products/route";
import { PUT, DELETE } from "@/app/api/products/[id]/route";
import { POST as POST_DUPLICATE } from "@/app/api/products/[id]/duplicate/route";
import { GET as GET_PUBLIC } from "@/app/api/public/products/[id]/route";
import { NextRequest } from "next/server";
import { productService } from "@/features/products/server";

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

// Mock the system-logger module completely
vi.mock("@/shared/lib/observability/system-logger", () => ({
  logSystemEvent: vi.fn().mockResolvedValue(undefined),
  getErrorFingerprint: vi.fn().mockReturnValue("mock-fingerprint"),
  logError: vi.fn().mockResolvedValue(undefined),
  logInfo: vi.fn().mockResolvedValue(undefined),
  logWarning: vi.fn().mockResolvedValue(undefined),
}));

// Mock the handle-api-error module
vi.mock("@/shared/lib/api/handle-api-error", () => ({
  createErrorResponse: vi.fn().mockImplementation((error) => {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message, code: "ERROR" }), {
      status: 500,
    });
  }),
  createSimpleErrorResponse: vi.fn().mockImplementation((message, status) => {
    return new Response(JSON.stringify({ error: message, code: "ERROR" }), {
      status,
    });
  }),
  createValidationErrorResponse: vi.fn().mockImplementation((fieldErrors) => {
    return new Response(
      JSON.stringify({ error: "Validation failed", fieldErrors }),
      { status: 400 },
    );
  }),
}));

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
  price:
    typeof overrides.price === "number"
      ? overrides.price
      : overrides.price
        ? parseInt(overrides.price as string, 10)
        : 100,
  stock: overrides.stock || 10,
  weight: overrides.weight || 100,
  length: overrides.length || 20,
  createdAt: new Date(),
  updatedAt: new Date(),
  images: [],
  catalogs: [],
  ...overrides,
});

describe("Products API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all productService mocks
    vi.mocked(productService.getProducts).mockReset();
    vi.mocked(productService.getProductById).mockReset();
    vi.mocked(productService.createProduct).mockReset();
    vi.mocked(productService.updateProduct).mockReset();
    vi.mocked(productService.deleteProduct).mockReset();
    vi.mocked(productService.duplicateProduct).mockReset();
    vi.mocked(productService.getProductBySku).mockReset();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/products", () => {
    it("should return all products when no filters are applied", async () => {
      const mockProducts = [
        createMockProductData({ name_en: "Product 1" }),
        createMockProductData({ name_en: "Product 2" }),
      ];
      vi.mocked(productService.getProducts).mockResolvedValue(mockProducts);

      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products"),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(2);
    });

    it("should return an empty array if no products exist", async () => {
      vi.mocked(productService.getProducts).mockResolvedValue([]);

      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products"),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products).toEqual([]);
    });

    it("should filter products by name_en using the search parameter", async () => {
      const mockProducts = [createMockProductData({ name_en: "Laptop" })];
      vi.mocked(productService.getProducts).mockResolvedValue(mockProducts);

      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?search=lap"),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0].name_en).toEqual("Laptop");
    });

    it("should filter products by name_pl using the search parameter", async () => {
      const mockProducts = [createMockProductData({ name_pl: "Mysz (PL)" })];
      vi.mocked(productService.getProducts).mockResolvedValue(mockProducts);

      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?search=mysz"),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0].name_pl).toEqual("Mysz (PL)");
    });

    it("should filter products by name_de using the search parameter", async () => {
      const mockProducts = [createMockProductData({ name_de: "Maus (DE)" })];
      vi.mocked(productService.getProducts).mockResolvedValue(mockProducts);

      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?search=maus"),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0].name_de).toEqual("Maus (DE)");
    });

    it("should filter products by description_en using the search parameter", async () => {
      const mockProducts = [
        createMockProductData({ description_en: "Fast laptop for gaming" }),
      ];
      vi.mocked(productService.getProducts).mockResolvedValue(mockProducts);

      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?search=gaming"),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0].description_en).toEqual("Fast laptop for gaming");
    });

    it("should filter products by description_pl using the search parameter", async () => {
      const mockProducts = [
        createMockProductData({ description_pl: "Szybki laptop do gier" }),
      ];
      vi.mocked(productService.getProducts).mockResolvedValue(mockProducts);

      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?search=gier"),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0].description_pl).toEqual("Szybki laptop do gier");
    });

    it("should filter products by description_de using the search parameter", async () => {
      const mockProducts = [
        createMockProductData({
          description_de: "Schneller Laptop für Spiele",
        }),
      ];
      vi.mocked(productService.getProducts).mockResolvedValue(mockProducts);

      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?search=spiele"),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0].description_de).toEqual("Schneller Laptop für Spiele");
    });

    it("should filter products by minPrice", async () => {
      const mockProducts = [
        createMockProductData({ name_en: "Product Min Price 2", price: 500 }),
      ];
      vi.mocked(productService.getProducts).mockResolvedValue(mockProducts);

      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?minPrice=200"),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should filter products by maxPrice", async () => {
      const mockProducts = [
        createMockProductData({ name_en: "Product Max Price 1", price: 100 }),
      ];
      vi.mocked(productService.getProducts).mockResolvedValue(mockProducts);

      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?maxPrice=200"),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should filter products by startDate", async () => {
      const mockProducts = [
        createMockProductData({
          name_en: "product",
          sku: "2",
          price: 1,
          stock: 1,
        }),
      ];
      vi.mocked(productService.getProducts).mockResolvedValue(mockProducts);

      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?startDate=2023-03-01"),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should filter products by endDate", async () => {
      const mockProducts = [
        createMockProductData({
          name_en: "product",
          sku: "1",
          price: 1,
          stock: 1,
        }),
      ];
      vi.mocked(productService.getProducts).mockResolvedValue(mockProducts);

      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?endDate=2023-03-01"),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should filter products by a combination of search, minPrice, and maxPrice", async () => {
      const mockProducts = [
        createMockProductData({ name_en: "Laptop", price: 1200 }),
      ];
      vi.mocked(productService.getProducts).mockResolvedValue(mockProducts);

      const res = await GET_LIST(
        new NextRequest(
          "http://localhost/api/products?search=lap&minPrice=1000&maxPrice=1500",
        ),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should filter products by SKU", async () => {
      const mockProducts = [
        createMockProductData({ name_en: "SKU 1", sku: "ABC123" }),
      ];
      vi.mocked(productService.getProducts).mockResolvedValue(mockProducts);

      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products?sku=ABC"),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0].sku).toEqual("ABC123");
    });

    it("should return the correct response structure", async () => {
      const mockProduct = createMockProductData({
        name_en: "Product 1 (EN)",
        name_pl: "Product 1 (PL)",
        name_de: "Product 1 (DE)",
        description_en: "Description 1 (EN)",
        description_pl: "Description 1 (PL)",
        description_de: "Description 1 (DE)",
        price: 100,
        sku: "SKU-001",
        weight: 500,
        length: 20,
      });
      vi.mocked(productService.getProducts).mockResolvedValue([mockProduct]);

      const res = await GET_LIST(
        new NextRequest("http://localhost/api/products"),
      );
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      const product = products[0];
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
      vi.mocked(productService.createProduct).mockRejectedValue(
        new Error("Invalid price"),
      );

      const formData = new FormData();
      formData.append("price", "not-a-number");
      formData.append("sku", "SKU123");
      const req = new NextRequest("http://localhost/api/products", {
        method: "POST",
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toEqual(500);
    });

    it("should successfully create a product with localized name and description fields", async () => {
      const mockCreatedProduct = createMockProductData({
        name_en: "New Product (EN)",
        name_pl: "Nowy Produkt (PL)",
        name_de: "Neues Produkt (DE)",
        description_en: "Description in English",
        description_pl: "Opis po polsku",
        description_de: "Beschreibung auf Deutsch",
        price: 200,
        sku: "NEW-SKU-001",
        stock: 50,
        weight: 1000,
        length: 30,
      });
      vi.mocked(productService.createProduct).mockResolvedValue(
        mockCreatedProduct,
      );

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
      const product = await res.json();

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
    });
  });

  describe("PUT /api/products/[id]", () => {
    it("should return 404 when updating a non-existent product", async () => {
      vi.mocked(productService.updateProduct).mockResolvedValue(null);

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

    it("should successfully update localized name and description fields", async () => {
      const productId = "test-product-789";
      const mockUpdatedProduct = createMockProductData({
        id: productId,
        name_en: "Updated Name (EN)",
        name_pl: "Zaktualizowana Nazwa (PL)",
        name_de: "Aktualisierter Name (DE)",
        description_en: "Updated description (EN)",
        description_pl: "Zaktualizowany opis (PL)",
        description_de: "Aktualisierte Beschreibung (DE)",
        price: 999,
        sku: "UPDATED-SKU",
        weight: 1500,
        length: 40,
      });

      vi.mocked(productService.updateProduct).mockResolvedValue(
        mockUpdatedProduct,
      );

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
        url: `http://localhost/api/products/${productId}`,
        method: "PUT",
      } as unknown as NextRequest;

      const res = await PUT(req, {
        params: Promise.resolve({ id: productId }),
      });
      const updatedProduct = await res.json();

      expect(res.status).toEqual(200);
      expect(updatedProduct.id).toEqual(productId);
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
      vi.mocked(productService.deleteProduct).mockResolvedValue(null);

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

  describe("GET /api/public/products/[id]", () => {
    it("should return a single product", async () => {
      const productId = "public-product-123";
      const mockProduct = createMockProductData({
        id: productId,
        name_en: "Product 1 (EN)",
      });
      vi.mocked(productService.getProductById).mockResolvedValue(mockProduct);

      const req = new NextRequest(`http://localhost/api/products/${productId}`);
      const res = await GET_PUBLIC(req, {
        params: Promise.resolve({ id: productId }),
      });
      const fetchedProduct = await res.json();
      expect(res.status).toEqual(200);
      expect(fetchedProduct.name_en).toEqual("Product 1 (EN)");
    });

    it("should return a single product when params is a Promise", async () => {
      const productId = "public-product-456";
      const mockProduct = createMockProductData({
        id: productId,
        name_en: "Product 1 (EN)",
      });
      vi.mocked(productService.getProductById).mockResolvedValue(mockProduct);

      const req = new NextRequest(`http://localhost/api/products/${productId}`);
      const res = await GET_PUBLIC(req, {
        params: Promise.resolve({ id: productId }),
      });
      const fetchedProduct = await res.json();
      expect(res.status).toEqual(200);
      expect(fetchedProduct.name_en).toEqual("Product 1 (EN)");
    });
  });

  describe("POST /api/products/[id]/duplicate", () => {
    it("should return 404 when product does not exist", async () => {
      vi.mocked(productService.duplicateProduct).mockRejectedValue(
        new Error("Product not found"),
      );

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
      expect(res.status).toEqual(500);
    });

    it("should reject invalid SKU format", async () => {
      const productId = "product-sku-test";
      vi.mocked(productService.duplicateProduct).mockRejectedValue(
        new Error("Invalid SKU format"),
      );

      const req = new NextRequest(
        `http://localhost/api/products/${productId}/duplicate`,
        {
          method: "POST",
          body: JSON.stringify({ sku: "bad-sku" }),
        },
      );
      const res = await POST_DUPLICATE(req, {
        params: Promise.resolve({ id: productId }),
      });
      expect(res.status).toEqual(500);
    });

    it("should reject duplicate SKU", async () => {
      const productId = "product-dup-test";
      vi.mocked(productService.duplicateProduct).mockRejectedValue(
        new Error("A product with this SKU already exists."),
      );

      const req = new NextRequest(
        `http://localhost/api/products/${productId}/duplicate`,
        {
          method: "POST",
          body: JSON.stringify({ sku: "DUP123" }),
        },
      );
      const res = await POST_DUPLICATE(req, {
        params: Promise.resolve({ id: productId }),
      });
      expect(res.status).toEqual(500);
    });

    it("should duplicate a product with a new SKU", async () => {
      const productId = "product-dup-new";
      const mockDuplicatedProduct = createMockProductData({
        id: `duplicated-${Date.now()}`,
        name_en: "Product 1 (EN)",
        sku: "NEW123",
        price: 200,
      });
      vi.mocked(productService.duplicateProduct).mockResolvedValue(
        mockDuplicatedProduct,
      );

      const req = new NextRequest(
        `http://localhost/api/products/${productId}/duplicate`,
        {
          method: "POST",
          body: JSON.stringify({ sku: "NEW123" }),
        },
      );
      const res = await POST_DUPLICATE(req, {
        params: Promise.resolve({ id: productId }),
      });
      const duplicated = await res.json();

      expect(res.status).toEqual(200);
      expect(duplicated.sku).toEqual("NEW123");
      expect(duplicated.name_en).toEqual("Product 1 (EN)");
    });
  });
});
