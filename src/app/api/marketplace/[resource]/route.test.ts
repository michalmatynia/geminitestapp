import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getHandler as getCategoriesHandler } from '../categories/handler';

vi.mock('../categories/handler', () => ({
  getHandler: vi.fn(),
}));
vi.mock('../producers/handler', () => ({
  getHandler: vi.fn(),
}));
vi.mock('../tags/handler', () => ({
  getHandler: vi.fn(),
}));

describe('marketplace/[resource] GET', () => {
  const mockContext = { source: 'test' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to categories handler', async () => {
    vi.mocked(getCategoriesHandler).mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    const req = new NextRequest('http://localhost/api/marketplace/categories');
    await GET(req, { params: Promise.resolve({ resource: 'categories' }) });

    expect(getCategoriesHandler).toHaveBeenCalled();
  });

  it('returns 404 for unknown resource', async () => {
    const req = new NextRequest('http://localhost/api/marketplace/invalid');
    const response = await GET(req, { params: Promise.resolve({ resource: 'invalid' }) });
    expect(response.status).toBe(404);
  });
});
