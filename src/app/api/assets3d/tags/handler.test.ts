import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHandler } from './handler';
import { getAsset3DRepository } from '@/features/viewer3d/server';

vi.mock('@/features/viewer3d/server', () => ({
  getAsset3DRepository: vi.fn(),
}));

describe('assets3d/tags getHandler', () => {
  const mockContext = { source: 'test' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns tags from repository', async () => {
    const mockTags = ['shiny', 'dirty', 'broken'];
    const mockRepo = {
      getTags: vi.fn().mockResolvedValue(mockTags),
    };
    vi.mocked(getAsset3DRepository).mockReturnValue(mockRepo as any);

    const req = new NextRequest('http://localhost/api/assets3d/tags');
    const response = await getHandler(req, mockContext);
    const data = await response.json();

    expect(data).toEqual(mockTags);
    expect(mockRepo.getTags).toHaveBeenCalled();
  });
});
