import { NextRequest } from 'next/server';
import { vi, beforeEach, afterAll } from 'vitest';
import { describe, it, expect } from 'vitest';

import { GET as GET_TREE } from '@/app/api/products/categories/tree/route';
import prisma from '@/shared/lib/db/prisma';

// Mock the api-handler module
vi.mock('@/shared/lib/api/api-handler', () => ({
  apiHandler: (handler: any) => handler,
  apiHandlerWithParams: (handler: any) => (req: any, ctx: any) => {
    const params = ctx?.params instanceof Promise ? ctx.params : Promise.resolve(ctx?.params ?? {});
    return params.then((resolvedParams: any) => handler(req, ctx, resolvedParams));
  },
}));

// Mock Prisma client
vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    productCategory: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

// Mock data provider
vi.mock('@/features/products/server', () => ({
  getProductDataProvider: vi.fn().mockResolvedValue('prisma'),
  parseJsonBody: async (req: any, schema: any) => {
    try {
      const body = await req.json();
      const result = schema.safeParse(body);
      if (!result.success) {
        return { ok: false, response: new Response(JSON.stringify(result.error), { status: 400 }) };
      }
      return { ok: true, data: result.data };
    } catch {
      return { ok: false, response: new Response('Invalid JSON', { status: 400 }) };
    }
  },
}));

describe('Product Categories API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://mock';
  });

  afterAll(() => {
    vi.restoreAllMocks();
    delete process.env.DATABASE_URL;
  });

  describe('GET /api/products/categories/tree', () => {
    it('should return categories as a tree', async () => {
      const mockCategories = [
        { id: '1', name: 'Parent', catalogId: 'cat1', parentId: null },
        { id: '2', name: 'Child', catalogId: 'cat1', parentId: '1' },
      ];
      vi.mocked(prisma.productCategory.findMany).mockResolvedValue(mockCategories as any);

      const res = await GET_TREE(
        new NextRequest('http://localhost/api/products/categories/tree?catalogId=cat1')
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data).toHaveLength(1);
      expect(data[0].children).toHaveLength(1);
    });
  });
});
