import { describe, it, expect, beforeEach } from "vitest";
import { prismaProductRepository } from "@/features/products/services/product-repository/prisma-product-repository";
import prisma from "@/shared/lib/db/prisma";

describe("prismaProductRepository", () => {
  beforeEach(async () => {
    await prisma.productCategoryAssignment.deleteMany({});
    await prisma.productTagAssignment.deleteMany({});
    await prisma.productCatalog.deleteMany({});
    await prisma.productImage.deleteMany({});
    await prisma.imageFile.deleteMany({});
    await prisma.product.deleteMany({});
  });

  it("should create and retrieve a product", async () => {
    const data = {
      name_en: "Test Repository Product",
      sku: "REPO-SKU-1",
      price: 1000,
    };

    const created = await prismaProductRepository.createProduct(data);
    expect(created).toBeDefined();
    expect(created.sku).toBe("REPO-SKU-1");

    const found = await prismaProductRepository.getProductById(created.id);
    expect(found).toBeDefined();
    expect(found?.name_en).toBe("Test Repository Product");
  });

  it("should handle SKU conflicts", async () => {
    const data = {
      name_en: "Product 1",
      sku: "CONFLICT-SKU",
    };
    await prismaProductRepository.createProduct(data);

    await expect(prismaProductRepository.createProduct(data)).rejects.toThrow("A product with this SKU already exists.");
  });

  it("should update a product", async () => {
    const created = await prismaProductRepository.createProduct({ name_en: "Original" });
    const updated = await prismaProductRepository.updateProduct(created.id, { name_en: "Updated" });
    
    expect(updated?.name_en).toBe("Updated");
  });

  it("should delete a product", async () => {
    const created = await prismaProductRepository.createProduct({ name_en: "To Delete" });
    await prismaProductRepository.deleteProduct(created.id);
    
    const found = await prismaProductRepository.getProductById(created.id);
    expect(found).toBeNull();
  });

  it("should find products with filters", async () => {
    await prismaProductRepository.createProduct({ name_en: "Apple", price: 10 });
    await prismaProductRepository.createProduct({ name_en: "Banana", price: 20 });
    
    const apple = await prismaProductRepository.getProducts({ search: "apple" });
    expect(apple.length).toBe(1);
    expect(apple[0]?.name_en).toBe("Apple");

    const expensive = await prismaProductRepository.getProducts({ minPrice: "15" });
    expect(expensive.length).toBe(1);
    expect(expensive[0]?.name_en).toBe("Banana");
  });
});
