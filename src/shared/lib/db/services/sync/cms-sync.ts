import { ObjectId } from 'mongodb';

import type { DatabaseSyncHandler } from './types';
import type { Prisma } from '@prisma/client';

export const syncCmsSlugs: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = await mongo.collection('cms_slugs').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.SlugCreateManyInput | null => {
      const id = normalizeId(doc);
      if (!id) return null;
      return {
        id,
        slug: (doc.slug as string) ?? '',
        isDefault: Boolean(doc.isDefault),
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is Prisma.SlugCreateManyInput => item !== null);
  const deleted = await prisma.slug.deleteMany();
  const created = data.length ? await prisma.slug.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncCmsThemes: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = await mongo.collection('cms_themes').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.CmsThemeCreateManyInput | null => {
      const id = normalizeId(doc);
      if (!id) return null;
      return {
        id,
        name: (doc.name as string) ?? id,
        colors: (doc.colors ?? {}) as Prisma.InputJsonValue,
        typography: (doc.typography ?? {}) as Prisma.InputJsonValue,
        spacing: (doc.spacing ?? {}) as Prisma.InputJsonValue,
        customCss: (doc.customCss as string | null) ?? null,
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is Prisma.CmsThemeCreateManyInput => item !== null);
  const deleted = await prisma.cmsTheme.deleteMany();
  const created = data.length ? await prisma.cmsTheme.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncCmsPages: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const docs = await mongo.collection('cms_pages').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>) => {
      const id = normalizeId(doc);
      if (!id) return null;
      return {
        id,
        name: (doc.name as string) ?? id,
        status: (doc.status as string) ?? 'draft',
        publishedAt: toDate(doc.publishedAt as Date | string | null),
        seoTitle: (doc.seoTitle as string | null) ?? null,
        seoDescription: (doc.seoDescription as string | null) ?? null,
        seoOgImage: (doc.seoOgImage as string | null) ?? null,
        seoCanonical: (doc.seoCanonical as string | null) ?? null,
        robotsMeta: (doc.robotsMeta as string | null) ?? null,
        themeId: (doc.themeId as string | null) ?? null,
        showMenu: (doc.showMenu as boolean | null) ?? true,
        components: Array.isArray(doc.components)
          ? (doc.components as Array<{ type: string; content: Record<string, unknown> }>)
          : [],
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  await prisma.pageComponent.deleteMany();
  const deleted = await prisma.page.deleteMany();
  const created = data.length
    ? await prisma.page.createMany({
      data: data.map(
        ({ components: _components, ...rest }) => rest
      ) as Prisma.PageCreateManyInput[],
    })
    : { count: 0 };

  const componentRows = data.flatMap((page) =>
    page.components.map((component, index) => ({
      id: `${page.id}-${index}`,
      pageId: page.id,
      type: component.type,
      order: index,
      content: (component.content ?? {}) as Prisma.InputJsonValue,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    }))
  ) as Prisma.PageComponentCreateManyInput[];
  if (componentRows.length) {
    await prisma.pageComponent.createMany({ data: componentRows });
  }

  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncCmsPageSlugs: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const docs = await mongo.collection('cms_page_slugs').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.PageSlugCreateManyInput | null => {
      const pageId = doc.pageId as string;
      const slugId = doc.slugId as string;
      if (!pageId || !slugId) return null;
      return {
        pageId,
        slugId,
        assignedAt: (doc.assignedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is Prisma.PageSlugCreateManyInput => item !== null);
  const deleted = await prisma.pageSlug.deleteMany();
  const created = data.length ? await prisma.pageSlug.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncCmsDomains: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = await mongo.collection('cms_domains').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.CmsDomainCreateManyInput | null => {
      const id = normalizeId(doc);
      if (!id) return null;
      return {
        id,
        domain: (doc.domain as string) ?? '',
        aliasOf: (doc.aliasOf as string | null) ?? null,
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is Prisma.CmsDomainCreateManyInput => item !== null);
  const deleted = await prisma.cmsDomain.deleteMany();
  const created = data.length ? await prisma.cmsDomain.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncCmsDomainSlugs: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const docs = await mongo.collection('cms_domain_slugs').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.CmsDomainSlugCreateManyInput | null => {
      const domainId = doc.domainId as string;
      const slugId = doc.slugId as string;
      if (!domainId || !slugId) return null;
      return {
        domainId,
        slugId,
        assignedAt: (doc.assignedAt as Date) ?? new Date(),
        isDefault: Boolean(doc.isDefault),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is Prisma.CmsDomainSlugCreateManyInput => item !== null);
  const deleted = await prisma.cmsDomainSlug.deleteMany();
  const created = data.length ? await prisma.cmsDomainSlug.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncCmsSlugsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.slug.findMany();
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    slug: row.slug,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('cms_slugs');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncCmsThemesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.cmsTheme.findMany();
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    colors: row.colors ?? {},
    typography: row.typography ?? {},
    spacing: row.spacing ?? {},
    customCss: row.customCss ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('cms_themes');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncCmsPagesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.page.findMany({ include: { components: true } });
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    status: row.status,
    publishedAt: row.publishedAt ?? null,
    seoTitle: row.seoTitle ?? null,
    seoDescription: row.seoDescription ?? null,
    seoOgImage: row.seoOgImage ?? null,
    seoCanonical: row.seoCanonical ?? null,
    robotsMeta: row.robotsMeta ?? null,
    themeId: row.themeId ?? null,
    showMenu: row.showMenu ?? true,
    components: row.components
      .sort((a, b) => a.order - b.order)
      .map((component) => ({
        type: component.type,
        content: (component.content as Record<string, unknown>) ?? {},
      })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('cms_pages');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncCmsPageSlugsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.pageSlug.findMany();
  const docs = rows.map((row) => ({
    pageId: row.pageId,
    slugId: row.slugId,
    assignedAt: row.assignedAt,
  }));
  const collection = mongo.collection('cms_page_slugs');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncCmsDomainsPrismaToMongo: DatabaseSyncHandler = async ({
  mongo,
  prisma,
  toObjectIdMaybe,
}) => {
  const rows = await prisma.cmsDomain.findMany();
  const docs = rows.map((row) => ({
    _id: toObjectIdMaybe(row.id),
    id: row.id,
    domain: row.domain,
    aliasOf: row.aliasOf ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('cms_domains');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncCmsDomainSlugsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.cmsDomainSlug.findMany();
  const docs = rows.map((row) => ({
    _id: new ObjectId(),
    domainId: row.domainId,
    slugId: row.slugId,
    assignedAt: row.assignedAt,
    isDefault: row.isDefault,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('cms_domain_slugs');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
