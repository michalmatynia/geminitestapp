import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { registryBackend } from '@/features/ai/ai-context-registry/server';

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  registryBackend: {
    listAll: vi.fn(),
  },
}));

describe('ai/schema/[entity] GET', () => {
  const mockContext = { source: 'test' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns schema for a matching entity', async () => {
    const mockNodes = [
      { id: 'ns:product', name: 'Product', jsonSchema2020: { type: 'object' } },
      { id: 'ns:other', name: 'Other', jsonSchema2020: null },
    ];
    vi.mocked(registryBackend.listAll).mockReturnValue(mockNodes as any);

    const req = new NextRequest('http://localhost/api/ai/schema/product');
    // apiHandlerWithParams wraps the handler, we call GET which is the wrapped version
    // But testing the wrapped version is harder because of auth/etc.
    // However, in Vitest, we usually mock auth.
    
    const response = await GET(req, { params: Promise.resolve({ entity: 'product' }) });
    const data = await response.json();

    expect(data.entity).toBe('product');
    expect(data.schema).toEqual({ type: 'object' });
  });

  it('returns null schema if no match found', async () => {
    vi.mocked(registryBackend.listAll).mockReturnValue([] as any);

    const req = new NextRequest('http://localhost/api/ai/schema/missing');
    const response = await GET(req, { params: Promise.resolve({ entity: 'missing' }) });
    const data = await response.json();

    expect(data.schema).toBeNull();
  });
});
