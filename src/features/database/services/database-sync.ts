import 'server-only';

import {
  Prisma,
} from '@prisma/client';

import { createFullDatabaseBackup } from '@/features/database/services/database-backup';
import {
  AUTH_COLLECTIONS,
  countryCodes,
  currencyCodes,
} from '@/features/database/services/database-sync-types';
import { toObjectIdMaybe, toDate, toJsonValue, normalizeId } from '@/features/database/services/sync-utils';
import { ErrorSystem } from '@/features/observability/server';
import type {
  DatabaseSyncDirection,
  DatabaseSyncCollectionResult,
  DatabaseSyncResult,
  DatabaseSyncOptions,
} from '@/shared/contracts/database';
import { operationFailedError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import {
  syncUsers,
  syncAccounts,
  syncSessions,
  syncVerificationTokens,
  syncAuthSecurityProfiles,
  syncUsersPrismaToMongo,
  syncAccountsPrismaToMongo,
  syncSessionsPrismaToMongo,
  syncVerificationTokensPrismaToMongo,
  syncAuthSecurityProfilesPrismaToMongo,
} from './sync/auth-sync';
import {
  syncChatbotSessions,
  syncChatbotJobs,
  syncChatbotSessionsPrismaToMongo,
  syncChatbotJobsPrismaToMongo,
} from './sync/chatbot-sync';
import {
  syncCurrencies,
  syncCountries,
  syncLanguages,
  syncCurrenciesPrismaToMongo,
  syncCountriesPrismaToMongo,
  syncLanguagesPrismaToMongo,
} from './sync/geo-sync';
import {
  syncPriceGroups,
  syncCatalogs,
  syncProductCategories,
  syncProductTags,
  syncProductProducers,
  syncProductParameters,
  syncPriceGroupsPrismaToMongo,
  syncCatalogsPrismaToMongo,
  syncProductCategoriesPrismaToMongo,
  syncProductTagsPrismaToMongo,
  syncProductProducersPrismaToMongo,
  syncProductParametersPrismaToMongo,
} from './sync/catalog-sync';
import {
  syncCmsSlugs,
  syncCmsThemes,
  syncCmsPages,
  syncCmsPageSlugs,
  syncCmsDomains,
  syncCmsDomainSlugs,
  syncCmsSlugsPrismaToMongo,
  syncCmsThemesPrismaToMongo,
  syncCmsPagesPrismaToMongo,
  syncCmsPageSlugsPrismaToMongo,
  syncCmsDomainsPrismaToMongo,
  syncCmsDomainSlugsPrismaToMongo,
} from './sync/cms-sync';
import {
  syncProductAiJobs,
  syncAiPathRuns,
  syncAiPathRunNodes,
  syncAiPathRunEvents,
  syncProductAiJobsPrismaToMongo,
  syncAiPathRunsPrismaToMongo,
  syncAiPathRunNodesPrismaToMongo,
  syncAiPathRunEventsPrismaToMongo,
} from './sync/ai-sync';
import {
  syncSettings,
  syncUserPreferences,
  syncSystemLogs,
  syncFileUploadEvents,
  syncAiConfigurations,
  syncSettingsPrismaToMongo,
  syncUserPreferencesPrismaToMongo,
  syncSystemLogsPrismaToMongo,
  syncFileUploadEventsPrismaToMongo,
  syncAiConfigurationsPrismaToMongo,
} from './sync/system-sync';
import {
  syncProducts,
  syncProductDrafts,
  syncProductsPrismaToMongo,
  syncProductDraftsPrismaToMongo,
} from './sync/product-sync';
import {
  syncIntegrations,
  syncIntegrationConnections,
  syncProductListings,
  syncIntegrationsPrismaToMongo,
  syncIntegrationConnectionsPrismaToMongo,
  syncProductListingsPrismaToMongo,
} from './sync/integration-sync';
import {
  syncNotebooks,
  syncThemes,
  syncTags,
  syncCategories,
  syncNotes,
  syncNoteFiles,
  syncNotesPrismaToMongo,
  syncNoteFilesPrismaToMongo,
  syncTagsPrismaToMongo,
  syncCategoriesPrismaToMongo,
  syncNotebooksPrismaToMongo,
  syncThemesPrismaToMongo,
} from './sync/notes-sync';
import {
  syncImageFiles,
  syncImageStudioSlots,
  syncImageFilesPrismaToMongo,
  syncImageStudioSlotsPrismaToMongo,
} from './sync/image-sync';
import type { SyncHandlerContext } from './sync/types';


const recordResult = (
  results: DatabaseSyncCollectionResult[],
  result: DatabaseSyncCollectionResult
): void => {
  results.push(result);
};

const listMongoCollections = async (): Promise<string[]> => {
  const mongo = await getMongoDb();
  const collections = await mongo.listCollections().toArray();
  return collections.map((entry: { name: string }) => entry.name);
};

const requireDatabases = (): void => {
  if (!process.env['MONGODB_URI']) {
    throw operationFailedError('MongoDB is not configured.');
  }
  if (!process.env['DATABASE_URL']) {
    throw operationFailedError('Prisma database is not configured.');
  }
};

export async function runDatabaseSync(
  direction: DatabaseSyncDirection,
  options?: DatabaseSyncOptions
): Promise<DatabaseSyncResult> {
  requireDatabases();
  const startedAt = new Date();
  
  try {
    const backups = await createFullDatabaseBackup();
    const collections: DatabaseSyncCollectionResult[] = [];

    if (direction === 'mongo_to_prisma') {
      await syncMongoToPrisma(collections, options);
    } else {
      await syncPrismaToMongo(collections, options);
    }

    return {
      direction,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      backups,
      collections,
    };
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'database-sync',
      direction,
      options,
    });
    throw error;
  }
}

