import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';

import {
  ensureMongoFilemakerValueIndexes,
  FILEMAKER_VALUE_PARAMETER_LINKS_COLLECTION,
  FILEMAKER_VALUE_PARAMETERS_COLLECTION,
  FILEMAKER_VALUES_COLLECTION,
} from '@/features/filemaker/server/filemaker-values-repository';
import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { parseFilemakerDatabase } from '@/features/filemaker/settings/database-getters';
import type {
  FilemakerValue,
  FilemakerValueParameter,
  FilemakerValueParameterLink,
} from '@/features/filemaker/types';
import type { MongoSource } from '@/shared/contracts/database';
import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const SETTINGS_COLLECTION = 'settings';
const IMPORT_SOURCE_KIND = 'filemaker.value_catalog.settings_snapshot';
const DEFAULT_BATCH_SIZE = 5_000;

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  replaceCollections: boolean;
  source: MongoSource | undefined;
};

type ValueCatalogDocument<TRecord extends { id: string }> = Document & TRecord & {
  _id: string;
  importSourceKind: string;
  importedAt: Date;
  schemaVersion: 1;
};

type WriteResultSummary = {
  insertedCount?: number;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
};

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/sync-filemaker-values-to-mongo.ts --source=local --write --replace',
      '',
      'Copies FileMaker value hierarchy records from filemaker_database_v1 settings into Mongo collections.',
      'This is a read-model bridge while value editing/import is moved off the settings blob.',
      'By default the script performs a dry run. Pass --write to persist records.',
      'Pass --replace with --write to drop and rebuild only the FileMaker value catalog collections.',
    ].join('\n')
  );
};

const parsePositiveInteger = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    batchSize: DEFAULT_BATCH_SIZE,
    dryRun: true,
    replaceCollections: false,
    source: undefined,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--help') printUsage();
    if (arg === '--write') options.dryRun = false;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--replace') options.replaceCollections = true;
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parsePositiveInteger(arg.slice('--batch-size='.length), DEFAULT_BATCH_SIZE);
    }
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length).trim();
      if (source === 'local' || source === 'cloud') options.source = source;
    }
  });

  return options;
};

const toDocument = <TRecord extends { id: string }>(
  record: TRecord,
  importedAt: Date
): ValueCatalogDocument<TRecord> => ({
  ...record,
  _id: record.id,
  importedAt,
  importSourceKind: IMPORT_SOURCE_KIND,
  schemaVersion: 1,
});

const isNamespaceNotFoundError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const maybeError = error as { code?: unknown; codeName?: unknown };
  return maybeError.code === 26 || maybeError.codeName === 'NamespaceNotFound';
};

const dropCollectionIfExists = async (db: Db, collectionName: string): Promise<boolean> => {
  try {
    await db.collection(collectionName).drop();
    return true;
  } catch (error: unknown) {
    if (isNamespaceNotFoundError(error)) return false;
    throw error;
  }
};

const toUpsertOperation = <TDocument extends Document & { _id: string; id: string }>(
  document: TDocument
): AnyBulkWriteOperation<TDocument> => {
  const { _id, ...set } = document;
  return {
    updateOne: {
      filter: { id: document.id } as Document,
      update: { $set: set, $setOnInsert: { _id } },
      upsert: true,
    },
  };
};

const runBulkWrites = async <TDocument extends Document & { _id: string; id: string }>(
  collection: Collection<TDocument>,
  documents: TDocument[],
  batchSize: number
): Promise<WriteResultSummary> => {
  let matchedCount = 0;
  let modifiedCount = 0;
  let upsertedCount = 0;
  for (let index = 0; index < documents.length; index += batchSize) {
    const batch = documents.slice(index, index + batchSize);
    if (batch.length === 0) continue;
    const result = await collection.bulkWrite(batch.map(toUpsertOperation), { ordered: false });
    matchedCount += result.matchedCount;
    modifiedCount += result.modifiedCount;
    upsertedCount += result.upsertedCount;
  }
  return { matchedCount, modifiedCount, upsertedCount };
};

const readSettingsDatabase = async (db: Db): Promise<{
  parameterLinks: FilemakerValueParameterLink[];
  parameters: FilemakerValueParameter[];
  values: FilemakerValue[];
}> => {
  const document = await db
    .collection(SETTINGS_COLLECTION)
    .findOne({ key: FILEMAKER_DATABASE_KEY }, { projection: { value: 1 } });
  const rawValue = typeof document?.['value'] === 'string' ? document['value'] : '';
  const database = parseFilemakerDatabase(decodeSettingValue(FILEMAKER_DATABASE_KEY, rawValue));
  return {
    parameterLinks: database.valueParameterLinks,
    parameters: database.valueParameters,
    values: database.values,
  };
};

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const catalog = await readSettingsDatabase(db);
    const importedAt = new Date();
    const valueDocuments = catalog.values.map((value: FilemakerValue) =>
      toDocument(value, importedAt)
    );
    const parameterDocuments = catalog.parameters.map((parameter: FilemakerValueParameter) =>
      toDocument(parameter, importedAt)
    );
    const parameterLinkDocuments = catalog.parameterLinks.map((link: FilemakerValueParameterLink) =>
      toDocument(link, importedAt)
    );
    const replacedCollections =
      !options.dryRun && options.replaceCollections
        ? await Promise.all([
            dropCollectionIfExists(db, FILEMAKER_VALUES_COLLECTION),
            dropCollectionIfExists(db, FILEMAKER_VALUE_PARAMETERS_COLLECTION),
            dropCollectionIfExists(db, FILEMAKER_VALUE_PARAMETER_LINKS_COLLECTION),
          ])
        : [false, false, false];

    const writes = options.dryRun
      ? {
          parameterLinks: { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 },
          parameters: { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 },
          values: { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 },
        }
      : {
          parameterLinks: await runBulkWrites(
            db.collection(FILEMAKER_VALUE_PARAMETER_LINKS_COLLECTION),
            parameterLinkDocuments,
            options.batchSize
          ),
          parameters: await runBulkWrites(
            db.collection(FILEMAKER_VALUE_PARAMETERS_COLLECTION),
            parameterDocuments,
            options.batchSize
          ),
          values: await runBulkWrites(
            db.collection(FILEMAKER_VALUES_COLLECTION),
            valueDocuments,
            options.batchSize
          ),
        };

    if (!options.dryRun) {
      await ensureMongoFilemakerValueIndexes(await importValueCollections(db));
    }

    console.log(
      JSON.stringify(
        {
          inputSource: FILEMAKER_DATABASE_KEY,
          mode: options.dryRun ? 'dry-run' : 'write',
          parameterLinkCount: parameterLinkDocuments.length,
          parameterWrite: writes.parameters,
          replacedCollections: {
            links: replacedCollections[2],
            parameters: replacedCollections[1],
            values: replacedCollections[0],
          },
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          valueCount: valueDocuments.length,
          valueParameterCount: parameterDocuments.length,
          valueParameterLinkWrite: writes.parameterLinks,
          valueWrite: writes.values,
        },
        null,
        2
      )
    );
  } finally {
    await client.close();
  }
}

const importValueCollections = async (
  db: Db
): Promise<Parameters<typeof ensureMongoFilemakerValueIndexes>[0]> => ({
  links: db.collection(FILEMAKER_VALUE_PARAMETER_LINKS_COLLECTION),
  parameters: db.collection(FILEMAKER_VALUE_PARAMETERS_COLLECTION),
  values: db.collection(FILEMAKER_VALUES_COLLECTION),
});

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

