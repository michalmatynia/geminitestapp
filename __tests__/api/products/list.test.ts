import { GET } from "../../../app/api/products/route";
import { PrismaClient } from "@prisma/client";
import { createMockProduct } from "../../../mocks/products";

const prisma = new PrismaClient();

describe("GET /api/products", () => {
  beforeEach(async () => {
    // Clear the database before each test
    await prisma.productImage.deleteMany({});
    await prisma.imageFile.deleteMany({});
    await prisma.product.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

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
});
