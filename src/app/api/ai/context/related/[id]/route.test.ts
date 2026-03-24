import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { retrievalService } from '@/features/ai/ai-context-registry/server';

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  retrievalService: {
    getRelatedNodes: vi.fn(),
  },
}));

describe('ai/context/related/[id] GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns related nodes for a given ID', async () => {
    const mockNodes = [{ id: 'n1', score: 0.9 }];
    vi.mocked(retrievalService.getRelatedNodes).mockReturnValue(mockNodes as any);

    const req = new NextRequest('http://localhost/api/ai/context/related/123');
    const response = await GET(req, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(data).toEqual(mockNodes);
    expect(retrievalService.getRelatedNodes).toHaveBeenCalledWith('123');
  });
});
