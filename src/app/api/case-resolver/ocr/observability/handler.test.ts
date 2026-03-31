import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET_handler } from './handler';
import { getCaseResolverOcrObservabilitySnapshot } from '@/features/case-resolver/server';

vi.mock('@/features/case-resolver/server', () => ({
  getCaseResolverOcrObservabilitySnapshot: vi.fn(),
}));

describe('case-resolver/ocr/observability GET_handler', () => {
  const mockContext = { source: 'test', query: {} } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns snapshot with default options', async () => {
    const mockSnapshot = { total: 100, items: [] };
    vi.mocked(getCaseResolverOcrObservabilitySnapshot).mockResolvedValue(mockSnapshot as any);

    const req = new NextRequest('http://localhost/api/case-resolver/ocr/observability');
    const response = await GET_handler(req, mockContext);
    const data = await response.json();

    expect(data.snapshot).toEqual(mockSnapshot);
    expect(getCaseResolverOcrObservabilitySnapshot).toHaveBeenCalledWith({});
  });

  it('passes limit from query to snapshot service', async () => {
    const mockSnapshot = { total: 100, items: [] };
    vi.mocked(getCaseResolverOcrObservabilitySnapshot).mockResolvedValue(mockSnapshot as any);

    const contextWithQuery = { ...mockContext, query: { limit: 50 } };
    const req = new NextRequest('http://localhost/api/case-resolver/ocr/observability?limit=50');
    const response = await GET_handler(req, contextWithQuery);
    const data = await response.json();

    expect(data.snapshot).toEqual(mockSnapshot);
    expect(getCaseResolverOcrObservabilitySnapshot).toHaveBeenCalledWith({ limit: 50 });
  });
});
