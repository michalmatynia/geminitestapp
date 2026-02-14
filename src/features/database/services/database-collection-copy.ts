import 'server-only';

import { Prisma } from '@prisma/client';

import { ErrorSystem } from '@/features/observability/server';
import { operationFailedError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import { normalizeId, toDate, toJsonValue, toObjectIdMaybe } from './sync-utils';

import type { DatabaseSyncCollectionResult, DatabaseSyncDirection } from './database-sync';

// ── Types ──

type SyncResult = { sourceCount: number; targetDeleted: number; targetInserted: number; warnings?: string[] };

type PrismaModel = {
  findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
  deleteMany: (args?: unknown) => Promise<{ count: number }>;
  createMany: (args: { data: unknown[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
};

type CollectionHandler = {
  mongoToPrisma: () => Promise<SyncResult>;
  prismaToMongo: () => Promise<SyncResult>;
};

const AI_PATHS_KEY_PREFIX = 'ai_paths_';
const AI_PATHS_LEGACY_PREFIX = 'ai_paths_store:';
const AI_PATHS_LEGACY_KEY_PREFIX = `${AI_PATHS_LEGACY_PREFIX}${AI_PATHS_KEY_PREFIX}`;

const normalizeAiPathsKey = (key: string | null | undefined): string | null => {
  if (typeof key !== 'string' || key.length === 0) return null;
  if (key.startsWith(AI_PATHS_LEGACY_PREFIX)) {
    const normalized = key.slice(AI_PATHS_LEGACY_PREFIX.length);
    return normalized.startsWith(AI_PATHS_KEY_PREFIX) ? normalized : null;
  }
  return key.startsWith(AI_PATHS_KEY_PREFIX) ? key : null;
};

// ── Generic fallback ──

/**
 * Generic copy handler for collections without custom type mapping.
 * - mongo_to_prisma: reads from Mongo, converts ObjectId/Date to JSON, inserts via Prisma createMany
 * - prisma_to_mongo: reads from Prisma, inserts into Mongo with toObjectIdMaybe on id fields
 */
const genericHandler = (mongoCollectionName: string, prismaModelName: string): CollectionHandler => ({
  async mongoToPrisma(): Promise<SyncResult> {
    const mongo = await getMongoDb();
    const docs = await mongo.collection(mongoCollectionName).find({}).toArray();

    const data = docs
      .map((doc: Record<string, unknown>) => {
        const id = normalizeId(doc);
        if (!id) return null;
        const json = toJsonValue(doc) as Record<string, unknown>;
        delete json['_id'];
        json['id'] = id;
        return json;
      })
      .filter(Boolean);

    const key = prismaModelName.charAt(0).toLowerCase() + prismaModelName.slice(1);
    const model = (prisma as unknown as Record<string, PrismaModel>)[key];
    if (!model) {
      return { sourceCount: docs.length, targetDeleted: 0, targetInserted: 0, warnings: [`Prisma model "${prismaModelName}" not found`] };
    }

    const deleted = await model.deleteMany();
    const created = data.length ? await model.createMany({ data, skipDuplicates: true }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  },

  async prismaToMongo(): Promise<SyncResult> {
    const mongo = await getMongoDb();
    const key = prismaModelName.charAt(0).toLowerCase() + prismaModelName.slice(1);
    const model = (prisma as unknown as Record<string, PrismaModel>)[key];
    if (!model) {
      return { sourceCount: 0, targetDeleted: 0, targetInserted: 0, warnings: [`Prisma model "${prismaModelName}" not found`] };
    }

    const rows = await model.findMany();
    const docs = rows.map((row: Record<string, unknown>) => {
      const doc: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (k === 'id') {
          doc['_id'] = toObjectIdMaybe(v as string);
          doc['id'] = v;
        } else {
          doc[k] = v;
        }
      }
      return doc;
    });

    const collection = mongo.collection(mongoCollectionName);
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  },
});

// ── Specialized handlers for collections with complex type mappings ──

const settingsHandler: CollectionHandler = {
  async mongoToPrisma() {
    const mongo = await getMongoDb();
    const docs = await mongo.collection('settings').find({}).toArray();
    const byKey = new Map<string, { key: string; value: string; createdAt: Date; updatedAt: Date }>();
    for (const doc of docs) {
      const typedDoc = doc as Record<string, unknown>;
      const key = (typedDoc['key'] as string | undefined) ?? typedDoc['_id']?.toString() ?? '';
      if (!key) continue;
      const value = typedDoc['value'];
      const entry = {
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value ?? ''),
        createdAt: toDate(typedDoc['createdAt']) ?? new Date(),
        updatedAt: toDate(typedDoc['updatedAt']) ?? new Date(),
      };
      const existing = byKey.get(key);
      if (!existing || entry.updatedAt > existing.updatedAt) {
        byKey.set(key, entry);
      }
    }
    const data = Array.from(byKey.values());
    const deleted = await prisma.setting.deleteMany();
    const created = data.length ? await prisma.setting.createMany({ data, skipDuplicates: true }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  },
  async prismaToMongo() {
    const mongo = await getMongoDb();
    const rows = await prisma.setting.findMany();
    const docs = rows.map((row) => ({
      _id: row.key,
      key: row.key,
      value: row.value,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('settings');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  },
};

const aiPathsSettingsHandler: CollectionHandler = {
  async mongoToPrisma() {
    const mongo = await getMongoDb();
    const docs = await mongo.collection('ai_paths_settings').find({}).toArray();
    const normalized = docs
      .map((doc: Record<string, unknown>) => {
        const key = normalizeAiPathsKey(typeof doc['key'] === 'string' ? doc['key'] : null);
        const value = doc['value'];
        if (!key || typeof value !== 'string') return null;
        return {
          key: `${AI_PATHS_LEGACY_PREFIX}${key}`,
          value,
          createdAt: toDate(doc['createdAt']) ?? new Date(),
          updatedAt: toDate(doc['updatedAt']) ?? new Date(),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const deleted = await prisma.setting.deleteMany({
      where: {
        OR: [
          { key: { startsWith: AI_PATHS_LEGACY_KEY_PREFIX } },
          { key: { startsWith: AI_PATHS_KEY_PREFIX } },
        ],
      },
    });
    const created = normalized.length
      ? await prisma.setting.createMany({ data: normalized, skipDuplicates: true })
      : { count: 0 };
    return {
      sourceCount: normalized.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
    };
  },
  async prismaToMongo() {
    const mongo = await getMongoDb();
    const rows = await prisma.setting.findMany({
      where: {
        OR: [
          { key: { startsWith: AI_PATHS_LEGACY_KEY_PREFIX } },
          { key: { startsWith: AI_PATHS_KEY_PREFIX } },
        ],
      },
    });

    const byKey = new Map<
      string,
      { key: string; value: string; createdAt: Date; updatedAt: Date }
    >();

    rows.forEach((row) => {
      const normalizedKey = normalizeAiPathsKey(row.key);
      if (!normalizedKey) return;
      const next = {
        key: normalizedKey,
        value: row.value,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
      const existing = byKey.get(normalizedKey);
      if (!existing || next.updatedAt > existing.updatedAt) {
        byKey.set(normalizedKey, next);
      }
    });

    const docs = Array.from(byKey.values()).map((row) => ({
      _id: row.key,
      key: row.key,
      value: row.value,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    const collection = mongo.collection('ai_paths_settings');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
    return {
      sourceCount: byKey.size,
      targetDeleted: deleted.deletedCount ?? 0,
      targetInserted: docs.length,
    };
  },
};

const usersHandler: CollectionHandler = {
  async mongoToPrisma() {
    const mongo = await getMongoDb();
    const docs = await mongo.collection('users').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>) => {
        const id = normalizeId(doc);
        if (!id) return null;
        return {
          id,
          name: (doc['name'] as string | null) ?? null,
          email: (doc['email'] as string | null) ?? null,
          emailVerified: toDate(doc['emailVerified']),
          image: (doc['image'] as string | null) ?? null,
          passwordHash: (doc['passwordHash'] as string | null) ?? null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    const deleted = await prisma.user.deleteMany();
    const created = data.length ? await prisma.user.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  },
  async prismaToMongo() {
    const mongo = await getMongoDb();
    const rows = await prisma.user.findMany();
    const docs = rows.map((row) => ({
      _id: toObjectIdMaybe(row.id),
      id: row.id,
      name: row.name,
      email: row.email,
      emailVerified: row.emailVerified,
      image: row.image,
      passwordHash: row.passwordHash,
    }));
    const collection = mongo.collection('users');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  },
};

const productsGenericHandler = genericHandler('products', 'Product');

const productsHandler: CollectionHandler = {
  async mongoToPrisma() {
    return productsGenericHandler.mongoToPrisma();
  },
  async prismaToMongo() {
    const rows = await prisma.product.findMany({
      include: {
        images: {
          include: { imageFile: true },
          orderBy: { assignedAt: 'desc' },
        },
        catalogs: {
          include: {
            catalog: {
              include: { languages: { select: { languageId: true } } },
            },
          },
        },
        categories: { select: { categoryId: true } },
        tags: { select: { tagId: true } },
        producers: { select: { producerId: true } },
      },
    });

    type PrismaProductRow = Prisma.ProductGetPayload<{
      include: {
        images: { include: { imageFile: true } };
        catalogs: { include: { catalog: { include: { languages: { select: { languageId: true } } } } } };
        categories: { select: { categoryId: true } };
        tags: { select: { tagId: true } };
        producers: { select: { producerId: true } };
      };
    }>;

    const docs = rows.map((row: PrismaProductRow) => {
      const categoryId = row.categories?.categoryId ?? null;
      const categories = categoryId
        ? [{ productId: row.id, categoryId, assignedAt: row.updatedAt ?? row.createdAt }]
        : [];
      const images = row.images
        .filter((image) => image?.imageFile)
        .map((image) => ({
          productId: row.id,
          imageFileId: image.imageFileId,
          assignedAt: image.assignedAt,
          imageFile: {
            id: image.imageFile.id,
            filename: image.imageFile.filename,
            filepath: image.imageFile.filepath,
            mimetype: image.imageFile.mimetype,
            size: image.imageFile.size,
            width: image.imageFile.width ?? null,
            height: image.imageFile.height ?? null,
            tags: Array.isArray(image.imageFile.tags) ? image.imageFile.tags : [],
            createdAt: image.imageFile.createdAt,
            updatedAt: image.imageFile.updatedAt,
          },
        }));
      const catalogs = row.catalogs
        .filter((entry) => entry?.catalog)
        .map((entry) => ({
          productId: row.id,
          catalogId: entry.catalogId,
          assignedAt: entry.assignedAt,
          catalog: {
            id: entry.catalog.id,
            name: entry.catalog.name,
            description: entry.catalog.description ?? null,
            isDefault: entry.catalog.isDefault,
            defaultLanguageId: entry.catalog.defaultLanguageId ?? null,
            defaultPriceGroupId: entry.catalog.defaultPriceGroupId ?? null,
            languageIds: entry.catalog.languages
              .map((languageEntry) => languageEntry?.languageId)
              .filter(Boolean),
            priceGroupIds: Array.isArray(entry.catalog.priceGroupIds)
              ? entry.catalog.priceGroupIds
              : [],
            createdAt: entry.catalog.createdAt,
            updatedAt: entry.catalog.updatedAt,
          },
        }));

      return {
        _id: row.id,
        id: row.id,
        sku: row.sku ?? null,
        baseProductId: row.baseProductId ?? null,
        defaultPriceGroupId: row.defaultPriceGroupId ?? null,
        ean: row.ean ?? null,
        gtin: row.gtin ?? null,
        asin: row.asin ?? null,
        name_en: row.name_en ?? null,
        name_pl: row.name_pl ?? null,
        name_de: row.name_de ?? null,
        description_en: row.description_en ?? null,
        description_pl: row.description_pl ?? null,
        description_de: row.description_de ?? null,
        supplierName: row.supplierName ?? null,
        supplierLink: row.supplierLink ?? null,
        priceComment: row.priceComment ?? null,
        stock: row.stock ?? null,
        price: row.price ?? null,
        sizeLength: row.sizeLength ?? null,
        sizeWidth: row.sizeWidth ?? null,
        weight: row.weight ?? null,
        length: row.length ?? null,
        parameters: Array.isArray(row.parameters) ? row.parameters : [],
        imageLinks: Array.isArray(row.imageLinks) ? row.imageLinks : [],
        imageBase64s: Array.isArray(row.imageBase64s) ? row.imageBase64s : [],
        noteIds: Array.isArray(row.noteIds) ? row.noteIds : [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        categoryId,
        categories,
        images,
        catalogs,
        tags: row.tags.map((tag) => ({ tagId: tag.tagId })),
        producers: row.producers.map((producer) => ({ producerId: producer.producerId })),
      };
    });

    const mongo = await getMongoDb();
    const collection = mongo.collection('products');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  },
};

// ── Handler Registry ──

// Maps collection names to their specialized handlers.
// Collections not listed here use the generic handler with a
// best-effort approach of converting ObjectId<->string and Date<->ISO.

const SPECIALIZED_HANDLERS: Record<string, CollectionHandler> = {
  settings: settingsHandler,
  ai_paths_settings: aiPathsSettingsHandler,
  users: usersHandler,
  products: productsHandler,
};

// Known collection name <-> Prisma model mappings for the generic handler
const COLLECTION_MODEL_MAP: Record<string, string> = {
  accounts: 'Account',
  sessions: 'Session',
  verification_tokens: 'VerificationToken',
  auth_security_profiles: 'AuthSecurityProfile',
  auth_login_challenges: 'AuthLoginChallenge',
  auth_security_attempts: 'AuthSecurityAttempt',
  user_preferences: 'UserPreferences',
  system_logs: 'SystemLog',
  file_upload_events: 'FileUploadEvent',
  ai_configurations: 'AiConfiguration',
  chatbot_sessions: 'ChatbotSession',
  chatbot_jobs: 'ChatbotJob',
  currencies: 'Currency',
  countries: 'Country',
  languages: 'Language',
  price_groups: 'PriceGroup',
  catalogs: 'Catalog',
  product_categories: 'ProductCategory',
  product_tags: 'ProductTag',
  product_parameters: 'ProductParameter',
  product_producers: 'Producer',
  image_files: 'ImageFile',
  image_studio_slots: 'ImageStudioSlot',
  products: 'Product',
  integrations: 'Integration',
  integration_connections: 'IntegrationConnection',
  product_listings: 'ProductListing',
  product_drafts: 'ProductDraft',
  cms_slugs: 'Slug',
  cms_themes: 'CmsTheme',
  cms_pages: 'CmsPage',
  cms_page_slugs: 'CmsPageSlug',
  cms_domains: 'CmsDomain',
  cms_domain_slugs: 'CmsDomainSlug',
  notebooks: 'Notebook',
  themes: 'Theme',
  tags: 'NoteTag',
  categories: 'NoteCategory',
  notes: 'Note',
  note_files: 'NoteFile',
  product_ai_jobs: 'ProductAiJob',
  ai_path_runs: 'AiPathRun',
  ai_path_run_nodes: 'AiPathRunNode',
  ai_path_run_events: 'AiPathRunEvent',
};

function getHandler(collectionName: string): CollectionHandler | null {
  // Check specialized handlers first
  if (SPECIALIZED_HANDLERS[collectionName]) {
    return SPECIALIZED_HANDLERS[collectionName];
  }

  // Check the generic mapping
  const modelName = COLLECTION_MODEL_MAP[collectionName];
  if (modelName) {
    return genericHandler(collectionName, modelName);
  }

  return null;
}

/** Returns all collection names that can be copied. */
export function getSupportedCollections(): string[] {
  return [
    ...Object.keys(SPECIALIZED_HANDLERS),
    ...Object.keys(COLLECTION_MODEL_MAP),
  ];
}

/**
 * Copies a single collection from one provider to the other.
 * Returns the result of the copy operation.
 */
export async function copyCollection(
  collectionName: string,
  direction: DatabaseSyncDirection
): Promise<DatabaseSyncCollectionResult> {
  if (!process.env['MONGODB_URI']) {
    throw operationFailedError('MongoDB is not configured.');
  }
  if (!process.env['DATABASE_URL']) {
    throw operationFailedError('Prisma database is not configured.');
  }

  const handler = getHandler(collectionName);
  if (!handler) {
    return {
      name: collectionName,
      status: 'skipped',
      sourceCount: 0,
      targetDeleted: 0,
      targetInserted: 0,
      warnings: [`No handler found for collection "${collectionName}". Copy is not supported for this collection.`],
    };
  }

  try {
    const result = direction === 'mongo_to_prisma'
      ? await handler.mongoToPrisma()
      : await handler.prismaToMongo();

    return {
      name: collectionName,
      status: 'completed',
      sourceCount: result.sourceCount,
      targetDeleted: result.targetDeleted,
      targetInserted: result.targetInserted,
      ...(result.warnings?.length ? { warnings: result.warnings } : {}),
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'database-collection-copy',
      action: 'copyCollection',
      collection: collectionName,
      direction,
    });
    throw error;
  }
}
