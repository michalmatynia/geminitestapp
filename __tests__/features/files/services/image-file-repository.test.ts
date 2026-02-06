import { describe, it, expect, vi, beforeEach } from 'vitest';

import { prismaImageFileRepository } from '@/features/files/services/image-file-repository/prisma-image-file-repository';
import prisma from '@/shared/lib/db/prisma';

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    imageFile: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('ImageFileRepository (Prisma)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockImageFile = {
    id: 'img-1',
    filename: 'test.jpg',
    filepath: '/uploads/test.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    width: 100,
    height: 100,
    tags: ['tag1'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('createImageFile', () => {
    it('creates an image file', async () => {
      (prisma.imageFile.create as any).mockResolvedValue(mockImageFile);
      const input = {
        filename: 'test.jpg',
        filepath: '/uploads/test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      };

      const result = await prismaImageFileRepository.createImageFile(input);

      expect(prisma.imageFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ filename: 'test.jpg' }),
      });
      expect(result.id).toBe('img-1');
    });
  });

  describe('getImageFileById', () => {
    it('returns image file if found', async () => {
      (prisma.imageFile.findUnique as any).mockResolvedValue(mockImageFile);
      const result = await prismaImageFileRepository.getImageFileById('img-1');
      expect(result?.id).toBe('img-1');
    });

    it('returns null if not found', async () => {
      (prisma.imageFile.findUnique as any).mockResolvedValue(null);
      const result = await prismaImageFileRepository.getImageFileById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listImageFiles', () => {
    it('lists all files with optional filters', async () => {
      (prisma.imageFile.findMany as any).mockResolvedValue([mockImageFile]);
      const result = await prismaImageFileRepository.listImageFiles({ filename: 'test' });
      
      expect(prisma.imageFile.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          filename: { contains: 'test', mode: 'insensitive' },
        }),
      });
      expect(result.length).toBe(1);
    });
  });

  describe('updateImageFilePath', () => {
    it('updates filepath', async () => {
      (prisma.imageFile.update as any).mockResolvedValue({ ...mockImageFile, filepath: '/new/path.jpg' });
      const result = await prismaImageFileRepository.updateImageFilePath('img-1', '/new/path.jpg');
      expect(result?.filepath).toBe('/new/path.jpg');
    });
  });

  describe('deleteImageFile', () => {
    it('deletes image file', async () => {
      (prisma.imageFile.delete as any).mockResolvedValue(mockImageFile);
      const result = await prismaImageFileRepository.deleteImageFile('img-1');
      expect(result?.id).toBe('img-1');
    });
  });
});
