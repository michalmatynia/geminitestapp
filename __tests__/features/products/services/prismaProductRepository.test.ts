import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import { prismaProductRepository } from '@/features/products/services/product-repository/prisma-product-repository';
import prisma from '@/shared/lib/db/prisma';

describe('prismaProductRepository', () => {
  beforeEach(async () => {
    await prisma.productCategoryAssignment.deleteMany({});
    await prisma.productTagAssignment.deleteMany({});
    await prisma.productCatalog.deleteMany({});
    await prisma.productImage.deleteMany({});
    await prisma.imageFile.deleteMany({});
    await prisma.product.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create and retrieve a product', async () => {
    const data = {
      name_en: 'Test Repository Product',
      sku: 'REPO-SKU-1',
      price: 1000,
    };

    const created = await prismaProductRepository.createProduct(data);
    expect(created).toBeDefined();
    expect(created.sku).toBe('REPO-SKU-1');

    const found = await prismaProductRepository.getProductById(created.id);
    expect(found).toBeDefined();
    expect(found?.name_en).toBe('Test Repository Product');
  });

  it('should handle SKU conflicts', async () => {
    const data = {
      name_en: 'Product 1',
      sku: 'CONFLICT-SKU',
    };
    await prismaProductRepository.createProduct(data);

    await expect(prismaProductRepository.createProduct(data)).rejects.toThrow('A product with this SKU already exists.');
  });

  it('should update a product', async () => {
    const created = await prismaProductRepository.createProduct({ name_en: 'Original', sku: 'SKU-UPDATE' });
    const updated = await prismaProductRepository.updateProduct(created.id, { name_en: 'Updated' });
    
    expect(updated?.name_en).toBe('Updated');
  });

  it('should allow clearing SKU to null on multiple products', async () => {
    const first = await prismaProductRepository.createProduct({ name_en: 'First', sku: 'SKU-CLEAR-1' });
    const second = await prismaProductRepository.createProduct({ name_en: 'Second', sku: 'SKU-CLEAR-2' });

    const updatedFirst = await prismaProductRepository.updateProduct(first.id, { sku: null });
    const updatedSecond = await prismaProductRepository.updateProduct(second.id, { sku: null });

    expect(updatedFirst?.sku).toBeNull();
    expect(updatedSecond?.sku).toBeNull();
  });

  it('should delete a product', async () => {
    const created = await prismaProductRepository.createProduct({ name_en: 'To Delete', sku: 'SKU-DELETE' });
    await prismaProductRepository.deleteProduct(created.id);
    
    const found = await prismaProductRepository.getProductById(created.id);
    expect(found).toBeNull();
  });

  it('should find products with filters', async () => {
    await prismaProductRepository.createProduct({ name_en: 'Apple', price: 10, sku: 'SKU-APPLE' });
    await prismaProductRepository.createProduct({ name_en: 'Banana', price: 20, sku: 'SKU-BANANA' });
    
    const apple = await prismaProductRepository.getProducts({ search: 'apple' });
    expect(apple.length).toBe(1);
    expect(apple[0]?.name_en).toBe('Apple');

    const expensive = await prismaProductRepository.getProducts({ minPrice: 15 });
    expect(expensive.length).toBe(1);
    expect(expensive[0]?.name_en).toBe('Banana');
  });

  it('should filter products by exact id', async () => {
    const first = await prismaProductRepository.createProduct({ name_en: 'First ID', sku: 'SKU-ID-1' });
    await prismaProductRepository.createProduct({ name_en: 'Second ID', sku: 'SKU-ID-2' });

    const byId = await prismaProductRepository.getProducts({ id: first.id });
    expect(byId.length).toBe(1);
    expect(byId[0]?.id).toBe(first.id);
  });

  it('should filter products by partial id when requested', async () => {
    const first = await prismaProductRepository.createProduct({ name_en: 'First Partial', sku: 'SKU-ID-P1' });
    await prismaProductRepository.createProduct({ name_en: 'Second Partial', sku: 'SKU-ID-P2' });

    const partialToken = first.id.slice(0, Math.min(6, first.id.length));
    const byPartialId = await prismaProductRepository.getProducts({
      id: partialToken,
      idMatchMode: 'partial',
    });
    expect(byPartialId.some((product) => product.id === first.id)).toBe(true);
  });

  it('should replace product images in submitted order', async () => {
    const created = await prismaProductRepository.createProduct({ name_en: 'Image Sort', sku: 'IMG-SORT' });
    const imageA = await prisma.imageFile.create({
      data: {
        filename: 'img-a.jpg',
        filepath: '/uploads/products/img-a.jpg',
        mimetype: 'image/jpeg',
        size: 100,
      },
    });
    const imageB = await prisma.imageFile.create({
      data: {
        filename: 'img-b.jpg',
        filepath: '/uploads/products/img-b.jpg',
        mimetype: 'image/jpeg',
        size: 100,
      },
    });

    await prismaProductRepository.replaceProductImages(created.id, [imageB.id, imageA.id]);

    const links = await prisma.productImage.findMany({
      where: { productId: created.id },
      orderBy: { assignedAt: 'asc' },
    });
    expect(links.map((entry) => entry.imageFileId)).toEqual([
      imageB.id,
      imageA.id,
    ]);
  });
});
