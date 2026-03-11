import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import { prismaProductRepository } from '@/shared/lib/products/services/product-repository/prisma-product-repository';
import prisma from '@/shared/lib/db/prisma';

const createAdvancedFilterGroup = (
  rules: Array<Record<string, unknown>>
): Record<string, unknown> => ({
  type: 'group',
  id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  combinator: 'and',
  not: false,
  rules,
});

const createAdvancedFilterCondition = (
  field: string,
  operator: string,
  value?: unknown
): Record<string, unknown> => ({
  type: 'condition',
  id: `condition-${Math.random().toString(36).slice(2, 8)}`,
  field,
  operator,
  ...(value !== undefined ? { value } : {}),
});

let canMutatePrismaProductRepositoryTables = true;

describe('prismaProductRepository', () => {
  const shouldSkipPrismaProductRepositoryTests = (): boolean =>
    !process.env['DATABASE_URL'] || !canMutatePrismaProductRepositoryTables;

  beforeEach(async () => {
    if (shouldSkipPrismaProductRepositoryTests()) return;

    try {
      await prisma.productCategoryAssignment.deleteMany({});
      await prisma.productTagAssignment.deleteMany({});
      await prisma.productCatalog.deleteMany({});
      await prisma.productImage.deleteMany({});
      await prisma.imageFile.deleteMany({});
      await prisma.product.deleteMany({});
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EPERM') {
        canMutatePrismaProductRepositoryTables = false;
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create and retrieve a product', async () => {
    if (shouldSkipPrismaProductRepositoryTests()) return;
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
    if (shouldSkipPrismaProductRepositoryTests()) return;
    const data = {
      name_en: 'Product 1',
      sku: 'CONFLICT-SKU',
    };
    await prismaProductRepository.createProduct(data);

    await expect(prismaProductRepository.createProduct(data)).rejects.toThrow(
      'A product with this SKU already exists.'
    );
  });

  it('should update a product', async () => {
    if (shouldSkipPrismaProductRepositoryTests()) return;
    const created = await prismaProductRepository.createProduct({
      name_en: 'Original',
      sku: 'SKU-UPDATE',
    });
    const updated = await prismaProductRepository.updateProduct(created.id, { name_en: 'Updated' });

    expect(updated?.name_en).toBe('Updated');
  });

  it('should allow clearing SKU to null on multiple products', async () => {
    if (shouldSkipPrismaProductRepositoryTests()) return;
    const first = await prismaProductRepository.createProduct({
      name_en: 'First',
      sku: 'SKU-CLEAR-1',
    });
    const second = await prismaProductRepository.createProduct({
      name_en: 'Second',
      sku: 'SKU-CLEAR-2',
    });

    const updatedFirst = await prismaProductRepository.updateProduct(first.id, { sku: null });
    const updatedSecond = await prismaProductRepository.updateProduct(second.id, { sku: null });

    expect(updatedFirst?.sku).toBeNull();
    expect(updatedSecond?.sku).toBeNull();
  });

  it('should delete a product', async () => {
    if (shouldSkipPrismaProductRepositoryTests()) return;
    const created = await prismaProductRepository.createProduct({
      name_en: 'To Delete',
      sku: 'SKU-DELETE',
    });
    await prismaProductRepository.deleteProduct(created.id);

    const found = await prismaProductRepository.getProductById(created.id);
    expect(found).toBeNull();
  });

  it('should find products with filters', async () => {
    if (shouldSkipPrismaProductRepositoryTests()) return;
    await prismaProductRepository.createProduct({ name_en: 'Apple', price: 10, sku: 'SKU-APPLE' });
    await prismaProductRepository.createProduct({
      name_en: 'Banana',
      price: 20,
      sku: 'SKU-BANANA',
    });

    const apple = await prismaProductRepository.getProducts({ search: 'apple' });
    expect(apple.length).toBe(1);
    expect(apple[0]?.name_en).toBe('Apple');

    const expensive = await prismaProductRepository.getProducts({ minPrice: 15 });
    expect(expensive.length).toBe(1);
    expect(expensive[0]?.name_en).toBe('Banana');
  });

  it('should filter products by exact id', async () => {
    if (shouldSkipPrismaProductRepositoryTests()) return;
    const first = await prismaProductRepository.createProduct({
      name_en: 'First ID',
      sku: 'SKU-ID-1',
    });
    await prismaProductRepository.createProduct({ name_en: 'Second ID', sku: 'SKU-ID-2' });

    const byId = await prismaProductRepository.getProducts({ id: first.id });
    expect(byId.length).toBe(1);
    expect(byId[0]?.id).toBe(first.id);
  });

  it('should filter products by partial id when requested', async () => {
    if (shouldSkipPrismaProductRepositoryTests()) return;
    const first = await prismaProductRepository.createProduct({
      name_en: 'First Partial',
      sku: 'SKU-ID-P1',
    });
    await prismaProductRepository.createProduct({ name_en: 'Second Partial', sku: 'SKU-ID-P2' });

    const partialToken = first.id.slice(0, Math.min(6, first.id.length));
    const byPartialId = await prismaProductRepository.getProducts({
      id: partialToken,
      idMatchMode: 'partial',
    });
    expect(byPartialId.some((product) => product.id === first.id)).toBe(true);
  });

  it('should replace product images in submitted order', async () => {
    if (shouldSkipPrismaProductRepositoryTests()) return;
    const created = await prismaProductRepository.createProduct({
      name_en: 'Image Sort',
      sku: 'IMG-SORT',
    });
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
    expect(links.map((entry) => entry.imageFileId)).toEqual([imageB.id, imageA.id]);
  });

  it('syncs scalar catalogId when replacing product catalogs', async () => {
    if (shouldSkipPrismaProductRepositoryTests()) return;
    const suffix = Date.now().toString(36);
    const catalog = await prisma.catalog.create({
      data: { name: `Mentios ${suffix}` },
    });
    const created = await prismaProductRepository.createProduct({
      name_en: 'Catalog Sync',
      sku: `CAT-SYNC-${suffix}`,
    });

    await prismaProductRepository.replaceProductCatalogs(created.id, [catalog.id]);

    const persisted = await prisma.product.findUnique({
      where: { id: created.id },
      select: { catalogId: true },
    });
    expect(persisted?.catalogId).toBe(catalog.id);
  });

  it('supports advanced relation and boolean filter fields', async () => {
    if (shouldSkipPrismaProductRepositoryTests()) return;
    const suffix = Date.now().toString(36);

    const catalogA = await prisma.catalog.create({
      data: { name: `Catalog A ${suffix}` },
    });
    const catalogB = await prisma.catalog.create({
      data: { name: `Catalog B ${suffix}` },
    });

    const tagA = await prisma.productTag.create({
      data: {
        name: `Tag A ${suffix}`,
        catalogId: catalogA.id,
      },
    });
    const tagB = await prisma.productTag.create({
      data: {
        name: `Tag B ${suffix}`,
        catalogId: catalogB.id,
      },
    });

    const producerA = await prisma.producer.create({
      data: { name: `Producer A ${suffix}` },
    });
    const producerB = await prisma.producer.create({
      data: { name: `Producer B ${suffix}` },
    });

    const productA = await prismaProductRepository.createProduct({
      name_en: 'Advanced A',
      sku: `ADV-${suffix}-A`,
      baseProductId: 'base-advanced-a',
    });
    const productB = await prismaProductRepository.createProduct({
      name_en: 'Advanced B',
      sku: `ADV-${suffix}-B`,
      baseProductId: null,
    });

    await prismaProductRepository.replaceProductCatalogs(productA.id, [catalogA.id]);
    await prismaProductRepository.replaceProductCatalogs(productB.id, [catalogB.id]);
    await prismaProductRepository.replaceProductTags(productA.id, [tagA.id]);
    await prismaProductRepository.replaceProductTags(productB.id, [tagB.id]);
    await prismaProductRepository.replaceProductProducers(productA.id, [producerA.id]);
    await prismaProductRepository.replaceProductProducers(productB.id, [producerB.id]);

    const advancedFilterPayload = JSON.stringify(
      createAdvancedFilterGroup([
        createAdvancedFilterCondition('catalogId', 'in', [catalogA.id]),
        createAdvancedFilterCondition('tagId', 'eq', tagA.id),
        createAdvancedFilterCondition('producerId', 'neq', producerB.id),
        createAdvancedFilterCondition('published', 'eq', true),
        createAdvancedFilterCondition('baseProductId', 'contains', 'base-advanced'),
      ])
    );

    const result = await prismaProductRepository.getProducts({
      advancedFilter: advancedFilterPayload,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(productA.id);
  });

  it('supports advanced baseExported conditions', async () => {
    if (shouldSkipPrismaProductRepositoryTests()) return;
    const suffix = Date.now().toString(36);

    const exportedProduct = await prismaProductRepository.createProduct({
      name_en: 'Exported Product',
      sku: `BASE-EXP-${suffix}-A`,
      baseProductId: null,
    });
    const unexportedProduct = await prismaProductRepository.createProduct({
      name_en: 'Unexported Product',
      sku: `BASE-EXP-${suffix}-B`,
      baseProductId: null,
    });

    const baseIntegration = await prisma.integration.upsert({
      where: { slug: 'base-com' },
      update: { name: 'Base.com' },
      create: {
        name: 'Base.com',
        slug: 'base-com',
      },
    });

    const connection = await prisma.integrationConnection.create({
      data: {
        integrationId: baseIntegration.id,
        name: `Base Connection ${suffix}`,
        username: `base-user-${suffix}`,
        password: 'test-password',
      },
    });

    await prisma.productListing.create({
      data: {
        productId: exportedProduct.id,
        integrationId: baseIntegration.id,
        connectionId: connection.id,
        externalListingId: `listing-${suffix}`,
      },
    });

    const exportedFilterPayload = JSON.stringify(
      createAdvancedFilterGroup([createAdvancedFilterCondition('baseExported', 'eq', true)])
    );
    const unexportedFilterPayload = JSON.stringify(
      createAdvancedFilterGroup([createAdvancedFilterCondition('baseExported', 'eq', false)])
    );

    const exported = await prismaProductRepository.getProducts({
      advancedFilter: exportedFilterPayload,
    });
    const unexported = await prismaProductRepository.getProducts({
      advancedFilter: unexportedFilterPayload,
    });

    expect(exported.some((product) => product.id === exportedProduct.id)).toBe(true);
    expect(exported.some((product) => product.id === unexportedProduct.id)).toBe(false);
    expect(unexported.some((product) => product.id === unexportedProduct.id)).toBe(true);
    expect(unexported.some((product) => product.id === exportedProduct.id)).toBe(false);
  });
});
