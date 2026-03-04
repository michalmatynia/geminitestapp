import { Product } from '@prisma/client';
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import { GET as GET_COUNT } from '@/app/api/products/count/route';
import { GET as GET_LIST } from '@/app/api/products/route';
import { createMockProduct } from '@/shared/lib/products/utils/productUtils';
import prisma from '@/shared/lib/db/prisma';

let canMutateProductPaginationTables = true;

describe('Products API - Pagination and Count', () => {
  const shouldSkipProductPaginationTests = (): boolean =>
    !process.env['DATABASE_URL'] || !canMutateProductPaginationTables;

  beforeEach(async () => {
    if (shouldSkipProductPaginationTests()) return;

    try {
      await prisma.productImage.deleteMany({});
      await prisma.imageFile.deleteMany({});
      await prisma.product.deleteMany({});
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EPERM') {
        canMutateProductPaginationTables = false;
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/products/count', () => {
    it('should return the total count of products', async () => {
      if (shouldSkipProductPaginationTests()) return;
      await createMockProduct({ name_en: 'P1', sku: 'SKU1' });
      await createMockProduct({ name_en: 'P2', sku: 'SKU2' });
      await createMockProduct({ name_en: 'P3', sku: 'SKU3' });

      const res = await GET_COUNT(new NextRequest('http://localhost/api/products/count'));
      const data = (await res.json()) as { count: number };

      expect(res.status).toEqual(200);
      expect(data.count).toEqual(3);
    });

    it('should return the filtered count of products', async () => {
      if (shouldSkipProductPaginationTests()) return;
      await createMockProduct({ name_en: 'Laptop', sku: 'SKU1' });
      await createMockProduct({ name_en: 'Mouse', sku: 'SKU2' });

      const res = await GET_COUNT(
        new NextRequest('http://localhost/api/products/count?search=lap')
      );
      const data = (await res.json()) as { count: number };

      expect(res.status).toEqual(200);
      expect(data.count).toEqual(1);
    });
  });

  describe('GET /api/products - Server-side Pagination', () => {
    it('should return a limited number of products based on pageSize', async () => {
      if (shouldSkipProductPaginationTests()) return;
      for (let i = 1; i <= 5; i++) {
        await createMockProduct({ name_en: `Product ${i}`, sku: `SKU${i}` });
      }

      const res = await GET_LIST(new NextRequest('http://localhost/api/products?pageSize=2'));
      const products = (await res.json()) as Product[];

      expect(res.status).toEqual(200);
      expect(products.length).toEqual(2);
    });

    it('should return the correct page of products', async () => {
      if (shouldSkipProductPaginationTests()) return;
      // Products are ordered by createdAt desc in repository.
      for (let i = 1; i <= 5; i++) {
        await createMockProduct({ name_en: `Product ${i}`, sku: `SKU${i}` });
      }

      const res1 = await GET_LIST(
        new NextRequest('http://localhost/api/products?page=1&pageSize=2')
      );
      const page1 = (await res1.json()) as Product[];

      const res2 = await GET_LIST(
        new NextRequest('http://localhost/api/products?page=2&pageSize=2')
      );
      const page2 = (await res2.json()) as Product[];

      expect(page1.length).toEqual(2);
      expect(page2.length).toEqual(2);
      expect(page1[0]!.id).not.toEqual(page2[0]!.id);
      expect(page1[1]!.id).not.toEqual(page2[1]!.id);
    });
  });
});
