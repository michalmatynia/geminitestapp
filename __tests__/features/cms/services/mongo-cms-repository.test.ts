
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { mongoCmsRepository } from '@/features/cms/services/cms-repository/mongo-cms-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

describe('Mongo CMS Repository', () => {
  const mockCollection = {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    toArray: vi.fn(),
    findOne: vi.fn(),
    insertOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
    deleteMany: vi.fn(),
    updateOne: vi.fn(),
    insertMany: vi.fn(),
  };

  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getMongoDb as any).mockResolvedValue(mockDb);
  });

  describe('Pages', () => {
    it('should get all pages', async () => {
      const mockDocs = [{ id: '1', name: 'Home', components: [] }];
      mockCollection.toArray
        .mockResolvedValueOnce(mockDocs) // pages
        .mockResolvedValueOnce([]) // slugLinks
        .mockResolvedValueOnce([]); // slugs

      const pages = await mongoCmsRepository.getPages();

      expect(pages).toHaveLength(1);
      expect(pages[0]!.name).toBe('Home');
    });

    it('should create a page', async () => {
      await mongoCmsRepository.createPage({ name: 'New Page' });
      expect(mockCollection.insertOne).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Page',
        status: 'draft',
      }));
    });

    it('should update a page', async () => {
      const mockPage = { id: '1', name: 'Updated', components: [] };
      mockCollection.findOneAndUpdate.mockResolvedValue(mockPage);
      mockCollection.findOne.mockResolvedValue(mockPage); // Inside getPageById
      mockCollection.toArray.mockResolvedValue([]); // slugs

      const result = await mongoCmsRepository.updatePage('1', { name: 'Updated' });

      expect(result?.name).toBe('Updated');
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('Slugs', () => {
    it('should create a slug', async () => {
      await mongoCmsRepository.createSlug({ slug: 'test' });
      expect(mockCollection.insertOne).toHaveBeenCalledWith(expect.objectContaining({
        slug: 'test',
        isDefault: false,
      }));
    });
  });

  describe('Themes', () => {
    it('should get all themes', async () => {
      const mockThemes = [{ id: 't1', name: 'Theme 1', colors: {}, typography: {}, spacing: {}, createdAt: new Date(), updatedAt: new Date() }];
      mockCollection.toArray.mockResolvedValue(mockThemes);

      const themes = await mongoCmsRepository.getThemes();

      expect(themes).toHaveLength(1);
      expect(themes[0]!.name).toBe('Theme 1');
    });
  });
});
