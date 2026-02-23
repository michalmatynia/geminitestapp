import { ObjectId } from 'mongodb';
import type { Prisma } from '@prisma/client';
import type { SyncHandler } from './types';

export const syncCmsSlugs: SyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = await mongo.collection('cms_slugs').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.SlugCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        slug: (doc as { slug?: string }).slug ?? '',
        isDefault: Boolean((doc as { isDefault?: boolean }).isDefault),
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.SlugCreateManyInput => item !== null);
  const deleted = await prisma.slug.deleteMany();
  const created = data.length ? await prisma.slug.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncCmsThemes: SyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = await mongo.collection('cms_themes').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.CmsThemeCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        name: (doc as { name?: string }).name ?? id,
        colors: ((doc as { colors?: unknown }).colors ?? {}) as Prisma.InputJsonValue,
        typography: ((doc as { typography?: unknown }).typography ?? {}) as Prisma.InputJsonValue,
        spacing: ((doc as { spacing?: unknown }).spacing ?? {}) as Prisma.InputJsonValue,
        customCss: (doc as { customCss?: string | null }).customCss ?? null,
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.CmsThemeCreateManyInput => item !== null);
  const deleted = await prisma.cmsTheme.deleteMany();
  const created = data.length ? await prisma.cmsTheme.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncCmsPages: SyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const docs = await mongo.collection('cms_pages').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>) => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        name: (doc as { name?: string }).name ?? id,
        status: (doc as { status?: string }).status ?? 'draft',
        publishedAt: toDate((doc as { publishedAt?: Date | string | null }).publishedAt),
        seoTitle: (doc as { seoTitle?: string | null }).seoTitle ?? null,
        seoDescription: (doc as { seoDescription?: string | null }).seoDescription ?? null,
        seoOgImage: (doc as { seoOgImage?: string | null }).seoOgImage ?? null,
        seoCanonical: (doc as { seoCanonical?: string | null }).seoCanonical ?? null,
        robotsMeta: (doc as { robotsMeta?: string | null }).robotsMeta ?? null,
        themeId: (doc as { themeId?: string | null }).themeId ?? null,
        showMenu: (doc as { showMenu?: boolean | null }).showMenu ?? true,
        components: Array.isArray((doc as { components?: unknown[] }).components)
          ? (doc as { components?: Array<{ type: string; content: Record<string, unknown> }> }).components ?? []
          : [],
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  await prisma.pageComponent.deleteMany();
  const deleted = await prisma.page.deleteMany();
  const created = data.length
    ? await prisma.page.createMany({
      data: data.map(({ components: _components, ...rest }) => rest) as Prisma.PageCreateManyInput[],
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

export const syncCmsPageSlugs: SyncHandler = async ({ mongo, prisma }) => {
  const docs = await mongo.collection('cms_page_slugs').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.PageSlugCreateManyInput | null => {
      const pageId = (doc as { pageId?: string }).pageId;
      const slugId = (doc as { slugId?: string }).slugId;
      if (!pageId || !slugId) return null;
      return {
        pageId,
        slugId,
        assignedAt: (doc as { assignedAt?: Date }).assignedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.PageSlugCreateManyInput => item !== null);
  const deleted = await prisma.pageSlug.deleteMany();
  const created = data.length ? await prisma.pageSlug.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncCmsDomains: SyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = await mongo.collection('cms_domains').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.CmsDomainCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        domain: (doc as { domain?: string }).domain ?? '',
        aliasOf: (doc as { aliasOf?: string | null }).aliasOf ?? null,
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.CmsDomainCreateManyInput => item !== null);
  const deleted = await prisma.cmsDomain.deleteMany();
  const created = data.length ? await prisma.cmsDomain.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncCmsDomainSlugs: SyncHandler = async ({ mongo, prisma }) => {
  const docs = await mongo.collection('cms_domain_slugs').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.CmsDomainSlugCreateManyInput | null => {
      const domainId = (doc as { domainId?: string }).domainId;
      const slugId = (doc as { slugId?: string }).slugId;
      if (!domainId || !slugId) return null;
      return {
        domainId,
        slugId,
        assignedAt: (doc as { assignedAt?: Date }).assignedAt ?? new Date(),
        isDefault: Boolean((doc as { isDefault?: boolean }).isDefault),
        updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.CmsDomainSlugCreateManyInput => item !== null);
  const deleted = await prisma.cmsDomainSlug.deleteMany();
  const created = data.length ? await prisma.cmsDomainSlug.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncCmsSlugsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
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
  return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
};

export const syncCmsThemesPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
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
  return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
};

export const syncCmsPagesPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
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
      .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
      .map((component: { type: string; content: unknown }) => ({
        type: component.type,
        content: component.content ?? {},
      })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('cms_pages');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
};

export const syncCmsPageSlugsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.pageSlug.findMany();
  const docs = rows.map((row) => ({
    pageId: row.pageId,
    slugId: row.slugId,
    assignedAt: row.assignedAt,
  }));
  const collection = mongo.collection('cms_page_slugs');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
};

export const syncCmsDomainsPrismaToMongo: SyncHandler = async ({ mongo, prisma, toObjectIdMaybe }) => {
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
  return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
};

export const syncCmsDomainSlugsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
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
  return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
};
