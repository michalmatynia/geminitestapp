import fs from 'fs/promises';

import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import { productService } from '@/shared/lib/products/services/productService';
import { createMockProduct } from '@/shared/lib/products/utils/productUtils';
import prisma from '@/shared/lib/db/prisma';

vi.mock('fs/promises', () => ({
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

describe('productService', () => {
  beforeEach(async () => {
    if (!process.env['DATABASE_URL']) return;

    // Clear the database before each test
    await prisma.productCategoryAssignment.deleteMany({});
    await prisma.productTagAssignment.deleteMany({});
    await prisma.productProducerAssignment.deleteMany({});
    await prisma.productCatalog.deleteMany({});
    await prisma.productImage.deleteMany({});
    await prisma.imageFile.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.catalog.deleteMany({});

    vi.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getProductById', () => {
    it('should return a product by ID', async () => {
      if (!process.env['DATABASE_URL']) return;

      const product = await createMockProduct({ name_en: 'Test Product', sku: 'TEST-1' });
      const found = await productService.getProductById(product.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(product.id);
      expect(found?.name_en).toBe('Test Product');
    });

    it('should return null if product not found', async () => {
      if (!process.env['DATABASE_URL']) return;

      const found = await productService.getProductById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('getProducts', () => {
    it('should return all products when no filters are provided', async () => {
      if (!process.env['DATABASE_URL']) return;

      await createMockProduct({ name_en: 'Product 1', sku: 'P1' });
      await createMockProduct({ name_en: 'Product 2', sku: 'P2' });

      const products = await productService.getProducts({});
      expect(products.length).toBe(2);
    });

    it('should filter products by search term', async () => {
      if (!process.env['DATABASE_URL']) return;

      await createMockProduct({ name_en: 'Apple', sku: 'A1' });
      await createMockProduct({ name_en: 'Banana', sku: 'B1' });

      const products = await productService.getProducts({ search: 'Apple' });
      expect(products.length).toBe(1);
      expect(products[0]!.name_en).toBe('Apple');
    });
  });

  describe('createProduct', () => {
    it('should successfully create a product from FormData', async () => {
      if (!process.env['DATABASE_URL']) return;

      const formData = new FormData();
      formData.append('name_en', 'New Product');
      formData.append('sku', 'NEW-SKU-123');
      formData.append('price', '500');

      const product = await productService.createProduct(formData);

      expect(product).toBeDefined();
      expect(product?.name_en).toBe('New Product');
      expect(product?.sku).toBe('NEW-SKU-123');
      expect(product?.price).toBe(500);

      const dbProduct = await prisma.product.findUnique({ where: { id: product.id } });
      expect(dbProduct).toBeDefined();
      expect(dbProduct?.name_en).toBe('New Product');
    });

    it('should link catalogs if provided', async () => {
      if (!process.env['DATABASE_URL']) return;

      const catalog = await prisma.catalog.create({
        data: { name: 'Test Catalog' },
      });

      const formData = new FormData();
      formData.append('name_en', 'Catalog Product');
      formData.append('sku', 'CAT-123');
      formData.append('catalogIds', catalog.id);

      const product = await productService.createProduct(formData);

      const productInCatalog = await prisma.productCatalog.findFirst({
        where: { productId: product.id, catalogId: catalog.id },
      });
      expect(productInCatalog).toBeDefined();
    });

    it('should persist uploaded image and multiple catalogs on create', async () => {
      if (!process.env['DATABASE_URL']) return;

      const catalogA = await prisma.catalog.create({ data: { name: 'Create Catalog A' } });
      const catalogB = await prisma.catalog.create({ data: { name: 'Create Catalog B' } });

      const formData = new FormData();
      formData.append('name_en', 'Create Guard Product');
      formData.append('sku', 'CRT-GUARD-1');
      formData.append('catalogIds', catalogA.id);
      formData.append('catalogIds', catalogB.id);
      const file = new File([new Uint8Array([9, 8, 7, 6])], 'create-upload.jpg', {
        type: 'image/jpeg',
      });
      if (typeof (file as File & { arrayBuffer?: unknown }).arrayBuffer !== 'function') {
        Object.defineProperty(file, 'arrayBuffer', {
          value: async (): Promise<ArrayBuffer> => new Uint8Array([9, 8, 7, 6]).buffer,
        });
      }
      formData.append('images', file);

      const created = await productService.createProduct(formData);

      expect(created.catalogs.map((entry) => entry.catalogId).sort()).toEqual(
        [catalogA.id, catalogB.id].sort()
      );
      expect(created.images.length).toBe(1);

      const dbCatalogs = await prisma.productCatalog.findMany({
        where: { productId: created.id },
        select: { catalogId: true },
      });
      expect(dbCatalogs.map((entry) => entry.catalogId).sort()).toEqual(
        [catalogA.id, catalogB.id].sort()
      );

      const dbImages = await prisma.productImage.findMany({
        where: { productId: created.id },
      });
      expect(dbImages.length).toBe(1);
    });
  });

  describe('updateProduct', () => {
    it('should update product fields', async () => {
      if (!process.env['DATABASE_URL']) return;

      const original = await createMockProduct({ name_en: 'Old Name', sku: 'OLD-SKU' });

      const formData = new FormData();
      formData.append('name_en', 'Updated Name');

      const updated = await productService.updateProduct(original.id, formData);

      expect(updated?.name_en).toBe('Updated Name');
      expect(updated?.sku).toBe('OLD-SKU');
    });

    it('should update SKU', async () => {
      if (!process.env['DATABASE_URL']) return;

      const original = await createMockProduct({ name_en: 'Product', sku: 'OLD-SKU' });

      const formData = new FormData();
      formData.append('sku', 'NEW-SKU');

      const updated = await productService.updateProduct(original.id, formData);

      expect(updated?.sku).toBe('NEW-SKU');
    });

    it('should persist multiple catalogIds on update', async () => {
      if (!process.env['DATABASE_URL']) return;

      const original = await createMockProduct({ name_en: 'Catalog Update', sku: 'CAT-UPD-1' });
      const catalogA = await prisma.catalog.create({ data: { name: 'Catalog A' } });
      const catalogB = await prisma.catalog.create({ data: { name: 'Catalog B' } });

      const formData = new FormData();
      formData.append('catalogIds', catalogA.id);
      formData.append('catalogIds', catalogB.id);

      await productService.updateProduct(original.id, formData);

      const links = await prisma.productCatalog.findMany({
        where: { productId: original.id },
        select: { catalogId: true },
      });
      expect(links.map((link: { catalogId: string }) => link.catalogId).sort()).toEqual(
        [catalogA.id, catalogB.id].sort()
      );
    });

    it('should persist uploaded image files on update', async () => {
      if (!process.env['DATABASE_URL']) return;

      const original = await createMockProduct({ name_en: 'Image Upload', sku: 'IMG-UPD-1' });
      const file = new File([new Uint8Array([1, 2, 3, 4])], 'upload.jpg', {
        type: 'image/jpeg',
      });
      if (typeof (file as File & { arrayBuffer?: unknown }).arrayBuffer !== 'function') {
        Object.defineProperty(file, 'arrayBuffer', {
          value: async (): Promise<ArrayBuffer> => new Uint8Array([1, 2, 3, 4]).buffer,
        });
      }

      const formData = new FormData();
      formData.append('images', file);

      const updated = await productService.updateProduct(original.id, formData);

      expect(updated.images.length).toBe(1);
      expect(updated.images[0]?.imageFileId).toBeTruthy();

      const links = await prisma.productImage.findMany({
        where: { productId: original.id },
      });
      expect(links.length).toBe(1);
    });

    it('should persist reordered imageFileIds on update', async () => {
      if (!process.env['DATABASE_URL']) return;

      const original = await createMockProduct({ name_en: 'With Images', sku: 'IMG-ORDER' });
      const imageA = await prisma.imageFile.create({
        data: {
          filename: 'a.jpg',
          filepath: '/uploads/products/a.jpg',
          mimetype: 'image/jpeg',
          size: 100,
        },
      });
      const imageB = await prisma.imageFile.create({
        data: {
          filename: 'b.jpg',
          filepath: '/uploads/products/b.jpg',
          mimetype: 'image/jpeg',
          size: 100,
        },
      });

      const firstUpdate = new FormData();
      firstUpdate.append('imageFileIds', imageA.id);
      firstUpdate.append('imageFileIds', imageB.id);
      await productService.updateProduct(original.id, firstUpdate);

      const reorderUpdate = new FormData();
      reorderUpdate.append('imageFileIds', imageB.id);
      reorderUpdate.append('imageFileIds', imageA.id);
      await productService.updateProduct(original.id, reorderUpdate);

      // The current implementation of updateProduct for images unlinks all and re-links in order.
      // So checking the order of IDs returned by findMany (default order) might depend on implementation.
      const productWithImages = await productService.getProductById(original.id);
      expect(productWithImages?.images.map((img) => img.imageFile.id)).toEqual([
        imageB.id,
        imageA.id,
      ]);
    });
  });

  describe('unlinkImageFromProduct', () => {
    it('should unlink an image and NOT delete file if other products use it', async () => {
      if (!process.env['DATABASE_URL']) return;

      const imageFile = await prisma.imageFile.create({
        data: {
          filename: 'shared.jpg',
          filepath: '/uploads/products/shared.jpg',
          mimetype: 'image/jpeg',
          size: 100,
        },
      });

      const p1 = await createMockProduct({ sku: 'P1' });
      const p2 = await createMockProduct({ sku: 'P2' });

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

    it('should unlink an image and delete file if it was the last link', async () => {
      if (!process.env['DATABASE_URL']) return;

      const imageFile = await prisma.imageFile.create({
        data: {
          filename: 'last.jpg',
          filepath: '/uploads/products/last.jpg',
          mimetype: 'image/jpeg',
          size: 100,
        },
      });

      const p1 = await createMockProduct({ sku: 'P1' });
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

  describe('duplicateProduct', () => {
    it('should successfully duplicate a product with a new SKU', async () => {
      if (!process.env['DATABASE_URL']) return;

      const original = await createMockProduct({
        name_en: 'Original Product',
        price: '100',
        sku: 'ORIG123',
      });

      const duplicated = await productService.duplicateProduct(original.id, 'NEW123');

      expect(duplicated).toBeDefined();
      expect(duplicated?.id).not.toBe(original.id);
      expect(duplicated?.sku).toBe('NEW123');
      expect(duplicated?.name_en).toBe('Original Product');
      expect(duplicated?.price).toBe(100);
    });

    it('should throw error if SKU is missing', async () => {
      if (!process.env['DATABASE_URL']) return;

      const original = await createMockProduct({ sku: 'ORIG456' });
      await expect(productService.duplicateProduct(original.id, '')).rejects.toThrow(
        'SKU is required'
      );
    });

    it('should return null if original product does not exist', async () => {
      if (!process.env['DATABASE_URL']) return;

      const result = await productService.duplicateProduct('non-existent-id', 'NEW999');
      expect(result).toBeNull();
    });
  });
});
