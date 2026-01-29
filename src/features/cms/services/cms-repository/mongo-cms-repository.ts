import "server-only";

import { randomUUID } from "crypto";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import type { Filter } from "mongodb";
import { ObjectId } from "mongodb";
import type { CmsRepository } from "../../types/services/cms-repository";
import type { Block, Page, Slug, PageComponent } from "../../types";

const blocksCollection = "cms_blocks";
const pagesCollection = "cms_pages";
const slugsCollection = "cms_slugs";

interface BlockDocument {
  id: string;
  name: string;
  content: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface PageDocument {
  id: string;
  name: string;
  components: PageComponent[];
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
  // Blocks
  async getBlocks(): Promise<Block[]> {
    const db = await getMongoDb();
    const docs = await db.collection<BlockDocument>(blocksCollection).find().sort({ createdAt: -1 }).toArray();
    return docs.map(doc => ({
      id: doc.id,
      name: doc.name,
      content: doc.content,
    })) as Block[];
  },

  async getBlockById(id: string): Promise<Block | null> {
    const db = await getMongoDb();
    const doc = await db.collection<BlockDocument>(blocksCollection).findOne(buildIdFilter<BlockDocument>(id));
    if (!doc) return null;
    return {
      id: doc.id,
      name: doc.name,
      content: doc.content,
    } as Block;
  },

  async getBlockByName(name: string): Promise<Block | null> {
    const db = await getMongoDb();
    const doc = await db.collection<BlockDocument>(blocksCollection).findOne({ name });
    if (!doc) return null;
    return {
      id: doc.id,
      name: doc.name,
      content: doc.content,
    } as Block;
  },

  async createBlock(data: { name: string; content: unknown }): Promise<Block> {
    const db = await getMongoDb();
    const id = randomUUID();
    const doc: BlockDocument = {
      id,
      name: data.name,
      content: data.content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection<BlockDocument>(blocksCollection).insertOne(doc);
    return { id, name: doc.name, content: doc.content } as Block;
  },

  async updateBlock(id: string, data: { name?: string | undefined; content?: unknown }): Promise<Block | null> {
    const db = await getMongoDb();
    const update: Partial<BlockDocument> = removeUndefined({
      name: data.name,
      content: data.content,
      updatedAt: new Date(),
    });

    const result = await db.collection<BlockDocument>(blocksCollection).findOneAndUpdate(
      buildIdFilter<BlockDocument>(id),
      { $set: update },
      { returnDocument: "after" }
    );
    if (!result) return null;
    const doc = result;
    return {
      id: doc.id,
      name: doc.name,
      content: doc.content,
    } as Block;
  },

  async deleteBlock(id: string): Promise<Block | null> {
    const db = await getMongoDb();
    const doc = await db.collection<BlockDocument>(blocksCollection).findOneAndDelete(buildIdFilter<BlockDocument>(id));
    if (!doc) return null;
    const deleted = doc;
    return {
      id: deleted.id,
      name: deleted.name,
      content: deleted.content,
    } as Block;
  },

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
      components: doc.components || [],
      slugs: slugs.map(s => ({ slug: { slug: s.slug } })),
    } as Page;
  },

  async createPage(data: { name: string }): Promise<Page> {
    const db = await getMongoDb();
    const id = randomUUID();
    const doc: PageDocument = {
      id,
      name: data.name,
      components: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection<PageDocument>(pagesCollection).insertOne(doc);
    return { id, name: doc.name, components: [] } as Page;
  },

  async updatePage(id: string, data: { name?: string | undefined; components?: PageComponent[] | undefined }): Promise<Page | null> {
    const db = await getMongoDb();
    const update: Partial<PageDocument> = removeUndefined({
      name: data.name,
      components: data.components,
      updatedAt: new Date(),
    });

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
    await db.collection("cms_page_blocks").deleteMany({ pageId: id });

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
    const update: Partial<SlugDocument> = removeUndefined({
      slug: data.slug,
      isDefault: data.isDefault,
      updatedAt: new Date(),
    });

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

  async addBlockToPage(pageId: string, blockId: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection("cms_page_blocks").updateOne(
      { pageId, blockId },
      { $set: { pageId, blockId, assignedAt: new Date() } },
      { upsert: true }
    );
  },

  async removeBlockFromPage(pageId: string, blockId: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection("cms_page_blocks").deleteOne({ pageId, blockId });
  },
};
