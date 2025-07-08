import { createMocks } from "node-mocks-http";
import { GET, POST } from "../../../app/api/products/route";
import { PUT, DELETE } from "../../../app/api/products/[id]/route";
import { PrismaClient } from "@prisma/client";
import { createMockProduct } from "../../../mocks/products";

const prisma = new PrismaClient();

describe("Products API", () => {
  beforeEach(async () => {
    // Clear the database before each test
    await prisma.productImage.deleteMany({});
    await prisma.imageFile.deleteMany({});
    await prisma.product.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("GET /api/products", () => {
    it("should return all products when no filters are applied", async () => {
      await createMockProduct(prisma, { name: "Product 1" });
      await createMockProduct(prisma, { name: "Product 2" });
      const res = await GET(new Request("http://localhost/api/products"));
      const products = await res.json();
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(2);
    });

    it("should return an empty array if no products exist", async () => {
      const res = await GET(new Request("http://localhost/api/products"));
      const products = await res.json();
      expect(res.status).toEqual(200);
      expect(products).toEqual([]);
    });

    it("should filter products by name using the search parameter", async () => {
      await createMockProduct(prisma, { name: "Laptop" });
      await createMockProduct(prisma, { name: "Mouse" });
      const res = await GET(
        new Request("http://localhost/api/products?search=lap")
      );
      const products = await res.json();
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0].name).toEqual("Laptop");
    });

    it("should filter products by minPrice", async () => {
      await createMockProduct(prisma, { price: 100 });
      await createMockProduct(prisma, { price: 500 });
      const res = await GET(
        new Request("http://localhost/api/products?minPrice=200")
      );
      const products = await res.json();
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should filter products by maxPrice", async () => {
      await createMockProduct(prisma, { price: 100 });
      await createMockProduct(prisma, { price: 500 });
      const res = await GET(
        new Request("http://localhost/api/products?maxPrice=200")
      );
      const products = await res.json();
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should filter products by startDate", async () => {
      await createMockProduct(prisma, { createdAt: new Date("2023-01-01") });
      await createMockProduct(prisma, { createdAt: new Date("2023-04-01") });
      const res = await GET(
        new Request("http://localhost/api/products?startDate=2023-03-01")
      );
      const products = await res.json();
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should filter products by endDate", async () => {
      await createMockProduct(prisma, { createdAt: new Date("2023-01-01") });
      await createMockProduct(prisma, { createdAt: new Date("2023-04-01") });
      const res = await GET(
        new Request("http://localhost/api/products?endDate=2023-03-01")
      );
      const products = await res.json();
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should filter products by a combination of search, minPrice, and maxPrice", async () => {
      await createMockProduct(prisma, { name: "Laptop", price: 1200 });
      await createMockProduct(prisma, { name: "Mouse", price: 50 });
      const res = await GET(
        new Request(
          "http://localhost/api/products?search=lap&minPrice=1000&maxPrice=1500"
        )
      );
      const products = await res.json();
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
    });

    it("should return the correct response structure", async () => {
      await createMockProduct(prisma, { name: "Product 1", price: 100 });
      const res = await GET(new Request("http://localhost/api/products"));
      const products = await res.json();
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      const product = products[0];
      expect(product).toHaveProperty("id");
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("price");
      expect(product).toHaveProperty("createdAt");
      expect(product).toHaveProperty("updatedAt");
      expect(product).toHaveProperty("images");
      expect(Array.isArray(product.images)).toBe(true);
    });
  });

  describe("POST /api/products", () => {
    it("should reject invalid product data (missing name)", async () => {
      const formData = new FormData();
      formData.append("price", "100");
      formData.append("sku", "SKU123");
      const req = new Request("http://localhost/api/products", {
        method: "POST",
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toEqual(400);
    });

    it("should reject invalid product data (negative price)", async () => {
      const formData = new FormData();
      formData.append("name", "Product 1");
      formData.append("price", "-100");
      formData.append("sku", "SKU123");
      const req = new Request("http://localhost/api/products", {
        method: "POST",
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toEqual(400);
    });
  });

  describe("PUT /api/products/[id]", () => {
    it("should return 404 when updating a non-existent product", async () => {
      const formData = new FormData();
      formData.append("name", "Updated Product");
      formData.append("price", "150");
      formData.append("sku", "SKU123");
      const req = new Request("http://localhost/api/products/non-existent-id", {
        method: "PUT",
        body: formData,
      });
      const res = await PUT(req, { params: { id: "non-existent-id" } });
      expect(res.status).toEqual(404);
    });
  });

  describe("DELETE /api/products/[id]", () => {
    it("should return 404 when deleting a non-existent product", async () => {
      const req = new Request("http://localhost/api/products/non-existent-id", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params: { id: "non-existent-id" } });
      expect(res.status).toEqual(404);
    });
  });
});