import "server-only";

import { randomUUID } from "crypto";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import type { Filter } from "mongodb";
import { ObjectId } from "mongodb";
import type { CmsRepository, PageUpdateData } from "../../types/services/cms-repository";
import type { Page, Slug, PageComponent, CmsTheme, CmsThemeCreateInput, CmsThemeUpdateInput } from "../../types";

const pagesCollection = "cms_pages";
const slugsCollection = "cms_slugs";
const themesCollection = "cms_themes";

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
  components: PageComponent[];
  createdAt: Date;
  updatedAt: Date;
}

interface ThemeDocument {
  id: string;
  name: string;
  colors: Record<string, string>;
  typography: Record<string, unknown>;
  spacing: Record<string, string>;
  customCss?: string | null;
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
  Object.keys(newObj).forEach((key) => {
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

export const mongoCmsRepository: CmsRepository = {
  // Pages
  async getPages(): Promise<Page[]> {
    const db = await getMongoDb();
    const docs = await db.collection<PageDocument>(pagesCollection).find().sort({ createdAt: -1 }).toArray();
    
    return Promise.all(docs.map(async doc => {
      const pageId = doc.id;
      const slugLinks = await db.collection<PageSlugDocument>("cms_page_slugs").find({ pageId }).toArray();
      const slugIds = slugLinks.map(link => link.slugId);
      const slugs = await db.collection<SlugDocument>(slugsCollection).find({ id: { $in: slugIds } }).toArray();

      return {
        id: pageId,
        name: doc.name,
        status: doc.status || "draft",
        publishedAt: doc.publishedAt?.toISOString(),
        seoTitle: doc.seoTitle ?? undefined,
        seoDescription: doc.seoDescription ?? undefined,
        seoOgImage: doc.seoOgImage ?? undefined,
        seoCanonical: doc.seoCanonical ?? undefined,
        robotsMeta: doc.robotsMeta ?? "index,follow",
        components: doc.components || [],
        slugs: slugs.map(s => ({ slug: { slug: s.slug } })),
      } as Page;
    }));
  },

  async getPageById(id: string): Promise<Page | null> {
    const db = await getMongoDb();
    const doc = await db.collection<PageDocument>(pagesCollection).findOne(buildIdFilter<PageDocument>(id));
    if (!doc) return null;

    const pageId = doc.id;
    const slugLinks = await db.collection<PageSlugDocument>("cms_page_slugs").find({ pageId }).toArray();
    const slugIds = slugLinks.map(link => link.slugId);
    const slugs = await db.collection<SlugDocument>(slugsCollection).find({ id: { $in: slugIds } }).toArray();

    return {
      id: pageId,
      name: doc.name,
      status: doc.status || "draft",
      publishedAt: doc.publishedAt?.toISOString(),
      seoTitle: doc.seoTitle ?? undefined,
      seoDescription: doc.seoDescription ?? undefined,
      seoOgImage: doc.seoOgImage ?? undefined,
      seoCanonical: doc.seoCanonical ?? undefined,
      robotsMeta: doc.robotsMeta ?? "index,follow",
      components: doc.components || [],
      slugs: slugs.map(s => ({ slug: { slug: s.slug } })),
    } as Page;
  },

  async getPageBySlug(slugValue: string): Promise<Page | null> {
    const db = await getMongoDb();
    const slugDoc = await db.collection<SlugDocument>(slugsCollection).findOne({ slug: slugValue });
    if (!slugDoc) return null;
    const pageSlug = await db.collection<PageSlugDocument>("cms_page_slugs").findOne({ slugId: slugDoc.id });
    if (!pageSlug) return null;
    return this.getPageById(pageSlug.pageId);
  },

  async createPage(data: { name: string }): Promise<Page> {
    const db = await getMongoDb();
    const id = randomUUID();
    const doc: PageDocument = {
      id,
      name: data.name,
      status: "draft",
      components: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection<PageDocument>(pagesCollection).insertOne(doc);
    return { id, name: doc.name, status: "draft", components: [] } as Page;
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
      components: data.components,
      updatedAt: new Date(),
    }) as Partial<PageDocument>;

    const result = await db.collection<PageDocument>(pagesCollection).findOneAndUpdate(
      buildIdFilter<PageDocument>(id),
      { $set: update },
      { returnDocument: "after" }
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
    await db.collection("cms_page_slugs").deleteMany({ pageId: id });

    return {
      id: deleted.id,
      name: deleted.name,
      components: deleted.components || [],
    } as Page;
  },

  async replacePageSlugs(pageId: string, slugIds: string[]): Promise<void> {
    const db = await getMongoDb();
    await db.collection("cms_page_slugs").deleteMany({ pageId });
    if (slugIds.length === 0) return;
    await db.collection<PageSlugDocument>("cms_page_slugs").insertMany(
      slugIds.map((slugId) => ({ pageId, slugId, assignedAt: new Date() }))
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
    return docs.map(doc => ({
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
      { returnDocument: "after" }
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
    await db.collection("cms_page_slugs").deleteMany({ slugId: id });

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
    await db.collection("cms_page_slugs").updateOne(
      { pageId, slugId },
      { $set: { pageId, slugId, assignedAt: new Date() } },
      { upsert: true }
    );
  },

  async removeSlugFromPage(pageId: string, slugId: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection("cms_page_slugs").deleteOne({ pageId, slugId });
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
      customCss: doc.customCss ?? undefined,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    })) as CmsTheme[];
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
      customCss: doc.customCss ?? undefined,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    } as CmsTheme;
  },

  async createTheme(data: CmsThemeCreateInput): Promise<CmsTheme> {
    const db = await getMongoDb();
    const id = randomUUID();
    const doc: ThemeDocument = {
      id,
      name: data.name,
      colors: data.colors as Record<string, string>,
      typography: data.typography as Record<string, unknown>,
      spacing: data.spacing as Record<string, string>,
      customCss: data.customCss ?? null,
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
      customCss: doc.customCss ?? undefined,
    } as CmsTheme;
  },

  async updateTheme(id: string, data: CmsThemeUpdateInput): Promise<CmsTheme | null> {
    const db = await getMongoDb();
    const update = removeUndefined({
      name: data.name,
      colors: data.colors as Record<string, string> | undefined,
      typography: data.typography as Record<string, unknown> | undefined,
      spacing: data.spacing as Record<string, string> | undefined,
      customCss: data.customCss,
      updatedAt: new Date(),
    }) as Partial<ThemeDocument>;

    const result = await db.collection<ThemeDocument>(themesCollection).findOneAndUpdate(
      buildIdFilter<ThemeDocument>(id),
      { $set: update },
      { returnDocument: "after" }
    );
    if (!result) return null;
    return {
      id: result.id,
      name: result.name,
      colors: result.colors,
      typography: result.typography,
      spacing: result.spacing,
      customCss: result.customCss ?? undefined,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    } as CmsTheme;
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
      customCss: doc.customCss ?? undefined,
    } as CmsTheme;
  },
};
