import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET_handler } from './handler';
import { getAsset3DRepository } from '@/features/viewer3d/server';

vi.mock('@/features/viewer3d/server', () => ({
  getAsset3DRepository: vi.fn(),
}));

describe('assets3d/categories GET_handler', () => {
  const mockContext = { source: 'test' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns categories from repository', async () => {
    const mockCategories = ['arch', 'nature', 'prop'];
    const mockRepo = {
      getCategories: vi.fn().mockResolvedValue(mockCategories),
    };
    vi.mocked(getAsset3DRepository).mockReturnValue(mockRepo as any);

    const req = new NextRequest('http://localhost/api/assets3d/categories');
    const response = await GET_handler(req, mockContext);
    const data = await response.json();

    expect(data).toEqual(mockCategories);
    expect(mockRepo.getCategories).toHaveBeenCalled();
  });
});
