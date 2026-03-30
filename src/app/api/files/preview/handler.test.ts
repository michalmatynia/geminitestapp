import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET_handler } from './handler';
import { getImageFileRepository, getDiskPathFromPublicPath, isHttpFilepath } from '@/features/files/server';
import { getFsPromises } from '@/shared/lib/files/runtime-fs';

vi.mock('@/features/files/server', () => ({
  getImageFileRepository: vi.fn(),
  getDiskPathFromPublicPath: vi.fn(),
  isHttpFilepath: vi.fn(),
}));

vi.mock('@/shared/lib/files/runtime-fs', () => ({
  getFsPromises: vi.fn(),
}));

describe('files/preview GET_handler', () => {
  const mockContext = { source: 'test', query: {} } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws badRequestError if fileId is missing', async () => {
    const req = new NextRequest('http://localhost/api/files/preview');
    await expect(GET_handler(req, mockContext)).rejects.toThrow('File ID is required');
  });

  it('serves file from disk if local path exists', async () => {
    const mockFile = { id: 'f1', filepath: '/uploads/img.png' };
    const mockRepo = { getImageFileById: vi.fn().mockResolvedValue(mockFile) };
    vi.mocked(getImageFileRepository).mockResolvedValue(mockRepo as any);
    vi.mocked(getDiskPathFromPublicPath).mockReturnValue('/abs/path/img.png');
    
    const mockFs = { readFile: vi.fn().mockResolvedValue(Buffer.from('content')) };
    vi.mocked(getFsPromises).mockReturnValue(mockFs as any);

    const contextWithQuery = { ...mockContext, query: { fileId: 'f1' } };
    const req = new NextRequest('http://localhost/api/files/preview?fileId=f1');
    const response = await GET_handler(req, contextWithQuery);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('content');
    expect(mockFs.readFile).toHaveBeenCalledWith('/abs/path/img.png');
  });
});
