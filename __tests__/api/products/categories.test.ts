import { NextRequest } from 'next/server';
import { vi, beforeEach, afterAll } from 'vitest';
import { describe, it, expect } from 'vitest';

import { GET as GET_TREE } from '@/app/api/products/categories/tree/route';
import prisma from '@/shared/lib/db/prisma';

describe('Product Categories API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/products/categories/tree', () => {
    it('should return categories as a tree', async () => {
      const now = new Date();
      // Provide a flat list - the repository builds the tree.
      const mockCategories = [
        { 
          id: '1', name: 'Parent', catalogId: 'cat1', parentId: null, createdAt: now, updatedAt: now, sortIndex: 0
        },
        { 
          id: '2', name: 'Child', catalogId: 'cat1', parentId: '1', createdAt: now, updatedAt: now, sortIndex: 0
        },
      ];
      vi.mocked(prisma.productCategory.findMany).mockResolvedValue(mockCategories as any);

      const res = await GET_TREE(
        new NextRequest('http://localhost/api/products/categories/tree?catalogId=cat1')
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('1');
      expect(data[0].children).toHaveLength(1);
      expect(data[0].children[0].id).toBe('2');
    });
  });
});