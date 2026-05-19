import './load-app-env';

import type { WithId } from 'mongodb';

import type { MongoSource } from '@/shared/contracts/database';
import { getMongoDb, invalidateMongoClientCache } from '@/shared/lib/db/mongo-client';
import {
  getMongoDb as getProductsMongoDb,
  invalidateProductsMongoClientCache,
} from '@/shared/lib/db/product-mongo-client';
import {
  IMPORT_EXPORT_SETTINGS_COLLECTION,
  IMPORT_EXPORT_SETTINGS_KEYS,
} from '@/features/integrations/services/import-export-settings-store';
import {
  INTEGRATION_SETTINGS_COLLECTION,
  INTEGRATION_SETTINGS_KEYS,
} from '@/features/integrations/services/integration-settings-store';
import { PRODUCT_SYNC_PROFILE_SETTINGS_KEY } from '@/shared/contracts/product-sync';

const SETTINGS_COLLECTION = 'settings';

type SettingDoc = {
  _id: string;
  key?: string;
  value?: string;
};

type TargetDoc = {
  _id: string;
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type MigrationStats = {
  legacyFound: number;
  targetFoundBefore: number;
  written: number;
  skippedExisting: number;
  conflictingLegacy: number;
  deletedLegacy: number;
  legacyRemainingAfter: number;
};

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const shouldCleanupLegacy = args.has('--cleanup-legacy');
const sourceArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith('--source='))
  ?.slice('--source='.length);
const preferredSource: MongoSource | undefined =
  sourceArg === 'local' || sourceArg === 'cloud' ? sourceArg : undefined;

if (sourceArg !== undefined && preferredSource === undefined) {
  throw new Error('Invalid --source value. Expected "local" or "cloud".');
}

const readLegacySettings = async (
  keys: readonly string[],
  options?: { productsDb?: boolean }
): Promise<Map<string, WithId<SettingDoc>>> => {
  const mongo = options?.productsDb ? await getProductsMongoDb(preferredSource) : await getMongoDb(preferredSource);
  const docs = await mongo.collection<SettingDoc>(SETTINGS_COLLECTION).find({
    $or: [{ _id: { $in: [...keys] } }, { key: { $in: [...keys] } }],
  }).toArray();
  return docs.reduce((map: Map<string, WithId<SettingDoc>>, doc: WithId<SettingDoc>) => {
    const key = typeof doc.key === 'string' ? doc.key : String(doc._id);
    if (keys.includes(key) && !map.has(key)) {
      map.set(key, doc);
    }
    return map;
  }, new Map<string, WithId<SettingDoc>>());
};

const readTargetSettings = async (
  collectionName: string,
  keys: readonly string[]
): Promise<Map<string, WithId<TargetDoc>>> => {
  const mongo = await getMongoDb(preferredSource);
  const docs = await mongo.collection<TargetDoc>(collectionName).find({
    _id: { $in: [...keys] },
  }).toArray();
  return docs.reduce((map: Map<string, WithId<TargetDoc>>, doc: WithId<TargetDoc>) => {
    map.set(String(doc._id), doc);
    return map;
  }, new Map<string, WithId<TargetDoc>>());
};

