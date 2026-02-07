import 'server-only';

import { randomUUID } from 'crypto';

import { ObjectId } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { Page, Slug, PageComponent, CmsTheme, CmsThemeCreateInput, CmsThemeUpdateInput, CmsThemeColors, CmsThemeTypography, CmsThemeSpacing } from '../../types';
import type { CmsRepository, PageUpdateData } from '../../types/services/cms-repository';
import type { Filter } from 'mongodb';

const pagesCollection = 'cms_pages';
const slugsCollection = 'cms_slugs';
const themesCollection = 'cms_themes';

interface PageDocument {
  id: string;
  name: string;
  status: string;
  publishedAt?: Date | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoOgImage?: string | null;
  seoCanonical?: string | null;
  robotsMeta?: string | null;
  themeId?: string | null;
  showMenu?: boolean;
  components: PageComponent[];
  createdAt: Date;
  updatedAt: Date;
}

interface ThemeDocument {
  id: string;
  name: string;
  colors: CmsThemeColors;
  typography: CmsThemeTypography;
  spacing: CmsThemeSpacing;
  customCss?: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SlugDocument {
  id: string;
  slug: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PageSlugDocument {
  pageId: string;
  slugId: string;
  assignedAt: Date;
}

// Helper to remove undefined keys for exactOptionalPropertyTypes compliance
function removeUndefined<T extends object>(obj: T): T {
  const newObj = { ...obj };
  Object.keys(newObj).forEach((key: string): void => {
    if (newObj[key as keyof T] === undefined) {
      delete newObj[key as keyof T];
    }
  });
  return newObj;
}

function buildIdFilter<T extends { id: string }>(id: string): Filter<T> {
  const orFilters: Filter<T>[] = [{ id } as Filter<T>];
  
  if (ObjectId.isValid(id)) {
    orFilters.push({ _id: new ObjectId(id) } as Filter<T>);
  }
  
  return { $or: orFilters } as Filter<T>;
}

function normalizeShowMenu(value: unknown): boolean {
  if (value === false) return false;
  if (value === true) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  }
  return true;
}

export const mongoCmsRepository: CmsRepository = {
  // Pages
  async getPages(): Promise<Page[]> {
    const db = await getMongoDb();
    const docs = await db.collection<PageDocument>(pagesCollection).find().sort({ createdAt: -1 }).toArray();
    
    return Promise.all(docs.map(async (doc: PageDocument): Promise<Page> => {
      const pageId = doc.id;
      const slugLinks = await db.collection<PageSlugDocument>('cms_page_slugs').find({ pageId }).toArray();
      const slugIds = slugLinks.map((link: PageSlugDocument) => link.slugId);
      const slugs = await db.collection<SlugDocument>(slugsCollection).find({ id: { $in: slugIds } }).toArray();

      return {
        id: pageId,
        name: doc.name,
        status: doc.status || 'draft',
        publishedAt: doc.publishedAt?.toISOString(),
        seoTitle: doc.seoTitle ?? undefined,
        seoDescription: doc.seoDescription ?? undefined,
        seoOgImage: doc.seoOgImage ?? undefined,
        seoCanonical: doc.seoCanonical ?? undefined,
        robotsMeta: doc.robotsMeta ?? 'index,follow',
        showMenu: normalizeShowMenu(doc.showMenu),
        components: doc.components || [],
        slugs: slugs.map((s: SlugDocument) => ({ slug: { slug: s.slug } })),
      } as Page;
    }));
  },

  async getPageById(id: string): Promise<Page | null> {
    const db = await getMongoDb();
    const doc = await db.collection<PageDocument>(pagesCollection).findOne(buildIdFilter<PageDocument>(id));
    if (!doc) return null;

    const pageId = doc.id;
    const slugLinks = await db.collection<PageSlugDocument>('cms_page_slugs').find({ pageId }).toArray();
    const slugIds = slugLinks.map((link: PageSlugDocument) => link.slugId);
    const slugs = await db.collection<SlugDocument>(slugsCollection).find({ id: { $in: slugIds } }).toArray();

    return {
      id: pageId,
      name: doc.name,
      status: doc.status || 'draft',
      publishedAt: doc.publishedAt?.toISOString(),
      seoTitle: doc.seoTitle ?? undefined,
      seoDescription: doc.seoDescription ?? undefined,
      seoOgImage: doc.seoOgImage ?? undefined,
      seoCanonical: doc.seoCanonical ?? undefined,
      robotsMeta: doc.robotsMeta ?? 'index,follow',
      showMenu: normalizeShowMenu(doc.showMenu),
      components: doc.components || [],
      slugs: slugs.map((s: SlugDocument) => ({ slug: { slug: s.slug } })),
    } as Page;
  },

  async getPageBySlug(slugValue: string): Promise<Page | null> {
    const db = await getMongoDb();
    const slugDoc = await db.collection<SlugDocument>(slugsCollection).findOne({ slug: slugValue });
    if (!slugDoc) return null;
    const pageSlug = await db.collection<PageSlugDocument>('cms_page_slugs').findOne({ slugId: slugDoc.id });
    if (!pageSlug) return null;
    return this.getPageById(pageSlug.pageId);
  },

  async createPage(data: { name: string }): Promise<Page> {
    const db = await getMongoDb();
    const id = randomUUID();
    const doc: PageDocument = {
      id,
      name: data.name,
      status: 'draft',
      showMenu: true,
      components: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection<PageDocument>(pagesCollection).insertOne(doc);
    return { id, name: doc.name, status: 'draft', showMenu: true, components: [] } as Page;
  },

  async updatePage(id: string, data: PageUpdateData): Promise<Page | null> {
    const db = await getMongoDb();
    const update = removeUndefined({
      name: data.name,
      status: data.status,
      publishedAt: data.publishedAt !== undefined ? (data.publishedAt ? new Date(data.publishedAt) : null) : undefined,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      seoOgImage: data.seoOgImage,
      seoCanonical: data.seoCanonical,
      robotsMeta: data.robotsMeta,
      themeId: data.themeId,
      showMenu: data.showMenu,
      components: data.components,
      updatedAt: new Date(),
    }) as Partial<PageDocument>;

    const result = await db.collection<PageDocument>(pagesCollection).findOneAndUpdate(
      buildIdFilter<PageDocument>(id),
      { $set: update },
      { returnDocument: 'after' }
    );
    if (!result) return null;
    return this.getPageById(id);
  },

  async deletePage(id: string): Promise<Page | null> {
    const db = await getMongoDb();
    const doc = await db.collection<PageDocument>(pagesCollection).findOneAndDelete(buildIdFilter<PageDocument>(id));
    if (!doc) return null;
    const deleted = doc;
    
    // Also cleanup relationships
    await db.collection('cms_page_slugs').deleteMany({ pageId: id });

    return {
      id: deleted.id,
      name: deleted.name,
      components: deleted.components || [],
    } as Page;
  },

  async replacePageSlugs(pageId: string, slugIds: string[]): Promise<void> {
    const db = await getMongoDb();
    await db.collection('cms_page_slugs').deleteMany({ pageId });
    if (slugIds.length === 0) return;
    await db.collection<PageSlugDocument>('cms_page_slugs').insertMany(
      slugIds.map((slugId: string) => ({ pageId, slugId, assignedAt: new Date() }))
    );
  },

  async replacePageComponents(pageId: string, components: PageComponent[]): Promise<void> {
    const db = await getMongoDb();
    await db.collection<PageDocument>(pagesCollection).updateOne(
      buildIdFilter<PageDocument>(pageId),
      { $set: { components, updatedAt: new Date() } }
    );
  },

  // Slugs
  async getSlugs(): Promise<Slug[]> {
    const db = await getMongoDb();
    const docs = await db.collection<SlugDocument>(slugsCollection).find().sort({ createdAt: -1 }).toArray();
    return docs.map((doc: SlugDocument) => ({
      id: doc.id,
      slug: doc.slug,
      isDefault: doc.isDefault,
      createdAt: doc.createdAt.toISOString(),
    })) as Slug[];
  },

  async getSlugById(id: string): Promise<Slug | null> {
    const db = await getMongoDb();
    const doc = await db.collection<SlugDocument>(slugsCollection).findOne(buildIdFilter<SlugDocument>(id));
    if (!doc) return null;
    return {
      id: doc.id,
      slug: doc.slug,
      isDefault: doc.isDefault,
      createdAt: doc.createdAt.toISOString(),
    } as Slug;
  },

  async getSlugByValue(slugValue: string): Promise<Slug | null> {
    const db = await getMongoDb();
    const doc = await db.collection<SlugDocument>(slugsCollection).findOne({ slug: slugValue });
    if (!doc) return null;
    return {
      id: doc.id,
      slug: doc.slug,
      isDefault: doc.isDefault,
      createdAt: doc.createdAt.toISOString(),
    } as Slug;
  },

  async createSlug(data: { slug: string; isDefault?: boolean | undefined }): Promise<Slug> {
    const db = await getMongoDb();
    const id = randomUUID();
    const doc: SlugDocument = {
      id,
      slug: data.slug,
      isDefault: data.isDefault || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection<SlugDocument>(slugsCollection).insertOne(doc);
    return {
      id,
      slug: doc.slug,
      isDefault: doc.isDefault,
      createdAt: doc.createdAt.toISOString(),
    } as Slug;
  },

  async updateSlug(id: string, data: { slug?: string | undefined; isDefault?: boolean | undefined }): Promise<Slug | null> {
    const db = await getMongoDb();
    const update = removeUndefined({
      slug: data.slug,
      isDefault: data.isDefault,
      updatedAt: new Date(),
    }) as Partial<SlugDocument>;

    const result = await db.collection<SlugDocument>(slugsCollection).findOneAndUpdate(
      buildIdFilter<SlugDocument>(id),
      { $set: update },
      { returnDocument: 'after' }
    );
    if (!result) return null;
    const doc = result;
    return {
      id: doc.id,
      slug: doc.slug,
      isDefault: doc.isDefault,
      createdAt: doc.createdAt.toISOString(),
    } as Slug;
  },

  async deleteSlug(id: string): Promise<Slug | null> {
    const db = await getMongoDb();
    const doc = await db.collection<SlugDocument>(slugsCollection).findOneAndDelete(buildIdFilter<SlugDocument>(id));
    if (!doc) return null;
    const deleted = doc;
    
    // Cleanup relationships
    await db.collection('cms_page_slugs').deleteMany({ slugId: id });

    return {
      id: deleted.id,
      slug: deleted.slug,
      isDefault: deleted.isDefault,
      createdAt: deleted.createdAt.toISOString(),
    } as Slug;
  },

  // Relationships
  async addSlugToPage(pageId: string, slugId: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection('cms_page_slugs').updateOne(
      { pageId, slugId },
      { $set: { pageId, slugId, assignedAt: new Date() } },
      { upsert: true }
    );
  },

  async removeSlugFromPage(pageId: string, slugId: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection('cms_page_slugs').deleteOne({ pageId, slugId });
  },

  // Themes
  async getThemes(): Promise<CmsTheme[]> {
    const db = await getMongoDb();
    const docs = await db.collection<ThemeDocument>(themesCollection).find().sort({ createdAt: -1 }).toArray();
    return docs.map((doc: ThemeDocument) => ({
      id: doc.id,
      name: doc.name,
      colors: doc.colors,
      typography: doc.typography,
      spacing: doc.spacing,
      isDefault: doc.isDefault || false,
      ...(doc.customCss && { customCss: doc.customCss }),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }));
  },

  async getThemeById(id: string): Promise<CmsTheme | null> {
    const db = await getMongoDb();
    const doc = await db.collection<ThemeDocument>(themesCollection).findOne(buildIdFilter<ThemeDocument>(id));
    if (!doc) return null;
    return {
      id: doc.id,
      name: doc.name,
      colors: doc.colors,
      typography: doc.typography,
      spacing: doc.spacing,
      isDefault: doc.isDefault || false,
      ...(doc.customCss && { customCss: doc.customCss }),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  },

  async createTheme(data: CmsThemeCreateInput): Promise<CmsTheme> {
    const db = await getMongoDb();
    const id = randomUUID();
    const doc: ThemeDocument = {
      id,
      name: data.name,
      colors: data.colors,
      typography: data.typography,
      spacing: data.spacing,
      customCss: data.customCss ?? null,
      isDefault: data.isDefault || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection<ThemeDocument>(themesCollection).insertOne(doc);
    return {
      id,
      name: doc.name,
      colors: doc.colors,
      typography: doc.typography,
      spacing: doc.spacing,
      isDefault: doc.isDefault || false,
      ...(doc.customCss && { customCss: doc.customCss }),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  },

  async updateTheme(id: string, data: CmsThemeUpdateInput): Promise<CmsTheme | null> {
    const db = await getMongoDb();
    const update = removeUndefined({
      name: data.name,
      colors: data.colors,
      typography: data.typography,
      spacing: data.spacing,
      customCss: data.customCss,
      isDefault: data.isDefault,
      updatedAt: new Date(),
    }) as Partial<ThemeDocument>;

    const result = await db.collection<ThemeDocument>(themesCollection).findOneAndUpdate(
      buildIdFilter<ThemeDocument>(id),
      { $set: update },
      { returnDocument: 'after' }
    );
    if (!result) return null;
    return {
      id: result.id,
      name: result.name,
      colors: result.colors,
      typography: result.typography,
      spacing: result.spacing,
      isDefault: result.isDefault || false,
      ...(result.customCss && { customCss: result.customCss }),
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  },

  async deleteTheme(id: string): Promise<CmsTheme | null> {
    const db = await getMongoDb();
    const doc = await db.collection<ThemeDocument>(themesCollection).findOneAndDelete(buildIdFilter<ThemeDocument>(id));
    if (!doc) return null;
    return {
      id: doc.id,
      name: doc.name,
      colors: doc.colors,
      typography: doc.typography,
      spacing: doc.spacing,
      isDefault: doc.isDefault || false,
      ...(doc.customCss && { customCss: doc.customCss }),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  },
};
