import { describe, it, expect, beforeEach, vi } from "vitest";
import { productService } from "@/features/products/services/productService";
import prisma from "@/shared/lib/db/prisma";
import { createMockProduct } from "@/features/products/utils/productUtils";
import fs from "fs/promises";

vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    rmdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    rename: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/features/products/services/product-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/products/services/product-repository")>();
  return {
    ...actual,
    getProductRepository: vi.fn().mockImplementation(async () => {
      const { prismaProductRepository } = await import("@/features/products/services/product-repository/prisma-product-repository");
      return prismaProductRepository;
    }),
  };
});

vi.mock("@/features/products/services/product-provider", () => ({
  getProductDataProvider: vi.fn().mockResolvedValue("prisma"),
}));

describe("productService", () => {
  beforeEach(async () => {
    // Clear the database before each test
    // Order matters because of foreign keys
    await prisma.productCategoryAssignment.deleteMany({});
    await prisma.productTagAssignment.deleteMany({});
    await prisma.productCatalog.deleteMany({});
    await prisma.productImage.deleteMany({});
    await prisma.imageFile.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.catalog.deleteMany({});
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  describe("getProductById", () => {
    it("should return a product by ID", async () => {
      const product = await createMockProduct({ name_en: "Test Product" });
      const found = await productService.getProductById(product.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(product.id);
      expect(found?.name_en).toBe("Test Product");
    });

    it("should return null if product not found", async () => {
      const found = await productService.getProductById("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("createProduct", () => {
    it("should successfully create a product from FormData", async () => {
      const formData = new FormData();
      formData.append("name_en", "New Product");
      formData.append("sku", "NEW-SKU-123");
      formData.append("price", "500");

      const product = await productService.createProduct(formData);

      expect(product).toBeDefined();
      expect(product?.name_en).toBe("New Product");
      expect(product?.sku).toBe("NEW-SKU-123");
      expect(product?.price).toBe(500);

      const dbProduct = await prisma.product.findUnique({ where: { id: product?.id } });
      expect(dbProduct).toBeDefined();
      expect(dbProduct?.name_en).toBe("New Product");
    });

    it("should link catalogs if provided", async () => {
      const catalog = await prisma.catalog.create({
        data: { name: "Test Catalog" },
      });

      const formData = new FormData();
      formData.append("name_en", "Catalog Product");
      formData.append("sku", "CAT-123");
      formData.append("catalogIds", catalog.id);

      const product = await productService.createProduct(formData);
      
      const productInCatalog = await prisma.productCatalog.findFirst({
        where: { productId: product?.id, catalogId: catalog.id },
      });
      expect(productInCatalog).toBeDefined();
    });
  });

  describe("updateProduct", () => {
    it("should update product fields", async () => {
      const original = await createMockProduct({ name_en: "Old Name", sku: "OLD-SKU" });
      
      const formData = new FormData();
      formData.append("name_en", "Updated Name");
      
      const updated = await productService.updateProduct(original.id, formData);
      
      expect(updated?.name_en).toBe("Updated Name");
      expect(updated?.sku).toBe("OLD-SKU");
    });

    it("should update SKU", async () => {
      const original = await createMockProduct({ name_en: "Product", sku: "OLD-SKU" });
      
      const formData = new FormData();
      formData.append("sku", "NEW-SKU");
      
      const updated = await productService.updateProduct(original.id, formData);
      
      expect(updated?.sku).toBe("NEW-SKU");
    });
  });

  describe("unlinkImageFromProduct", () => {
    it("should unlink an image and NOT delete file if other products use it", async () => {
      const imageFile = await prisma.imageFile.create({
        data: {
          filename: "shared.jpg",
          filepath: "/uploads/products/shared.jpg",
          mimetype: "image/jpeg",
          size: 100,
        },
      });

      const p1 = await createMockProduct({ sku: "P1" });
      const p2 = await createMockProduct({ sku: "P2" });

      await prisma.productImage.createMany({
        data: [
          { productId: p1.id, imageFileId: imageFile.id },
          { productId: p2.id, imageFileId: imageFile.id },
        ],
      });

      await productService.unlinkImageFromProduct(p1.id, imageFile.id);

      const p1Images = await prisma.productImage.findMany({ where: { productId: p1.id } });
      expect(p1Images.length).toBe(0);

      const p2Images = await prisma.productImage.findMany({ where: { productId: p2.id } });
      expect(p2Images.length).toBe(1);

      const dbImageFile = await prisma.imageFile.findUnique({ where: { id: imageFile.id } });
      expect(dbImageFile).toBeDefined();
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it("should unlink an image and delete file if it was the last link", async () => {
      const imageFile = await prisma.imageFile.create({
        data: {
          filename: "last.jpg",
          filepath: "/uploads/products/last.jpg",
          mimetype: "image/jpeg",
          size: 100,
        },
      });

      const p1 = await createMockProduct({ sku: "P1" });
      await prisma.productImage.create({
        data: { productId: p1.id, imageFileId: imageFile.id },
      });

      await productService.unlinkImageFromProduct(p1.id, imageFile.id);

      const p1Images = await prisma.productImage.findMany({ where: { productId: p1.id } });
      expect(p1Images.length).toBe(0);

      const dbImageFile = await prisma.imageFile.findUnique({ where: { id: imageFile.id } });
      expect(dbImageFile).toBeNull();
      expect(fs.unlink).toHaveBeenCalled();
    });
  });

  describe("duplicateProduct", () => {
    it("should successfully duplicate a product with a new SKU", async () => {
      const original = await createMockProduct({
        name_en: "Original Product",
        price: "100",
        sku: "ORIG123",
      });

      const duplicated = await productService.duplicateProduct(original.id, "NEW123");

      expect(duplicated).toBeDefined();
      expect(duplicated?.id).not.toBe(original.id);
      expect(duplicated?.sku).toBe("NEW123");
      expect(duplicated?.name_en).toBe("Original Product");
      expect(duplicated?.price).toBe(100);
    });

    it("should throw error if SKU is missing", async () => {
      const original = await createMockProduct({ sku: "ORIG456" });
      await expect(productService.duplicateProduct(original.id, "")).rejects.toThrow("SKU is required");
    });

    it("should throw error if SKU format is invalid", async () => {
      const original = await createMockProduct({ sku: "ORIG789" });
      await expect(productService.duplicateProduct(original.id, "invalid sku")).rejects.toThrow("SKU must use uppercase letters and numbers only");
    });

    it("should return null if original product does not exist", async () => {
      const result = await productService.duplicateProduct("non-existent-id", "NEW999");
      expect(result).toBeNull();
    });
  });
});
