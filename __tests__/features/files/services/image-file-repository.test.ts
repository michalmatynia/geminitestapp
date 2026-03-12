import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mongoImageFileRepository } from '@/shared/lib/files/services/image-file-repository/mongo-image-file-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

describe('ImageFileRepository (Mongo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createdAt = new Date('2026-03-01T10:00:00.000Z');
  const updatedAt = new Date('2026-03-02T10:00:00.000Z');
  const mockImageFile = {
    _id: 'img-1',
    id: 'img-1',
    filename: 'test.jpg',
    filepath: '/uploads/test.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    width: 100,
    height: 100,
    tags: ['tag1'],
    createdAt,
    updatedAt,
  };

  describe('createImageFile', () => {
    it('creates an image file', async () => {
      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const collection = vi.fn().mockReturnValue({ insertOne });
      vi.mocked(getMongoDb).mockResolvedValue({
        collection,
      } as Awaited<ReturnType<typeof getMongoDb>>);

      const input = {
        filename: 'test.jpg',
        filepath: '/uploads/test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      };

      const result = await mongoImageFileRepository.createImageFile(input);

      expect(collection).toHaveBeenCalledWith('image_files');
      expect(insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ filename: 'test.jpg', id: expect.any(String), _id: expect.any(String) })
      );
      expect(result.filename).toBe('test.jpg');
      expect(result.id).toEqual(expect.any(String));
    });
  });

  describe('getImageFileById', () => {
    it('returns image file if found', async () => {
      const findOne = vi.fn().mockResolvedValue(mockImageFile);
      const collection = vi.fn().mockReturnValue({ findOne });
      vi.mocked(getMongoDb).mockResolvedValue({
        collection,
      } as Awaited<ReturnType<typeof getMongoDb>>);

      const result = await mongoImageFileRepository.getImageFileById('img-1');

      expect(findOne).toHaveBeenCalledWith({ $or: [{ _id: 'img-1' }, { id: 'img-1' }] });
      expect(result?.id).toBe('img-1');
    });

    it('returns null if not found', async () => {
      const findOne = vi.fn().mockResolvedValue(null);
      const collection = vi.fn().mockReturnValue({ findOne });
      vi.mocked(getMongoDb).mockResolvedValue({
        collection,
      } as Awaited<ReturnType<typeof getMongoDb>>);

      const result = await mongoImageFileRepository.getImageFileById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('listImageFiles', () => {
    it('lists all files with optional filters', async () => {
      const toArray = vi.fn().mockResolvedValue([mockImageFile]);
      const find = vi.fn().mockReturnValue({ toArray });
      const collection = vi.fn().mockReturnValue({ find });
      vi.mocked(getMongoDb).mockResolvedValue({
        collection,
      } as Awaited<ReturnType<typeof getMongoDb>>);

      const result = await mongoImageFileRepository.listImageFiles({ filename: 'test' });

      expect(find).toHaveBeenCalledWith({
        filename: { $regex: 'test', $options: 'i' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('updateImageFilePath', () => {
    it('updates filepath', async () => {
      const findOneAndUpdate = vi.fn().mockResolvedValue({
        ...mockImageFile,
        filepath: '/new/path.jpg',
      });
      const collection = vi.fn().mockReturnValue({ findOneAndUpdate });
      vi.mocked(getMongoDb).mockResolvedValue({
        collection,
      } as Awaited<ReturnType<typeof getMongoDb>>);

      const result = await mongoImageFileRepository.updateImageFilePath('img-1', '/new/path.jpg');

      expect(result?.filepath).toBe('/new/path.jpg');
    });
  });

  describe('deleteImageFile', () => {
    it('deletes image file', async () => {
      const findOneAndDelete = vi.fn().mockResolvedValue(mockImageFile);
      const collection = vi.fn().mockReturnValue({ findOneAndDelete });
      vi.mocked(getMongoDb).mockResolvedValue({
        collection,
      } as Awaited<ReturnType<typeof getMongoDb>>);

      const result = await mongoImageFileRepository.deleteImageFile('img-1');

      expect(result?.id).toBe('img-1');
    });
  });
});
