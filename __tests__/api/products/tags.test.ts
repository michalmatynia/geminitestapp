import { ProductTag } from '@prisma/client';
import { NextRequest } from 'next/server';
import { vi, beforeEach, afterAll } from 'vitest';
import { describe, it, expect } from 'vitest';
import type { ZodSchema } from 'zod';

import { GET, POST } from '@/app/api/products/tags/route';
import prisma from '@/shared/lib/db/prisma';

// Mock Prisma client
vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    productTag: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    systemLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    activityLog: {
      create: vi.fn().mockResolvedValue({}),
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

describe('Product Tags API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['DATABASE_URL'] = 'postgresql://mock';
  });

  afterAll(() => {
    vi.restoreAllMocks();
    delete process.env['DATABASE_URL'];
  });

  describe('GET /api/products/tags', () => {
    it('should return tags for a given catalogId', async () => {
      const now = new Date();
      const mockTags: ProductTag[] = [
        {
          id: '1',
          name: 'Tag 1',
          color: '#ff0000',
          catalogId: 'cat1',
          createdAt: now,
          updatedAt: now,
        },
      ];
      vi.mocked(prisma.productTag.findMany).mockResolvedValue(mockTags);

      const res = await GET(new NextRequest('http://localhost/api/products/tags?catalogId=cat1'));
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data).toHaveLength(1);
    });
  });

  describe('POST /api/products/tags', () => {
    it('should create a new tag', async () => {
      const now = new Date();
      const newTag = { name: 'New Tag', color: '#0000ff', catalogId: 'cat1' };
      vi.mocked(prisma.productTag.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.productTag.create).mockResolvedValue({
        id: '3',
        ...newTag,
        createdAt: now,
        updatedAt: now,
      } as ProductTag);

      const res = await POST(
        new NextRequest('http://localhost/api/products/tags', {
          method: 'POST',
          body: JSON.stringify(newTag),
        })
      );
      expect(res.status).toEqual(201);
    });
  });
});
