import { NextRequest } from 'next/server';
import { vi, beforeEach, afterAll, describe, it, expect } from 'vitest';

// Stub the missing documentation/types module and its dependents so the
// broken import chain in src/features/documentation/catalogs/ai-paths.ts
// doesn't prevent the test suite from loading (pre-existing project issue).
vi.mock('@/shared/contracts/documentation', () => ({ DOCUMENTATION_MODULE_IDS: {} }));
vi.mock('@/shared/lib/documentation', () => ({
  DOCUMENTATION_MODULE_IDS: {},
  AI_PATHS_TOOLTIP_CATALOG: [],
}));

// Mock Prisma client
vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

import { GET } from '@/app/api/products/paged/route';
import prisma from '@/shared/lib/db/prisma';

const createMockProduct = (overrides: Record<string, unknown> = {}) => ({
  id: `product-${Math.random().toString(36).slice(2)}`,
  sku: 'SKU-001',
  name_en: 'Test Product',
  name_pl: 'Produkt Testowy',
  name_de: 'Testprodukt',
  description_en: null,
  description_pl: null,
  description_de: null,
  price: 99,
  stock: 5,
  weight: null,
  length: null,
  categoryId: null,
  baseProductId: null,
  defaultPriceGroupId: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  images: [],
  catalogs: [],
  categories: [],
  tags: [],
  producers: [],
  ...overrides,
});

describe('GET /api/products/paged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('returns { products, total } shape', async () => {
    const mock = createMockProduct();
    vi.mocked(prisma.product.findMany).mockResolvedValue([mock] as any);
    vi.mocked(prisma.product.count).mockResolvedValue(1);

    const res = await GET(new NextRequest('http://localhost/api/products/paged'));
    expect(res.status).toBe(200);

    const data = (await res.json()) as { products: unknown[]; total: number };
    expect(data).toHaveProperty('products');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.products)).toBe(true);
    expect(data.total).toBe(1);
    expect(data.products).toHaveLength(1);
  });

  it('returns empty products and zero total when no products exist', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    const res = await GET(new NextRequest('http://localhost/api/products/paged'));
    expect(res.status).toBe(200);

    const data = (await res.json()) as { products: unknown[]; total: number };
    expect(data.products).toHaveLength(0);
    expect(data.total).toBe(0);
  });

  it('passes page and pageSize filters to the repository', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(42);

    const res = await GET(
      new NextRequest('http://localhost/api/products/paged?page=3&pageSize=10')
    );
    expect(res.status).toBe(200);

    // The count reflects the total across all pages
    const data = (await res.json()) as { products: unknown[]; total: number };
    expect(data.total).toBe(42);

    // findMany should receive the pagination arguments
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
  });

  it('filters by catalogId when provided', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await GET(new NextRequest('http://localhost/api/products/paged?catalogId=cat-123'));

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          catalogs: expect.objectContaining({
            some: expect.objectContaining({ catalogId: 'cat-123' }),
          }),
        }),
      })
    );
  });

  it('fires findMany and count in parallel (both called once per request)', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(7);

    await GET(new NextRequest('http://localhost/api/products/paged'));

    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.product.count).toHaveBeenCalledTimes(1);
  });
});