const writeTargetSetting = async (
  collectionName: string,
  key: string,
  value: string
): Promise<void> => {
  const mongo = await getMongoDb(preferredSource);
  const now = new Date();
  await mongo.collection<TargetDoc>(collectionName).updateOne(
    { _id: key },
    {
      $set: {
        key,
        value,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
};

const cleanupLegacySettings = async (
  keys: readonly string[],
  options?: { productsDb?: boolean }
): Promise<number> => {
  const mongo = options?.productsDb ? await getProductsMongoDb(preferredSource) : await getMongoDb(preferredSource);
  const result = await mongo.collection<SettingDoc>(SETTINGS_COLLECTION).deleteMany({
    $or: [{ _id: { $in: [...keys] } }, { key: { $in: [...keys] } }],
  });
  return result.deletedCount ?? 0;
};

const countLegacyRemaining = async (
  keys: readonly string[],
  options?: { productsDb?: boolean }
): Promise<number> => (await readLegacySettings(keys, options)).size;

const migrateKeySet = async (input: {
  collectionName: string;
  keys: readonly string[];
  legacy: Map<string, WithId<SettingDoc>>;
}): Promise<Omit<MigrationStats, 'deletedLegacy' | 'legacyRemainingAfter'>> => {
  const target = await readTargetSettings(input.collectionName, input.keys);
  let written = 0;
  let skippedExisting = 0;
  let conflictingLegacy = 0;

  for (const key of input.keys) {
    const legacyDoc = input.legacy.get(key);
    if (!legacyDoc || typeof legacyDoc.value !== 'string') continue;
    const targetDoc = target.get(key);
    if (targetDoc) {
      skippedExisting += 1;
      if (targetDoc.value !== legacyDoc.value) conflictingLegacy += 1;
      continue;
    }
    if (shouldApply) {
      await writeTargetSetting(input.collectionName, key, legacyDoc.value);
    }
    written += 1;
  }

  return {
    legacyFound: input.legacy.size,
    targetFoundBefore: target.size,
    written,
    skippedExisting,
    conflictingLegacy,
  };
};

const run = async (): Promise<void> => {
  const importExportLegacy = await readLegacySettings(IMPORT_EXPORT_SETTINGS_KEYS);
  const integrationLegacy = await readLegacySettings(INTEGRATION_SETTINGS_KEYS);
  const productSyncLegacy = await readLegacySettings([PRODUCT_SYNC_PROFILE_SETTINGS_KEY], {
    productsDb: true,
  });
  if (!integrationLegacy.has(PRODUCT_SYNC_PROFILE_SETTINGS_KEY)) {
    const legacyDoc = productSyncLegacy.get(PRODUCT_SYNC_PROFILE_SETTINGS_KEY);
    if (legacyDoc) {
      integrationLegacy.set(PRODUCT_SYNC_PROFILE_SETTINGS_KEY, legacyDoc);
    }
  }

  const importExportStats = await migrateKeySet({
    collectionName: IMPORT_EXPORT_SETTINGS_COLLECTION,
    keys: IMPORT_EXPORT_SETTINGS_KEYS,
    legacy: importExportLegacy,
  });
  const integrationStats = await migrateKeySet({
    collectionName: INTEGRATION_SETTINGS_COLLECTION,
    keys: INTEGRATION_SETTINGS_KEYS,
    legacy: integrationLegacy,
  });

  const deletedImportExportLegacy =
    shouldApply && shouldCleanupLegacy
      ? await cleanupLegacySettings(IMPORT_EXPORT_SETTINGS_KEYS)
      : 0;
  const deletedIntegrationLegacy =
    shouldApply && shouldCleanupLegacy
      ? await cleanupLegacySettings(INTEGRATION_SETTINGS_KEYS)
      : 0;
  const deletedProductSyncLegacy =
    shouldApply && shouldCleanupLegacy
      ? await cleanupLegacySettings([PRODUCT_SYNC_PROFILE_SETTINGS_KEY], { productsDb: true })
      : 0;

  const result = {
    mode: shouldApply ? 'apply' : 'dry-run',
    source: preferredSource ?? 'active-default',
    cleanupLegacyRequested: shouldCleanupLegacy,
    importExport: {
      sourceCollection: SETTINGS_COLLECTION,
      targetCollection: IMPORT_EXPORT_SETTINGS_COLLECTION,
      ...importExportStats,
      deletedLegacy: deletedImportExportLegacy,
      legacyRemainingAfter: await countLegacyRemaining(IMPORT_EXPORT_SETTINGS_KEYS),
    } satisfies MigrationStats & {
      sourceCollection: string;
      targetCollection: string;
    },
    integration: {
      sourceCollection: SETTINGS_COLLECTION,
      productSyncLegacySourceCollection: `products.${SETTINGS_COLLECTION}`,
      targetCollection: INTEGRATION_SETTINGS_COLLECTION,
      ...integrationStats,
      deletedLegacy: deletedIntegrationLegacy + deletedProductSyncLegacy,
      legacyRemainingAfter:
        (await countLegacyRemaining(INTEGRATION_SETTINGS_KEYS)) +
        (await countLegacyRemaining([PRODUCT_SYNC_PROFILE_SETTINGS_KEY], { productsDb: true })),
    } satisfies MigrationStats & {
      productSyncLegacySourceCollection: string;
      sourceCollection: string;
      targetCollection: string;
    },
  };

  console.log(JSON.stringify(result, null, 2));
};

try {
  await run();
} finally {
  await Promise.all([invalidateMongoClientCache(), invalidateProductsMongoClientCache()]);
}
