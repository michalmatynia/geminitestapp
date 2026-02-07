import { Product } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { vi, beforeEach, afterAll, describe, it, expect } from 'vitest';

// Mock the api-handler module
vi.mock('@/shared/lib/api/api-handler', () => ({
  apiHandler: (handler: any) => async (req: any) => {
    try {
      return await handler(req, { requestId: 'test', getElapsedMs: () => 0 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus || 500 });
    }
  },
  apiHandlerWithParams: (handler: any) => async (req: any, ctx: any) => {
    try {
      const context = {
        ...ctx,
        requestId: 'test',
        getElapsedMs: () => 0,
      };
      const resolvedParams =
        ctx?.params && typeof ctx.params.then === 'function'
          ? await ctx.params
          : (ctx?.params ?? {});
      return await handler(req, context, resolvedParams);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus || 500 });
    }
  },
}));

// Mock Prisma client
vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    productImage: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    imageFile: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    productCatalog: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    productCategoryAssignment: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    productTagAssignment: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    productProducerAssignment: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    catalog: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    systemLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    $disconnect: vi.fn(),
  },
}));

import { POST as POST_DUPLICATE } from '@/app/api/products/[id]/duplicate/route';
import { PUT, DELETE } from '@/app/api/products/[id]/route';
import { GET as GET_LIST, POST } from '@/app/api/products/route';
import { GET as GET_PUBLIC } from '@/app/api/public/products/[id]/route';
import prisma from '@/shared/lib/db/prisma';

