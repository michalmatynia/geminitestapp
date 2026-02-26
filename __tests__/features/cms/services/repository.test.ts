import { vi, describe, it, expect, beforeEach } from 'vitest';

import { prismaCmsRepository } from '@/features/cms/services/cms-repository/prisma-cms-repository';
import prisma from '@/shared/lib/db/prisma';

vi.mock('@/shared/lib/db/prisma', () => {
  const mockPrisma = {
    page: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    slug: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    pageSlug: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    pageComponent: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    cmsTheme: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(mockPrisma)),
  };
  return {
    default: mockPrisma,
  };
});

describe('CMS Repository (Prisma)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pages', () => {
    it('should get all pages', async () => {
      const now = new Date();
      const mockPages = [{ id: '1', name: 'Home', createdAt: now, updatedAt: now }];
      (prisma.page.findMany as any).mockResolvedValue(mockPages);

      const result = await prismaCmsRepository.getPages();

      expect(prisma.page.findMany).toHaveBeenCalled();
      expect(result).toEqual([expect.objectContaining({
        id: '1',
        name: 'Home',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })]);
    });

    it('should get page by id with inclusions', async () => {
      const now = new Date();
      const mockPage = { id: '1', name: 'Home', components: [], slugs: [], createdAt: now, updatedAt: now };
      (prisma.page.findUnique as any).mockResolvedValue(mockPage);

      const result = await prismaCmsRepository.getPageById('1');

      expect(prisma.page.findUnique).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: '1' },
        include: expect.any(Object),
      }));
      expect(result).toEqual(expect.objectContaining({
        id: '1',
        name: 'Home',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }));
    });

    it('should create a new page', async () => {
      const now = new Date();
      const mockPage = { id: '1', name: 'New Page', createdAt: now, updatedAt: now };
      (prisma.page.create as any).mockResolvedValue(mockPage);

      const result = await prismaCmsRepository.createPage({ name: 'New Page' });

      expect(prisma.page.create).toHaveBeenCalledWith(expect.objectContaining({
        data: { name: 'New Page', themeId: null },
      }));
      expect(result).toEqual(expect.objectContaining({
        id: '1',
        name: 'New Page',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }));
    });

    it('should delete a page', async () => {
      const now = new Date();
      const mockPage = { id: '1', name: 'Deleted', createdAt: now, updatedAt: now };
      (prisma.page.delete as any).mockResolvedValue(mockPage);

      const result = await prismaCmsRepository.deletePage('1');

      expect(prisma.page.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: '1' } }));
      expect(result).toEqual(expect.objectContaining({
        id: '1',
        name: 'Deleted',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }));
    });

    it('should update a page', async () => {
      const now = new Date();
      const mockPage = { id: '1', name: 'Updated', createdAt: now, updatedAt: now };
      (prisma.page.update as any).mockResolvedValue(mockPage);
      (prisma.page.findUnique as any).mockResolvedValue(mockPage);

      const result = await prismaCmsRepository.updatePage('1', { name: 'Updated' });

      expect(prisma.page.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: '1' },
        data: expect.objectContaining({ name: 'Updated' }),
      }));
      expect(result).toEqual(expect.objectContaining({
        id: '1',
        name: 'Updated',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }));
    });

    it('should replace page components', async () => {
      const pageId = 'page-1';
      const components = [
        { type: 'hero', content: { title: 'Hello' } },
        { type: 'text', content: { body: 'World' } },
      ];

      await prismaCmsRepository.replacePageComponents(pageId, components as any);

      expect(prisma.pageComponent.deleteMany).toHaveBeenCalledWith({ where: { pageId } });
      expect(prisma.pageComponent.createMany).toHaveBeenCalledWith({
        data: components.map((c, i) => ({
          pageId,
          type: c.type,
          content: c.content,
          order: i,
        })),
      });
    });
  });

  describe('Slugs', () => {
    it('should get all slugs', async () => {
      const now = new Date();
      const mockSlugs = [{ id: '1', slug: 'home', createdAt: now, updatedAt: now }];
      (prisma.slug.findMany as any).mockResolvedValue(mockSlugs);

      const result = await prismaCmsRepository.getSlugs();

      expect(prisma.slug.findMany).toHaveBeenCalled();
      expect(result).toEqual([expect.objectContaining({
        id: '1',
        slug: 'home',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })]);
    });

    it('should create a slug', async () => {
      const now = new Date();
      const mockSlug = { id: '1', slug: 'test', createdAt: now, updatedAt: now };
      (prisma.slug.create as any).mockResolvedValue(mockSlug);

      const result = await prismaCmsRepository.createSlug({ slug: 'test' });

      expect(prisma.slug.create).toHaveBeenCalledWith(expect.objectContaining({
        data: { slug: 'test' },
      }));
      expect(result).toEqual(expect.objectContaining({
        id: '1',
        slug: 'test',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }));
    });
  });

  describe('Relationships', () => {
    it('should add slug to page', async () => {
      await prismaCmsRepository.addSlugToPage('p1', 's1');
      expect(prisma.pageSlug.create).toHaveBeenCalledWith({
        data: { pageId: 'p1', slugId: 's1' },
      });
    });
  });
});