async function syncMongoToPrisma(
  results: DatabaseSyncCollectionResult[],
  options?: DatabaseSyncOptions
): Promise<void> {
  const mongo = await getMongoDb();
  const handledCollections = new Set<string>();
  const noteWarnings: string[] = [];
  const skippedCollections = new Set(options?.skipCollections ?? []);
  if (options?.skipAuthCollections) {
    AUTH_COLLECTIONS.forEach((name: string) => skippedCollections.add(name));
  }

  const syncCollection = async (
    name: string,
    handler: () => Promise<{ sourceCount: number; targetDeleted: number; targetInserted: number; warnings?: string[] }>
  ): Promise<void> => {
    if (skippedCollections.has(name)) {
      recordResult(results, {
        name,
        status: 'skipped',
        sourceCount: 0,
        targetDeleted: 0,
        targetInserted: 0,
        warnings: ['Skipped by sync options.'],
      });
      return;
    }

    try {
      const { sourceCount, targetDeleted, targetInserted, warnings } = await handler();
      recordResult(results, {
        name,
        status: 'completed',
        sourceCount,
        targetDeleted,
        targetInserted,
        ...(warnings?.length ? { warnings } : null),
      });
    } catch (error) {
      recordResult(results, {
        name,
        status: 'failed',
        sourceCount: 0,
        targetDeleted: 0,
        targetInserted: 0,
        error: error instanceof Error ? error.message : 'Sync failed.',
      });
      throw error;
    }
  };

  const context: SyncHandlerContext = {
    mongo,
    prisma,
    toDate,
    normalizeId,
    toObjectIdMaybe,
    toJsonValue,
    currencyCodes,
    countryCodes,
  };

  // --- Handlers ---
  await syncCollection('settings', () => syncSettings(context));
  handledCollections.add('settings');

  await syncCollection('users', () => syncUsers(context));
  handledCollections.add('users');

  await syncCollection('accounts', () => syncAccounts(context));
  handledCollections.add('accounts');

  await syncCollection('sessions', () => syncSessions(context));
  handledCollections.add('sessions');

  await syncCollection('verification_tokens', () => syncVerificationTokens(context));
  handledCollections.add('verification_tokens');

  await syncCollection('auth_security_profiles', () => syncAuthSecurityProfiles(context));
  handledCollections.add('auth_security_profiles');

  await syncCollection('auth_login_challenges', async () => {
    handledCollections.add('auth_login_challenges');
    const docs = await mongo.collection('auth_login_challenges').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>) => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          data: toJsonValue(doc) as Prisma.InputJsonValue,
          createdAt: toDate((doc as { createdAt?: Date | string }).createdAt) ?? new Date(),
          updatedAt: toDate((doc as { updatedAt?: Date | string }).updatedAt) ?? new Date(),
        };
      })
      .filter(Boolean) as Prisma.AuthLoginChallengeCreateManyInput[];
    const deleted = await prisma.authLoginChallenge.deleteMany();
    const created = data.length ? await prisma.authLoginChallenge.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('auth_security_attempts', async () => {
    handledCollections.add('auth_security_attempts');
    const docs = await mongo.collection('auth_security_attempts').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>) => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          data: toJsonValue(doc) as Prisma.InputJsonValue,
          createdAt: toDate((doc as { createdAt?: Date | string }).createdAt) ?? new Date(),
          updatedAt: toDate((doc as { updatedAt?: Date | string }).updatedAt) ?? new Date(),
        };
      })
      .filter(Boolean) as Prisma.AuthSecurityAttemptCreateManyInput[];
    const deleted = await prisma.authSecurityAttempt.deleteMany();
    const created = data.length ? await prisma.authSecurityAttempt.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('user_preferences', () => syncUserPreferences(context));
  handledCollections.add('user_preferences');

  await syncCollection('system_logs', () => syncSystemLogs(context));
  handledCollections.add('system_logs');

  await syncCollection('file_upload_events', () => syncFileUploadEvents(context));
  handledCollections.add('file_upload_events');

  await syncCollection('ai_configurations', () => syncAiConfigurations(context));
  handledCollections.add('ai_configurations');

  await syncCollection('chatbot_sessions', () => syncChatbotSessions(context));
  handledCollections.add('chatbot_sessions');

  await syncCollection('chatbot_jobs', () => syncChatbotJobs(context));
  handledCollections.add('chatbot_jobs');

  await syncCollection('currencies', () => syncCurrencies(context));
  handledCollections.add('currencies');

  await syncCollection('countries', () => syncCountries(context));
  handledCollections.add('countries');

  await syncCollection('languages', () => syncLanguages(context));
  handledCollections.add('languages');

  await syncCollection('price_groups', () => syncPriceGroups(context));
  handledCollections.add('price_groups');

  await syncCollection('catalogs', () => syncCatalogs(context));
  handledCollections.add('catalogs');

  await syncCollection('product_categories', () => syncProductCategories(context));
  handledCollections.add('product_categories');

  await syncCollection('product_tags', () => syncProductTags(context));
  handledCollections.add('product_tags');

  await syncCollection('product_parameters', () => syncProductParameters(context));
  handledCollections.add('product_parameters');

  await syncCollection('product_producers', () => syncProductProducers(context));
  handledCollections.add('product_producers');

  await syncCollection('image_files', () => syncImageFiles(context));
  handledCollections.add('image_files');

  await syncCollection('image_studio_slots', () => syncImageStudioSlots(context));
  handledCollections.add('image_studio_slots');

  await syncCollection('products', () => syncProducts(context));
  handledCollections.add('products');

  await syncCollection('integrations', () => syncIntegrations(context));
  handledCollections.add('integrations');

  await syncCollection('integration_connections', () => syncIntegrationConnections(context));
  handledCollections.add('integration_connections');

  await syncCollection('product_listings', () => syncProductListings(context));
  handledCollections.add('product_listings');

  await syncCollection('product_drafts', () => syncProductDrafts(context));
  handledCollections.add('product_drafts');

  await syncCollection('cms_slugs', () => syncCmsSlugs(context));
  handledCollections.add('cms_slugs');

  await syncCollection('cms_themes', () => syncCmsThemes(context));
  handledCollections.add('cms_themes');

  await syncCollection('cms_pages', () => syncCmsPages(context));
  handledCollections.add('cms_pages');

  await syncCollection('cms_page_slugs', () => syncCmsPageSlugs(context));
  handledCollections.add('cms_page_slugs');

  await syncCollection('cms_domains', () => syncCmsDomains(context));
  handledCollections.add('cms_domains');

  await syncCollection('cms_domain_slugs', () => syncCmsDomainSlugs(context));
  handledCollections.add('cms_domain_slugs');

  await syncCollection('notebooks', () => syncNotebooks(context));
  handledCollections.add('notebooks');

  await syncCollection('themes', () => syncThemes(context));
  handledCollections.add('themes');

  await syncCollection('tags', () => syncTags(context));
  handledCollections.add('tags');

  await syncCollection('categories', () => syncCategories(context));
  handledCollections.add('categories');

  await syncCollection('notes', () => syncNotes(context));
  handledCollections.add('notes');

  await syncCollection('note_files', () => syncNoteFiles(context));
  handledCollections.add('noteFiles');

  await syncCollection('product_ai_jobs', () => syncProductAiJobs(context));
  handledCollections.add('product_ai_jobs');

  await syncCollection('ai_path_runs', () => syncAiPathRuns(context));
  handledCollections.add('ai_path_runs');

  await syncCollection('ai_path_run_nodes', () => syncAiPathRunNodes(context));
  handledCollections.add('ai_path_run_nodes');

  await syncCollection('ai_path_run_events', () => syncAiPathRunEvents(context));
  handledCollections.add('ai_path_run_events');

  const existingCollections = await listMongoCollections();
  for (const collection of existingCollections) {
    if (handledCollections.has(collection)) continue;
    noteWarnings.push(collection);
  }
  if (noteWarnings.length > 0) {
    recordResult(results, {
      name: 'unmapped_collections',
      status: 'skipped',
      sourceCount: noteWarnings.length,
      targetDeleted: 0,
      targetInserted: 0,
      warnings: noteWarnings.map((name) => `No Prisma mapping for ${name}`),
    });
  }
}

