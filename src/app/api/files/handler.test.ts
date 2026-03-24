import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET_handler } from './handler';
import { imageFileService } from '@/features/files/server';
import { getProductRepository } from '@/features/products/server';

vi.mock('@/features/files/server', () => ({
  imageFileService: {
    listImageFiles: vi.fn(),
  },
}));

vi.mock('@/features/products/server', () => ({
  getProductRepository: vi.fn(),
}));

describe('files GET_handler', () => {
  const mockContext = { source: 'test', query: {} } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all files if no product filters present', async () => {
    const mockFiles = [{ id: 'f1', filename: 'img1.png' }];
    vi.mocked(imageFileService.listImageFiles).mockResolvedValue(mockFiles as any);

    const req = new NextRequest('http://localhost/api/files');
    const response = await GET_handler(req, mockContext);
    const data = await response.json();

    expect(data).toHaveLength(1);
    expect(data[0].filename).toBe('img1.png');
    expect(imageFileService.listImageFiles).toHaveBeenCalled();
  });

  it('filters by productId', async () => {
    const mockFiles = [
      { id: 'f1', filename: 'img1.png' },
      { id: 'f2', filename: 'img2.png' },
    ];
    vi.mocked(imageFileService.listImageFiles).mockResolvedValue(mockFiles as any);

    const mockRepo = {
      getProducts: vi.fn().mockResolvedValue([
        { id: 'p1', name_en: 'Prod 1', images: [{ imageFileId: 'f1' }] }
      ]),
    };
    vi.mocked(getProductRepository).mockResolvedValue(mockRepo as any);

    const contextWithQuery = { ...mockContext, query: { productId: 'p1' } };
    const req = new NextRequest('http://localhost/api/files?productId=p1');
    const response = await GET_handler(req, contextWithQuery);
    const data = await response.json();

    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('f1');
    expect(data[0].products[0].product.id).toBe('p1');
  });
});
