/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import 'server-only';

import { operationFailedError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import { normalizeId, toDate, toJsonValue, toObjectIdMaybe } from './sync-utils';

import type { DatabaseSyncCollectionResult, DatabaseSyncDirection } from './database-sync';

// ── Types ──

type SyncResult = { sourceCount: number; targetDeleted: number; targetInserted: number; warnings?: string[] };

type CollectionHandler = {
  mongoToPrisma: () => Promise<SyncResult>;
  prismaToMongo: () => Promise<SyncResult>;
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
      .map((doc: any) => {
        const id = normalizeId(doc);
        if (!id) return null;
        const json = toJsonValue(doc);
        delete json._id;
        json.id = id;
        return json;
      })
      .filter(Boolean);

    const key = prismaModelName.charAt(0).toLowerCase() + prismaModelName.slice(1);
    const model = (prisma as any)[key];
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
    const model = (prisma as any)[key];
    if (!model) {
      return { sourceCount: 0, targetDeleted: 0, targetInserted: 0, warnings: [`Prisma model "${prismaModelName}" not found`] };
    }

    const rows = await model.findMany();
    const docs = rows.map((row: any) => {
      const doc: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
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
    if (docs.length) await collection.insertMany(docs as any[]);
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
      const key = (doc as any).key ?? (doc as any)._id?.toString() ?? '';
      if (!key) continue;
      const value = (doc as any).value;
      const entry = {
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value ?? ''),
        createdAt: toDate((doc as any).createdAt) ?? new Date(),
        updatedAt: toDate((doc as any).updatedAt) ?? new Date(),
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
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  },
};

const usersHandler: CollectionHandler = {
  async mongoToPrisma() {
    const mongo = await getMongoDb();
    const docs = await mongo.collection('users').find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc);
        if (!id) return null;
        return {
          id,
          name: doc.name ?? null,
          email: doc.email ?? null,
          emailVerified: toDate(doc.emailVerified),
          image: doc.image ?? null,
          passwordHash: doc.passwordHash ?? null,
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
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  },
};

// ── Handler Registry ──

// Maps collection names to their specialized handlers.
// Collections not listed here use the generic handler with a
// best-effort approach of converting ObjectId<->string and Date<->ISO.

const SPECIALIZED_HANDLERS: Record<string, CollectionHandler> = {
  settings: settingsHandler,
  users: usersHandler,
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
  product_categories: 'Category',
  product_tags: 'Tag',
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
    return {
      name: collectionName,
      status: 'failed',
      sourceCount: 0,
      targetDeleted: 0,
      targetInserted: 0,
      error: error instanceof Error ? error.message : 'Copy failed.',
    };
  }
}
