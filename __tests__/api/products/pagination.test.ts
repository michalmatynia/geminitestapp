import { GET as GET_COUNT } from "../../../app/api/products/count/route";
import { GET as GET_LIST } from "../../../app/api/products/route";
import { createMockProduct } from "@/lib/utils/productUtils";
import prisma from "@/lib/prisma";

describe("Products API - Pagination and Count", () => {
  beforeEach(async () => {
    await prisma.productImage.deleteMany({});
    await prisma.imageFile.deleteMany({});
    await prisma.product.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("GET /api/products/count", () => {
    it("should return the total count of products", async () => {
      await createMockProduct({ name_en: "P1", sku: "SKU1" });
      await createMockProduct({ name_en: "P2", sku: "SKU2" });
      await createMockProduct({ name_en: "P3", sku: "SKU3" });

      const res = await GET_COUNT(new Request("http://localhost/api/products/count"));
      const data = await res.json();

      expect(res.status).toEqual(200);
      expect(data.count).toEqual(3);
    });

    it("should return the filtered count of products", async () => {
      await createMockProduct({ name_en: "Laptop", sku: "SKU1" });
      await createMockProduct({ name_en: "Mouse", sku: "SKU2" });

      const res = await GET_COUNT(new Request("http://localhost/api/products/count?search=lap"));
      const data = await res.json();

      expect(res.status).toEqual(200);
      expect(data.count).toEqual(1);
    });
  });

  describe("GET /api/products - Server-side Pagination", () => {
    it("should return a limited number of products based on pageSize", async () => {
      for (let i = 1; i <= 5; i++) {
        await createMockProduct({ name_en: `Product ${i}`, sku: `SKU${i}` });
      }

      const res = await GET_LIST(new Request("http://localhost/api/products?pageSize=2"));
      const products = await res.json();

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(2);
    });

    it("should return the correct page of products", async () => {
      // Products are ordered by createdAt desc in repository.
      // We'll create them with a slight delay or just rely on IDs/Names if we can control order.
      // For simplicity, let's just check that we get different products on different pages.
      for (let i = 1; i <= 5; i++) {
        await createMockProduct({ name_en: `Product ${i}`, sku: `SKU${i}` });
      }

      const res1 = await GET_LIST(new Request("http://localhost/api/products?page=1&pageSize=2"));
      const page1 = await res1.json();

      const res2 = await GET_LIST(new Request("http://localhost/api/products?page=2&pageSize=2"));
      const page2 = await res2.json();

      expect(page1.length).toEqual(2);
      expect(page2.length).toEqual(2);
      expect(page1[0].id).not.toEqual(page2[0].id);
      expect(page1[1].id).not.toEqual(page2[1].id);
    });
  });
});
