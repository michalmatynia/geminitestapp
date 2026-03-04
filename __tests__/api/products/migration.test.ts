import { NextRequest } from 'next/server';
import { vi, beforeEach } from 'vitest';
import { describe, it, expect } from 'vitest';

import { GET } from '@/app/api/v2/products/migrate/route';

// Mock products server
vi.mock('@/features/products/server', () => ({
  getProductMigrationTotal: vi.fn().mockResolvedValue(100),
  migrateProductBatch: vi.fn().mockResolvedValue({ migrated: 10, nextCursor: 'next' }),
  parseJsonBody: async (req: NextRequest) => {
    try {
      const body = await req.json();
      return { ok: true, data: body };
    } catch {
      return { ok: false, response: new Response('Invalid JSON', { status: 400 }) };
    }
  },
}));

describe('Product Migration API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/products/migrate', () => {
    it('should return total products to migrate', async () => {
      const res = await GET(
        new NextRequest('http://localhost/api/products/migrate?direction=prisma-to-mongo')
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.total).toEqual(100);
    });
  });
});