// Helper to create mock product data
const createMockProductData = (overrides: Record<string, unknown> = {}) => ({
  id: `test-product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  sku: overrides.sku || `SKU-${Date.now()}`,
  name_en: overrides.name_en || 'Test Product (EN)',
  name_pl: overrides.name_pl || 'Test Product (PL)',
  name_de: overrides.name_de || 'Test Product (DE)',
  description_en: overrides.description_en || 'Description (EN)',
  description_pl: overrides.description_pl || 'Description (PL)',
  description_de: overrides.description_de || 'Description (DE)',
  price:
    typeof overrides.price === 'number'
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
  categories: [],
  tags: [],
  producers: [],
  ...overrides,
});

describe('Products API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
    
    // Using any-casts to satisfy Prisma client return types which are complex
    (prisma.product.create as any).mockImplementation((args: any) => {
      const data = args.data;
      return {
        id: `created-${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
        catalogs: [],
        categories: [],
        tags: [],
      };
    });

    (prisma.product.update as any).mockImplementation((args: any) => {
      return {
        ...args.data,
        id: args.where.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
        catalogs: [],
        categories: [],
        tags: [],
      };
    });

    vi.mocked(prisma.product.delete).mockResolvedValue({} as any);
    vi.mocked(prisma.product.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.product.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.product.count).mockResolvedValue(0);
    vi.mocked(prisma.productImage.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.productImage.create).mockResolvedValue({} as any);
    vi.mocked(prisma.productImage.findMany).mockResolvedValue([]);
    vi.mocked(prisma.productImage.createMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.imageFile.deleteMany).mockResolvedValue({ count: 0 });
    (prisma.imageFile.create as any).mockImplementation((args: any) => ({
      id: `image-${Date.now()}`,
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    vi.mocked(prisma.imageFile.findMany).mockResolvedValue([]);
    vi.mocked(prisma.productCatalog.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.productCatalog.createMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.productCategoryAssignment.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.productCategoryAssignment.createMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.productTagAssignment.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.productTagAssignment.createMany).mockResolvedValue({ count: 0 });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/products', () => {
    it('should return all products when no filters are applied', async () => {
      const mockProducts = [
        createMockProductData({ name_en: 'Product 1' }),
        createMockProductData({ name_en: 'Product 2' }),
      ];
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);

      const res = await GET_LIST(
        new NextRequest('http://localhost/api/products'),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(2);
    });

    it('should return an empty array if no products exist', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);

      const res = await GET_LIST(
        new NextRequest('http://localhost/api/products'),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products).toEqual([]);
    });

    it('should filter products by name_en using the search parameter', async () => {
      const mockProducts = [createMockProductData({ name_en: 'Laptop' })];
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);

      const res = await GET_LIST(
        new NextRequest('http://localhost/api/products?search=lap'),
      );
      const products = (await res.json()) as Product[];
      expect(res.status).toEqual(200);
      expect(products.length).toEqual(1);
      expect(products[0]!.name_en).toEqual('Laptop');
    });
  });

  describe('POST /api/products', () => {
    it('should reject invalid product data (invalid price)', async () => {
      const formData = new FormData();
      formData.append('price', 'not-a-number');
      formData.append('sku', 'SKU123');
      const req = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toEqual(400);
    });

    it('should successfully create a product with localized name and description fields', async () => {
      const formData = new FormData();
      formData.append('name_en', 'New Product (EN)');
      formData.append('name_pl', 'Nowy Produkt (PL)');
      formData.append('name_de', 'Neues Produkt (DE)');
      formData.append('description_en', 'Description in English');
      formData.append('description_pl', 'Opis po polsku');
      formData.append('description_de', 'Beschreibung auf Deutsch');
      formData.append('price', '200');
      formData.append('sku', 'NEW-SKU-001');
      formData.append('stock', '50');
      formData.append('weight', '1000');
      formData.append('length', '30');

      const req = {
        headers: new Headers({ 'Content-Type': 'multipart/form-data' }),
        formData: () => Promise.resolve(formData),
        url: 'http://localhost/api/products',
        method: 'POST',
      } as unknown as NextRequest;

      const mockCreatedProduct = createMockProductData({
        name_en: 'New Product (EN)',
        name_pl: 'Nowy Produkt (PL)',
        name_de: 'Neues Produkt (DE)',
        description_en: 'Description in English',
        description_pl: 'Opis po polsku',
        description_de: 'Beschreibung auf Deutsch',
        price: 200,
        sku: 'NEW-SKU-001',
        stock: 50,
        weight: 1000,
        length: 30,
      });
      (prisma.product.create as any).mockResolvedValue(
        mockCreatedProduct
      );
      vi.mocked(prisma.product.findUnique)
        .mockResolvedValueOnce(null) // SKU check
        .mockResolvedValue(mockCreatedProduct as any); // getProductById

      const res = await POST(req);
      const product = (await res.json()) as Product;

      expect(res.status).toEqual(200);
      expect(product.name_en).toEqual('New Product (EN)');
    });
  });

  describe('PUT /api/products/[id]', () => {
    it('should return 404 when updating a non-existent product', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const formData = new FormData();
      formData.append('name_en', 'Updated Product');
      formData.append('price', '150');
      formData.append('sku', 'SKU123');

      const req = {
        headers: new Headers(),
        formData: () => Promise.resolve(formData),
        url: 'http://localhost/api/products/non-existent-id',
        method: 'PUT',
      } as unknown as NextRequest;

      const res = await PUT(req, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      expect(res.status).toEqual(404);
    });
  });

  describe('DELETE /api/products/[id]', () => {
    it('should return 404 when deleting a non-existent product', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const req = new NextRequest(
        'http://localhost/api/products/non-existent-id',
        {
          method: 'DELETE',
        },
      );
      const res = await DELETE(req, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      expect(res.status).toEqual(404);
    });
  });

  describe('GET /api/public/products/[id]', () => {
    it('should return a single product', async () => {
      const productId = 'public-product-123';
      const mockProduct = createMockProductData({
        id: productId,
        name_en: 'Product 1 (EN)',
      });
      vi.mocked(prisma.product.findUnique).mockResolvedValue(
        mockProduct as any,
      );

      const req = new NextRequest(`http://localhost/api/products/${productId}`);
      const res = await GET_PUBLIC(req, {
        params: Promise.resolve({ id: productId }),
      });
      const fetchedProduct = (await res.json()) as Product;
      expect(res.status).toEqual(200);
      expect(fetchedProduct.name_en).toEqual('Product 1 (EN)');
    });
  });

  describe('POST /api/products/[id]/duplicate', () => {
    it('should return 404 when product does not exist', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const req = new NextRequest(
        'http://localhost/api/products/non-existent-id/duplicate',
        {
          method: 'POST',
          body: JSON.stringify({ sku: 'NEW123' }),
        },
      );
      const res = await POST_DUPLICATE(req, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      expect(res.status).toEqual(404);
    });
  });
});