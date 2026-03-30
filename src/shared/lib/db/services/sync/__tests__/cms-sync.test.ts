import { ObjectId } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

import {
  syncCmsDomainSlugs,
  syncCmsDomainSlugsPrismaToMongo,
  syncCmsDomains,
  syncCmsDomainsPrismaToMongo,
  syncCmsPageSlugs,
  syncCmsPageSlugsPrismaToMongo,
  syncCmsPages,
  syncCmsPagesPrismaToMongo,
  syncCmsSlugs,
  syncCmsSlugsPrismaToMongo,
  syncCmsThemes,
  syncCmsThemesPrismaToMongo,
} from '@/shared/lib/db/services/sync/cms-sync';

const createMongo = (docsByCollection: Record<string, unknown[]>) => {
  const collections = new Map<
    string,
    {
      find: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      insertMany: ReturnType<typeof vi.fn>;
    }
  >();

  const collection = vi.fn((name: string) => {
    if (!collections.has(name)) {
      collections.set(name, {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(docsByCollection[name] ?? []),
        }),
        deleteMany: vi.fn().mockResolvedValue({ deletedCount: 4 }),
        insertMany: vi.fn().mockResolvedValue({ insertedCount: (docsByCollection[name] ?? []).length }),
      });
    }
    return collections.get(name)!;
  });

  return {
    mongo: { collection } as unknown as Parameters<typeof syncCmsSlugs>[0]['mongo'],
    collections,
  };
};

const baseContext = {
  normalizeId: (doc: Record<string, unknown>): string => {
    const rawId = doc._id;
    if (rawId instanceof ObjectId) return rawId.toString();
    if (typeof rawId === 'string') return rawId;
    if (typeof doc.id === 'string') return doc.id;
    return '';
  },
  toDate: (value: unknown): Date | null => (value ? new Date(value as string | Date) : null),
  toObjectIdMaybe: (value: string) => `oid:${value}`,
  toJsonValue: (value: unknown) => value,
  currencyCodes: new Set<string>(),
  countryCodes: new Set<string>(),
};

