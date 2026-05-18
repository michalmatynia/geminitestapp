import 'server-only';

import { randomUUID } from 'crypto';

import type {
  Page,
  Slug,
  PageComponentInput,
  CmsTheme,
  CreateCmsThemeDto as CmsThemeCreateInput,
  UpdateCmsThemeDto as CmsThemeUpdateInput,
  CmsThemeColors,
  CmsThemeTypography,
  CmsThemeSpacing,
  CmsRepository,
  PageUpdateData,
  CmsDomainDto,
  CreateCmsDomainDto,
  UpdateCmsDomainDto,
  CmsPageLookupOptions,
  CmsSlugLookupOptions,
} from '@/shared/contracts/cms';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { databaseError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/cms-builder-mongo-client';

import type { Filter } from 'mongodb';

const pagesCollection = 'cms_pages';
const slugsCollection = 'cms_slugs';
const themesCollection = 'cms_themes';
const domainsCollection = 'cms_domains';

interface PageDocument {
  id: string;
  name: string;
  locale?: string | null;
  translationGroupId?: string | null;
  sourceLocale?: string | null;
  translationStatus?: 'draft' | 'machine' | 'reviewed' | 'published';
  status: string;
  publishedAt?: Date | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoOgImage?: string | null;
  seoCanonical?: string | null;
  robotsMeta?: string | null;
  themeId?: string | null;
  showMenu?: boolean;
  components: PageComponentInput[];
  createdAt: Date;
  updatedAt: Date;
}

interface SlugDocument {
  id: string;
  slug: string;
  isDefault: boolean;
  locale?: string | null;
  translationGroupId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PageSlugDocument {
  pageId: string;
  slugId: string;
  assignedAt: Date;
}

interface ThemeDocument {
  id: string;
  name: string;
  colors: CmsThemeColors;
  typography: CmsThemeTypography;
  spacing: CmsThemeSpacing;
  customCss?: string | null;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DomainDocument {
  id: string;
  domain: string;
  aliasOf?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapPageComponentInput(component: PageComponentInput): PageComponentInput {
  return {
    type: component.type,
    order: component.order,
    content: {
      zone: component.content.zone,
      settings: component.content.settings,
      blocks: component.content.blocks,
      sectionId: component.content.sectionId,
      parentSectionId: component.content.parentSectionId,
    },
  };
}

function mapPageDocumentToPage(doc: PageDocument, slugs: SlugDocument[]): Page {
  const components = doc.components
    .map((component: PageComponentInput): PageComponentInput => mapPageComponentInput(component))
    .sort(
      (left: PageComponentInput, right: PageComponentInput): number => left.order - right.order
    );

  return {
    id: doc.id,
    name: doc.name,
    locale: normalizeLocale(doc.locale),
    translationGroupId: normalizeTranslationGroupId(doc.translationGroupId),
    sourceLocale: normalizeLocaleOrNull(doc.sourceLocale),
    translationStatus: doc.translationStatus ?? 'draft',
    status: doc.status as 'draft' | 'published' | 'scheduled',
    publishedAt: doc.publishedAt?.toISOString(),
    seoTitle: doc.seoTitle ?? undefined,
    seoDescription: doc.seoDescription ?? undefined,
    seoOgImage: doc.seoOgImage ?? undefined,
    seoCanonical: doc.seoCanonical ?? undefined,
    robotsMeta: doc.robotsMeta ?? undefined,
    themeId: doc.themeId ?? null,
    showMenu: doc.showMenu ?? true,
    components,
    slugs: slugs.map(mapSlugDocumentToSlug),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function mapSlugDocumentToSlug(doc: SlugDocument): Slug {
  return {
    id: doc.id,
    slug: doc.slug,
    isDefault: doc.isDefault,
    locale: normalizeLocale(doc.locale),
    translationGroupId: normalizeTranslationGroupId(doc.translationGroupId),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    pageId: null, // This would need a lookup if we strictly need it
  };
}

function mapDomainDocumentToDomain(doc: DomainDocument): CmsDomainDto {
  return {
    id: doc.id,
    name: doc.domain,
    domain: doc.domain,
    aliasOf: doc.aliasOf ?? undefined,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildIdFilter = <T extends { id: string }>(id: string): Filter<T> => {
  const filter: Filter<T> = { id } as unknown as Filter<T>;
  return filter;
};

const DEFAULT_CMS_LOCALE = DEFAULT_SITE_I18N_CONFIG.defaultLocale;

const normalizeLocale = (value?: string | null): string => {
  const normalized = value?.trim().toLowerCase();
  return normalized !== undefined && normalized !== '' ? normalized : DEFAULT_CMS_LOCALE;
};

const normalizeLocaleOrNull = (value?: string | null): string | null => {
  const normalized = value?.trim().toLowerCase();
  return normalized !== undefined && normalized !== '' ? normalized : null;
};

const normalizeTranslationGroupId = (value?: string | null): string | null => {
  const normalized = value?.trim();
  return normalized !== undefined && normalized !== '' ? normalized : null;
};

const resolveLocaleCandidates = (
  options?: CmsPageLookupOptions | CmsSlugLookupOptions
): string[] => {
  const requested = normalizeLocaleOrNull(options?.locale);
  if (requested === null) {
    return [];
  }

  if (options?.fallbackToDefaultLocale === false) {
    return [requested];
  }

  return Array.from(new Set([requested, DEFAULT_CMS_LOCALE]));
};

const pickLocalizedSlugDocument = (
  docs: SlugDocument[],
  options?: CmsSlugLookupOptions
): SlugDocument | null => {
  if (docs.length === 0) return null;

  const candidates = resolveLocaleCandidates(options);
  if (candidates.length === 0) {
    return docs[0] ?? null;
  }

  for (const locale of candidates) {
    const match = docs.find((doc) => normalizeLocale(doc.locale) === locale);
    if (match) {
      return match;
    }
  }

  return docs.find((doc) => normalizeLocaleOrNull(doc.locale) === null) ?? null;
};

const filterLocalizedSlugDocuments = (
  docs: SlugDocument[],
  options?: CmsSlugLookupOptions
): SlugDocument[] => {
  const candidates = resolveLocaleCandidates(options);
  if (candidates.length === 0) {
    return docs;
  }

  return docs.filter((doc) => {
    const locale = normalizeLocale(doc.locale);
    return candidates.includes(locale) || normalizeLocaleOrNull(doc.locale) === null;
  });
};

function removeUndefined<T extends object>(obj: T): T {
  const newObj = { ...obj };
  Object.keys(newObj).forEach((key: string): void => {
    if (newObj[key as keyof T] === undefined) {
      delete newObj[key as keyof T];
    }
  });
  return newObj;
}

const internalError = (message: string) => {
  const err = new Error(message);
  Object.assign(err, { status: 500 });
  return err;
};

// ---------------------------------------------------------------------------
// Repository Implementation
// ---------------------------------------------------------------------------

export const mongoCmsRepository: CmsRepository = {
  // Pages
  async getPages(): Promise<Page[]> {
    const db = await getMongoDb();
    const docs = await db
      .collection<PageDocument>(pagesCollection)
      .find()
      .sort({ updatedAt: -1 })
      .toArray();

    return Promise.all(
      docs.map(async (doc: PageDocument): Promise<Page> => {
        const pageId = doc.id;
        const slugLinks = await db
          .collection<PageSlugDocument>('cms_page_slugs')
          .find({ pageId })
          .toArray();
        const slugIds = slugLinks.map((link: PageSlugDocument) => link.slugId);
        const slugs = await db
          .collection<SlugDocument>(slugsCollection)
          .find({ id: { $in: slugIds } })
          .toArray();
        return mapPageDocumentToPage(doc, slugs);
      })
    );
  },

  async getPageById(id: string): Promise<Page | null> {
    try {
      const db = await getMongoDb();
      const doc = await db
        .collection<PageDocument>(pagesCollection)
        .findOne(buildIdFilter<PageDocument>(id));
      if (!doc) return null;

      const pageId = doc.id;
      const slugLinks = await db
        .collection<PageSlugDocument>('cms_page_slugs')
        .find({ pageId })
        .toArray();
      const slugIds = slugLinks.map((link: PageSlugDocument) => link.slugId);
      const slugs = await db
        .collection<SlugDocument>(slugsCollection)
        .find({ id: { $in: slugIds } })
        .toArray();
      return mapPageDocumentToPage(doc, slugs);
    } catch (error) {
      throw databaseError(`Failed to retrieve page by ID: ${id}`, error, {
        collection: pagesCollection,
        id,
      });
    }
  },

  async getPageBySlug(slugValue: string, options?: CmsPageLookupOptions): Promise<Page | null> {
    const db = await getMongoDb();
    const slugDocs = await db
      .collection<SlugDocument>(slugsCollection)
      .find({ slug: slugValue })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();
    const slugDoc = pickLocalizedSlugDocument(slugDocs, options);
    if (!slugDoc) return null;
    const pageSlug = await db
      .collection<PageSlugDocument>('cms_page_slugs')
      .findOne({ slugId: slugDoc.id });
    if (!pageSlug) return null;
    return this.getPageById(pageSlug.pageId);
  },

  async createPage(data: {
    name: string;
    themeId?: string | null | undefined;
    locale?: string | null;
    translationGroupId?: string | null;
    sourceLocale?: string | null;
    translationStatus?: 'draft' | 'machine' | 'reviewed' | 'published';
  }): Promise<Page> {
    const db = await getMongoDb();
    const id = randomUUID();
    const locale = normalizeLocale(data.locale);
    const doc: PageDocument = {
      id,
      name: data.name,
      locale,
      translationGroupId: normalizeTranslationGroupId(data.translationGroupId) ?? id,
      sourceLocale: normalizeLocaleOrNull(data.sourceLocale),
      translationStatus: data.translationStatus ?? 'draft',
      themeId: data.themeId ?? null,
      status: 'draft',
      showMenu: true,
      components: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection<PageDocument>(pagesCollection).insertOne(doc);
    return mapPageDocumentToPage(doc, []);
  },

  async updatePage(id: string, data: PageUpdateData): Promise<Page | null> {
    const db = await getMongoDb();
    const update: Partial<PageDocument> = removeUndefined({
      name: data.name,
      status: data.status,
      publishedAt:
        data.publishedAt !== undefined
          ? data.publishedAt
            ? new Date(data.publishedAt)
            : null
          : undefined,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      seoOgImage: data.seoOgImage,
      seoCanonical: data.seoCanonical,
      robotsMeta: data.robotsMeta,
      themeId: data.themeId,
      showMenu: data.showMenu,
      components: data.components,
      locale: data.locale ? normalizeLocale(data.locale) : undefined,
      translationGroupId:
        data.translationGroupId !== undefined
          ? normalizeTranslationGroupId(data.translationGroupId)
          : undefined,
      sourceLocale:
        data.sourceLocale !== undefined ? normalizeLocaleOrNull(data.sourceLocale) : undefined,
      translationStatus: data.translationStatus,
      updatedAt: new Date(),
    });

    const [result, slugLinks] = await Promise.all([
      db
        .collection<PageDocument>(pagesCollection)
        .findOneAndUpdate(
          buildIdFilter<PageDocument>(id),
          { $set: update },
          { returnDocument: 'after' }
        ),
      db.collection<PageSlugDocument>('cms_page_slugs').find({ pageId: id }).toArray(),
    ]);

    if (!result) return null;

    const slugIds = slugLinks.map((link) => link.slugId);
    const slugDocs =
      slugIds.length > 0
        ? await db
          .collection<SlugDocument>(slugsCollection)
          .find({ id: { $in: slugIds } })
          .toArray()
        : [];

    return mapPageDocumentToPage(result, slugDocs);
  },

  async deletePage(id: string): Promise<Page | null> {
    const db = await getMongoDb();
    const doc = await db
      .collection<PageDocument>(pagesCollection)
      .findOneAndDelete(buildIdFilter<PageDocument>(id));
    if (!doc) return null;
    const deleted = doc;

    // Also cleanup relationships
    await db.collection('cms_page_slugs').deleteMany({ pageId: id });
    return mapPageDocumentToPage(deleted, []);
  },

  async replacePageSlugs(pageId: string, slugIds: string[]): Promise<void> {
    const db = await getMongoDb();
    await db.collection('cms_page_slugs').deleteMany({ pageId });
    if (slugIds.length === 0) return;
    await db
      .collection<PageSlugDocument>('cms_page_slugs')
      .insertMany(slugIds.map((slugId: string) => ({ pageId, slugId, assignedAt: new Date() })));
  },

  async replacePageComponents(pageId: string, components: PageComponentInput[]): Promise<void> {
    const db = await getMongoDb();
    await db
      .collection<PageDocument>(pagesCollection)
      .updateOne(buildIdFilter<PageDocument>(pageId), {
        $set: { components, updatedAt: new Date() },
      });
  },

  // Slugs
  async getSlugs(options?: CmsSlugLookupOptions): Promise<Slug[]> {
    try {
      const db = await getMongoDb();
      const docs = await db
        .collection<SlugDocument>(slugsCollection)
        .find()
        .sort({ createdAt: -1 })
        .toArray();
      return filterLocalizedSlugDocuments(docs, options).map((doc: SlugDocument): Slug =>
        mapSlugDocumentToSlug(doc)
      );
    } catch (error) {
      throw databaseError('Failed to retrieve all slugs.', error, {
        collection: slugsCollection,
      });
    }
  },

  async getSlugsByIds(ids: string[], options?: CmsSlugLookupOptions): Promise<Slug[]> {
    if (ids.length === 0) return [];
    try {
      const db = await getMongoDb();
      const docs = await db
        .collection<SlugDocument>(slugsCollection)
        .find({
          id: { $in: ids },
        })
        .sort({ createdAt: -1 })
        .toArray();
      return filterLocalizedSlugDocuments(docs, options).map((doc: SlugDocument): Slug =>
        mapSlugDocumentToSlug(doc)
      );
    } catch (error) {
      throw databaseError('Failed to retrieve slugs by IDs.', error, {
        collection: slugsCollection,
        ids,
      });
    }
  },

  async getSlugById(id: string, _options?: CmsSlugLookupOptions): Promise<Slug | null> {
    try {
      const db = await getMongoDb();
      const doc = await db
        .collection<SlugDocument>(slugsCollection)
        .findOne(buildIdFilter<SlugDocument>(id));
      if (!doc) return null;
      return mapSlugDocumentToSlug(doc);
    } catch (error) {
      throw databaseError(`Failed to retrieve slug by ID: ${id}`, error, {
        collection: slugsCollection,
        slugId: id,
      });
    }
  },

  async getSlugByValue(slugValue: string, options?: CmsSlugLookupOptions): Promise<Slug | null> {
    try {
      const db = await getMongoDb();
      const docs = await db
        .collection<SlugDocument>(slugsCollection)
        .find({ slug: slugValue })
        .sort({ updatedAt: -1, createdAt: -1 })
        .toArray();
      const doc = pickLocalizedSlugDocument(docs, options);
      if (!doc) return null;
      return mapSlugDocumentToSlug(doc);
    } catch (error) {
      throw databaseError(`Failed to retrieve slug by value: ${slugValue}`, error, {
        collection: slugsCollection,
        slugValue,
      });
    }
  },

  async createSlug(data: {
    slug: string;
    pageId?: string | null;
    isDefault?: boolean;
    locale?: string | null;
    translationGroupId?: string | null;
  }): Promise<Slug> {
    try {
      const db = await getMongoDb();
      const id = randomUUID();
      const doc: SlugDocument = {
        id,
        slug: data.slug,
        isDefault: data.isDefault ?? false,
        locale: normalizeLocale(data.locale),
        translationGroupId: normalizeTranslationGroupId(data.translationGroupId) ?? id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection<SlugDocument>(slugsCollection).insertOne(doc);

      if (data.pageId) {
        await this.addSlugToPage(data.pageId, id);
      }

      return mapSlugDocumentToSlug(doc);
    } catch (error) {
      throw databaseError(`Failed to create slug: ${data.slug}`, error, {
        collection: slugsCollection,
        slug: data.slug,
      });
    }
  },

  async updateSlug(
    id: string,
    data: Partial<{
      slug: string;
      pageId: string | null;
      isDefault: boolean;
      locale: string | null;
      translationGroupId: string | null;
    }>
  ): Promise<Slug | null> {
    try {
      const db = await getMongoDb();
      const update: Partial<SlugDocument> = removeUndefined({
        slug: data.slug,
        isDefault: data.isDefault,
        locale: data.locale !== undefined ? normalizeLocale(data.locale) : undefined,
        translationGroupId:
          data.translationGroupId !== undefined
            ? normalizeTranslationGroupId(data.translationGroupId)
            : undefined,
        updatedAt: new Date(),
      });

      const result = await db
        .collection<SlugDocument>(slugsCollection)
        .findOneAndUpdate(
          buildIdFilter<SlugDocument>(id),
          { $set: update },
          { returnDocument: 'after' }
        );
      if (!result) return null;

      if (data.pageId !== undefined) {
        if (data.pageId === null) {
          await db.collection('cms_page_slugs').deleteMany({ slugId: id });
        } else {
          await this.replacePageSlugs(data.pageId, [id]);
        }
      }

      return mapSlugDocumentToSlug(result);
    } catch (error) {
      throw databaseError(`Failed to update slug: ${id}`, error, {
        collection: slugsCollection,
        slugId: id,
      });
    }
  },

  async deleteSlug(id: string): Promise<Slug | null> {
    try {
      const db = await getMongoDb();
      const doc = await db
        .collection<SlugDocument>(slugsCollection)
        .findOneAndDelete(buildIdFilter<SlugDocument>(id));
      if (!doc) return null;
      const deleted = doc;

      // Cleanup relationships
      await db.collection('cms_page_slugs').deleteMany({ slugId: id });
      return mapSlugDocumentToSlug(deleted);
    } catch (error) {
      throw databaseError(`Failed to delete slug: ${id}`, error, {
        collection: slugsCollection,
        slugId: id,
      });
    }
  },

  // Relationships
  async addSlugToPage(pageId: string, slugId: string): Promise<void> {
    const db = await getMongoDb();
    await db
      .collection('cms_page_slugs')
      .updateOne(
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
    const docs = await db
      .collection<ThemeDocument>(themesCollection)
      .find()
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map((doc: ThemeDocument) => ({
      id: doc.id,
      name: doc.name,
      colors: doc.colors,
      typography: doc.typography,
      spacing: doc.spacing,
      isDefault: doc.isDefault ?? false,
      ...(doc.customCss !== undefined && doc.customCss !== null && doc.customCss !== '' ? { customCss: doc.customCss } : {}),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }));
  },

  async getThemeById(id: string): Promise<CmsTheme | null> {
    const db = await getMongoDb();
    const doc = await db
      .collection<ThemeDocument>(themesCollection)
      .findOne(buildIdFilter<ThemeDocument>(id));
    if (!doc) return null;
    return {
      id: doc.id,
      name: doc.name,
      colors: doc.colors,
      typography: doc.typography,
      spacing: doc.spacing,
      isDefault: doc.isDefault ?? false,
      ...(doc.customCss !== undefined && doc.customCss !== null && doc.customCss !== '' ? { customCss: doc.customCss } : {}),
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
      isDefault: data.isDefault ?? false,
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
      isDefault: doc.isDefault ?? false,
      ...(doc.customCss !== undefined && doc.customCss !== null && doc.customCss !== '' ? { customCss: doc.customCss } : {}),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  },
  async updateTheme(id: string, data: CmsThemeUpdateInput): Promise<CmsTheme | null> {
    const db = await getMongoDb();
    const update: Partial<ThemeDocument> = removeUndefined({
      name: data.name,
      colors: data.colors,
      typography: data.typography,
      spacing: data.spacing,
      customCss: data.customCss,
      isDefault: data.isDefault,
      updatedAt: new Date(),
    });

    const result = await db
      .collection<ThemeDocument>(themesCollection)
      .findOneAndUpdate(
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
      isDefault: result.isDefault ?? false,
      ...(result.customCss !== undefined && result.customCss !== null && result.customCss !== '' ? { customCss: result.customCss } : {}),
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  },
  async deleteTheme(id: string): Promise<CmsTheme | null> {
    const db = await getMongoDb();
    const doc = await db
      .collection<ThemeDocument>(themesCollection)
      .findOneAndDelete(buildIdFilter<ThemeDocument>(id));
    if (!doc) return null;
    return {
      id: doc.id,
      name: doc.name,
      colors: doc.colors,
      typography: doc.typography,
      spacing: doc.spacing,
      isDefault: doc.isDefault ?? false,
      ...(doc.customCss !== undefined && doc.customCss !== null && doc.customCss !== '' ? { customCss: doc.customCss } : {}),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  },

  async getDefaultTheme(): Promise<CmsTheme | null> {
    const db = await getMongoDb();
    const filter: Filter<ThemeDocument> = { isDefault: true };
    const doc = await db
      .collection<ThemeDocument>(themesCollection)
      .findOne(filter);
    if (!doc) return null;
    return {
      id: doc.id,
      name: doc.name,
      colors: doc.colors,
      typography: doc.typography,
      spacing: doc.spacing,
      isDefault: doc.isDefault ?? false,
      ...(doc.customCss !== undefined && doc.customCss !== null && doc.customCss !== '' ? { customCss: doc.customCss } : {}),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  },

  async setDefaultTheme(id: string): Promise<void> {
    const db = await getMongoDb();
    const filter: Filter<ThemeDocument> = { isDefault: true };
    await db
      .collection<ThemeDocument>(themesCollection)
      .updateMany(filter, { $set: { isDefault: false } });
    await db
      .collection<ThemeDocument>(themesCollection)
      .updateOne(buildIdFilter<ThemeDocument>(id), { $set: { isDefault: true } });
  },

  // Domains
  async getDomains(): Promise<CmsDomainDto[]> {
    const db = await getMongoDb();
    const docs = await db
      .collection<DomainDocument>(domainsCollection)
      .find()
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(mapDomainDocumentToDomain);
  },

  async getDomainById(id: string): Promise<CmsDomainDto | null> {
    const db = await getMongoDb();
    const doc = await db
      .collection<DomainDocument>(domainsCollection)
      .findOne(buildIdFilter<DomainDocument>(id));
    if (!doc) return null;
    return mapDomainDocumentToDomain(doc);
  },

  async createDomain(data: CreateCmsDomainDto): Promise<CmsDomainDto> {
    const db = await getMongoDb();
    const id = randomUUID();
    const doc: DomainDocument = {
      id,
      domain: data.domain,
      aliasOf: data.aliasOf ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection<DomainDocument>(domainsCollection).insertOne(doc);
    return mapDomainDocumentToDomain(doc);
  },

  async updateDomain(id: string, data: UpdateCmsDomainDto): Promise<CmsDomainDto> {
    const db = await getMongoDb();
    const update: Partial<DomainDocument> = removeUndefined({
      domain: data.domain,
      aliasOf: data.aliasOf,
      updatedAt: new Date(),
    });

    await db
      .collection<DomainDocument>(domainsCollection)
      .updateOne(buildIdFilter<DomainDocument>(id), { $set: update });
    const updated = await this.getDomainById(id);
    if (!updated) throw internalError('Failed to update domain');
    return updated;
  },

  async deleteDomain(id: string): Promise<void> {
    const db = await getMongoDb();
    await db
      .collection<DomainDocument>(domainsCollection)
      .deleteOne(buildIdFilter<DomainDocument>(id));
  },
};
