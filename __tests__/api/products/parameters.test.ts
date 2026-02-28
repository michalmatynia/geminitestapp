import { ProductParameter } from '@prisma/client';
import { NextRequest } from 'next/server';
import { vi, beforeEach, afterAll } from 'vitest';
import { describe, it, expect } from 'vitest';
import type { ZodSchema } from 'zod';

import { GET } from '@/app/api/products/parameters/route';
import prisma from '@/shared/lib/db/prisma';

// Mock Prisma client
vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    productParameter: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

// Mock data provider
vi.mock('@/features/products/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/products/server')>();
  return {
    ...actual,
    getProductDataProvider: vi.fn().mockResolvedValue('prisma'),
    parseJsonBody: async (req: NextRequest, schema: ZodSchema) => {
      try {
        const body = await req.json();
        const result = schema.safeParse(body);
        if (!result.success) {
          return {
            ok: false,
            response: new Response(JSON.stringify(result.error), { status: 400 }),
          };
        }
        return { ok: true, data: result.data };
      } catch {
        return { ok: false, response: new Response('Invalid JSON', { status: 400 }) };
      }
    },
  };
});

describe('Product Parameters API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['DATABASE_URL'] = 'postgresql://mock';
  });

  afterAll(() => {
    vi.restoreAllMocks();
    delete process.env['DATABASE_URL'];
  });

  describe('GET /api/products/parameters', () => {
    it('should return parameters for a given catalogId', async () => {
      const now = new Date();
      const mockParams: ProductParameter[] = [
        { id: '1', name_en: 'Param 1', catalogId: 'cat1', createdAt: now, updatedAt: now } as any,
      ];
      vi.mocked(prisma.productParameter.findMany).mockResolvedValue(mockParams);

      const res = await GET(
        new NextRequest('http://localhost/api/products/parameters?catalogId=cat1')
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data).toHaveLength(1);
    });
  });
});