async function syncPrismaToMongo(
  results: DatabaseSyncCollectionResult[],
  options?: DatabaseSyncOptions
): Promise<void> {
  const mongo = await getMongoDb();
  const skippedCollections = new Set(options?.skipCollections ?? []);
  if (options?.skipAuthCollections) {
    AUTH_COLLECTIONS.forEach((name: string) => skippedCollections.add(name));
  }

  const syncCollection = async (
    name: string,
    handler: () => Promise<{ sourceCount: number; targetDeleted: number; targetInserted: number; warnings?: string[] }>
  ): Promise<void> => {
    if (skippedCollections.has(name)) {
      recordResult(results, {
        name,
        status: 'skipped',
        sourceCount: 0,
        targetDeleted: 0,
        targetInserted: 0,
        warnings: ['Skipped by sync options.'],
      });
      return;
    }

    try {
      const { sourceCount, targetDeleted, targetInserted, warnings } = await handler();
      recordResult(results, {
        name,
        status: 'completed',
        sourceCount,
        targetDeleted,
        targetInserted,
        ...(warnings?.length ? { warnings } : null),
      });
    } catch (error) {
      recordResult(results, {
        name,
        status: 'failed',
        sourceCount: 0,
        targetDeleted: 0,
        targetInserted: 0,
        error: error instanceof Error ? error.message : 'Sync failed.',
      });
      throw error;
    }
  };

  const context: SyncHandlerContext = {
    mongo,
    prisma,
    toDate,
    normalizeId,
    toObjectIdMaybe,
    toJsonValue,
    currencyCodes,
    countryCodes,
  };

  await syncCollection('settings', () => syncSettingsPrismaToMongo(context));
  await syncCollection('users', () => syncUsersPrismaToMongo(context));
  await syncCollection('accounts', () => syncAccountsPrismaToMongo(context));
  await syncCollection('sessions', () => syncSessionsPrismaToMongo(context));
  await syncCollection('verification_tokens', () => syncVerificationTokensPrismaToMongo(context));
  await syncCollection('auth_security_profiles', () => syncAuthSecurityProfilesPrismaToMongo(context));

  await syncCollection('auth_login_challenges', async () => {
    const rows = await prisma.authLoginChallenge.findMany();
    const docs = rows.map((row) => {
      const data = row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {};
      const { _id: _ignored, ...rest } = data;
      return {
        _id: toObjectIdMaybe(row.id),
        ...rest,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
    const collection = mongo.collection('auth_login_challenges');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('auth_security_attempts', async () => {
    const rows = await prisma.authSecurityAttempt.findMany();
    const docs = rows.map((row) => {
      const data = row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {};
      const { _id: _ignored, ...rest } = data;
      return {
        _id: toObjectIdMaybe(row.id),
        ...rest,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
    const collection = mongo.collection('auth_security_attempts');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('user_preferences', () => syncUserPreferencesPrismaToMongo(context));
  await syncCollection('system_logs', () => syncSystemLogsPrismaToMongo(context));
  await syncCollection('file_upload_events', () => syncFileUploadEventsPrismaToMongo(context));
  await syncCollection('ai_configurations', () => syncAiConfigurationsPrismaToMongo(context));

  await syncCollection('chatbot_sessions', () => syncChatbotSessionsPrismaToMongo(context));
  await syncCollection('chatbot_jobs', () => syncChatbotJobsPrismaToMongo(context));

  await syncCollection('currencies', () => syncCurrenciesPrismaToMongo(context));
  await syncCollection('countries', () => syncCountriesPrismaToMongo(context));
  await syncCollection('languages', () => syncLanguagesPrismaToMongo(context));

  await syncCollection('price_groups', () => syncPriceGroupsPrismaToMongo(context));
  await syncCollection('catalogs', () => syncCatalogsPrismaToMongo(context));
  await syncCollection('product_categories', () => syncProductCategoriesPrismaToMongo(context));
  await syncCollection('product_tags', () => syncProductTagsPrismaToMongo(context));
  await syncCollection('product_producers', () => syncProductProducersPrismaToMongo(context));
  await syncCollection('product_parameters', () => syncProductParametersPrismaToMongo(context));

  await syncCollection('image_files', () => syncImageFilesPrismaToMongo(context));
  await syncCollection('image_studio_slots', () => syncImageStudioSlotsPrismaToMongo(context));

  await syncCollection('products', () => syncProductsPrismaToMongo(context));
  await syncCollection('integrations', () => syncIntegrationsPrismaToMongo(context));
  await syncCollection('integration_connections', () => syncIntegrationConnectionsPrismaToMongo(context));
  await syncCollection('product_listings', () => syncProductListingsPrismaToMongo(context));
  await syncCollection('product_drafts', () => syncProductDraftsPrismaToMongo(context));

  await syncCollection('cms_slugs', () => syncCmsSlugsPrismaToMongo(context));
  await syncCollection('cms_themes', () => syncCmsThemesPrismaToMongo(context));
  await syncCollection('cms_pages', () => syncCmsPagesPrismaToMongo(context));
  await syncCollection('cms_page_slugs', () => syncCmsPageSlugsPrismaToMongo(context));
  await syncCollection('cms_domains', () => syncCmsDomainsPrismaToMongo(context));
  await syncCollection('cms_domain_slugs', () => syncCmsDomainSlugsPrismaToMongo(context));

  await syncCollection('notes', () => syncNotesPrismaToMongo(context));
  await syncCollection('noteFiles', () => syncNoteFilesPrismaToMongo(context));
  await syncCollection('tags', () => syncTagsPrismaToMongo(context));
  await syncCollection('categories', () => syncCategoriesPrismaToMongo(context));
  await syncCollection('notebooks', () => syncNotebooksPrismaToMongo(context));
  await syncCollection('themes', () => syncThemesPrismaToMongo(context));

  await syncCollection('product_ai_jobs', () => syncProductAiJobsPrismaToMongo(context));
  await syncCollection('ai_path_runs', () => syncAiPathRunsPrismaToMongo(context));
  await syncCollection('ai_path_run_nodes', () => syncAiPathRunNodesPrismaToMongo(context));
  await syncCollection('ai_path_run_events', () => syncAiPathRunEventsPrismaToMongo(context));
}