describe('cms-sync', () => {
  it('syncs CMS collections from Mongo to Prisma', async () => {
    const createdAt = new Date('2026-03-25T20:00:00.000Z');
    const { mongo } = createMongo({
      cms_slugs: [
        {
          _id: 'slug-1',
          slug: 'home',
          isDefault: true,
          createdAt,
          updatedAt: createdAt,
        },
        {
          slug: 'missing-id',
        },
      ],
      cms_themes: [
        {
          _id: 'theme-1',
          name: 'Bold',
          colors: { accent: '#ff6600' },
          typography: { heading: 'serif' },
          spacing: { lg: 24 },
          customCss: '.hero{display:grid;}',
          createdAt,
          updatedAt: createdAt,
        },
      ],
      cms_pages: [
        {
          _id: 'page-1',
          name: 'Landing',
          status: 'published',
          publishedAt: createdAt.toISOString(),
          seoTitle: 'Landing title',
          seoDescription: 'Landing description',
          seoOgImage: '/og.png',
          seoCanonical: 'https://example.test',
          robotsMeta: 'index,follow',
          themeId: 'theme-1',
          showMenu: null,
          components: [
            { type: 'hero', content: { title: 'Welcome' } },
            { type: 'faq', content: { items: 3 } },
          ],
          createdAt,
          updatedAt: createdAt,
        },
      ],
      cms_page_slugs: [
        {
          pageId: 'page-1',
          slugId: 'slug-1',
          assignedAt: createdAt,
        },
        {
          pageId: '',
          slugId: 'missing',
        },
      ],
      cms_domains: [
        {
          _id: 'domain-1',
          domain: 'example.test',
          aliasOf: null,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      cms_domain_slugs: [
        {
          domainId: 'domain-1',
          slugId: 'slug-1',
          assignedAt: createdAt,
          isDefault: true,
          updatedAt: createdAt,
        },
        {
          domainId: '',
          slugId: 'slug-2',
        },
      ],
    });

    const prisma = {
      slug: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      cmsTheme: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      pageComponent: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      page: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      pageSlug: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      cmsDomain: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      cmsDomainSlug: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as Parameters<typeof syncCmsSlugs>[0]['prisma'];

    const slugsResult = await syncCmsSlugs({
      mongo,
      prisma,
      ...baseContext,
    });
    const themesResult = await syncCmsThemes({
      mongo,
      prisma,
      ...baseContext,
    });
    const pagesResult = await syncCmsPages({
      mongo,
      prisma,
      ...baseContext,
    });
    const pageSlugsResult = await syncCmsPageSlugs({
      mongo,
      prisma,
      ...baseContext,
    });
    const domainsResult = await syncCmsDomains({
      mongo,
      prisma,
      ...baseContext,
    });
    const domainSlugsResult = await syncCmsDomainSlugs({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(slugsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });
    expect(themesResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });
    expect(pagesResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });
    expect(pageSlugsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });
    expect(domainsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });
    expect(domainSlugsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });

    expect(prisma.pageComponent.deleteMany).toHaveBeenCalledWith();
    expect(prisma.page.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'page-1',
          publishedAt: new Date(createdAt),
          showMenu: true,
          themeId: 'theme-1',
          seoCanonical: 'https://example.test',
        }),
      ],
    });
    expect(prisma.pageComponent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'page-1-0',
          pageId: 'page-1',
          type: 'hero',
          order: 0,
          content: { title: 'Welcome' },
        }),
        expect.objectContaining({
          id: 'page-1-1',
          pageId: 'page-1',
          type: 'faq',
          order: 1,
          content: { items: 3 },
        }),
      ],
    });
    expect(prisma.cmsDomainSlug.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          domainId: 'domain-1',
          slugId: 'slug-1',
          isDefault: true,
        }),
      ],
    });
  });

  it('syncs CMS collections from Prisma back to Mongo', async () => {
    const createdAt = new Date('2026-03-25T20:30:00.000Z');
    const { mongo, collections } = createMongo({});

    const prisma = {
      slug: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'slug-1',
            slug: 'home',
            isDefault: true,
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      cmsTheme: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'theme-1',
            name: 'Bold',
            colors: { accent: '#ff6600' },
            typography: { heading: 'serif' },
            spacing: { lg: 24 },
            customCss: '.hero{display:grid;}',
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      page: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'page-1',
            name: 'Landing',
            status: 'published',
            publishedAt: createdAt,
            seoTitle: 'Landing title',
            seoDescription: 'Landing description',
            seoOgImage: '/og.png',
            seoCanonical: 'https://example.test',
            robotsMeta: 'index,follow',
            themeId: 'theme-1',
            showMenu: false,
            components: [
              { type: 'faq', order: 2, content: { items: 3 } },
              { type: 'hero', order: 1, content: { title: 'Welcome' } },
            ],
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      pageSlug: {
        findMany: vi.fn().mockResolvedValue([
          {
            pageId: 'page-1',
            slugId: 'slug-1',
            assignedAt: createdAt,
          },
        ]),
      },
      cmsDomain: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'domain-1',
            domain: 'example.test',
            aliasOf: null,
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      cmsDomainSlug: {
        findMany: vi.fn().mockResolvedValue([
          {
            domainId: 'domain-1',
            slugId: 'slug-1',
            assignedAt: createdAt,
            isDefault: true,
            updatedAt: createdAt,
          },
        ]),
      },
    } as unknown as Parameters<typeof syncCmsSlugsPrismaToMongo>[0]['prisma'];

    const slugsResult = await syncCmsSlugsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const themesResult = await syncCmsThemesPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const pagesResult = await syncCmsPagesPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const pageSlugsResult = await syncCmsPageSlugsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const domainsResult = await syncCmsDomainsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const domainSlugsResult = await syncCmsDomainSlugsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(slugsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 4,
      targetInserted: 1,
    });
    expect(themesResult).toEqual({
      sourceCount: 1,
      targetDeleted: 4,
      targetInserted: 1,
    });
    expect(pagesResult).toEqual({
      sourceCount: 1,
      targetDeleted: 4,
      targetInserted: 1,
    });
    expect(pageSlugsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 4,
      targetInserted: 1,
    });
    expect(domainsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 4,
      targetInserted: 1,
    });
    expect(domainSlugsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 4,
      targetInserted: 1,
    });

    expect(collections.get('cms_pages')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'page-1',
        components: [
          { type: 'hero', content: { title: 'Welcome' } },
          { type: 'faq', content: { items: 3 } },
        ],
        showMenu: false,
      }),
    ]);
    expect(collections.get('cms_domains')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'oid:domain-1',
        domain: 'example.test',
      }),
    ]);
    expect(collections.get('cms_domain_slugs')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: expect.any(ObjectId),
        domainId: 'domain-1',
        slugId: 'slug-1',
        isDefault: true,
      }),
    ]);
  });
});
