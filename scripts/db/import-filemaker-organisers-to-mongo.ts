import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Document, WithId } from 'mongodb';

import {
  parseFilemakerLegacyOrganiserRows,
  parseOrganiserFromRow,
  type LegacyOrganiserRow,
  type ParsedLegacyOrganiser,
} from '@/features/filemaker/filemaker-organisers-import.parser';
import type { MongoSource } from '@/shared/contracts/database';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const DEFAULT_COLLECTION = 'filemaker_organizations';
const DEFAULT_BATCH_SIZE = 1_000;
const IMPORT_SOURCE_KIND = 'filemaker.organiser';

type CliOptions = {
  batchSize: number;
  collectionName: string;
  dryRun: boolean;
  inputPath: string | null;
  replaceCollection: boolean;
  source: MongoSource | undefined;
};

type ExistingOrganizationRecord = {
  createdAt?: string;
  id: string;
  parentOrganizationId?: string | null;
};

type FilemakerOrganizationMongoDocument = Document & {
  _id: string;
  cooperationStatus?: string;
  createdAt?: string;
  establishedDate?: string;
  id: string;
  importBatchId?: string;
  importSourceKind: string;
  importedAt?: Date;
  legacyDefaultAddressUuid?: string;
  legacyDefaultBankAccountUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyDisplayBankAccountUuid?: string;
  legacyParentUuid?: string;
  legacyUuid: string;
  mongoCreatedAt?: Date;
  mongoUpdatedAt?: Date;
  name: string;
  parentOrganizationId?: string | null;
  schemaVersion: 1;
  updatedAt?: string;
  updatedBy?: string;
};

type CollectedOrganisers = {
  duplicateLegacyUuidCount: number;
  organisers: Map<string, ParsedLegacyOrganiser>;
  skippedRowCount: number;
};

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-organisers-to-mongo.ts --input=/path/organiser.csv --write',
      '',
      'Imports a FileMaker organiser CSV/TSV export into MongoDB collection-backed storage.',
      `Default collection: ${DEFAULT_COLLECTION}`,
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild the target collection before importing.',
      'Pass --source=local or --source=cloud to override the active Mongo source.',
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
    collectionName: DEFAULT_COLLECTION,
    dryRun: true,
    inputPath: null,
    replaceCollection: false,
    source: undefined,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      return;
    }
    if (arg === '--replace') {
      options.replaceCollection = true;
      return;
    }
    if (arg.startsWith('--input=')) {
      options.inputPath = arg.slice('--input='.length).trim() || null;
      return;
    }
    if (arg.startsWith('--collection=')) {
      options.collectionName = arg.slice('--collection='.length).trim() || DEFAULT_COLLECTION;
      return;
    }
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length).trim();
      if (source === 'local' || source === 'cloud') {
        options.source = source;
      }
      return;
    }
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parsePositiveInteger(
        arg.slice('--batch-size='.length),
        DEFAULT_BATCH_SIZE
      );
      return;
    }
    if (!arg.startsWith('--') && options.inputPath === null) {
      options.inputPath = arg.trim() || null;
    }
  });

  return options;
};

const createModernOrganizationId = (legacyUuid: string): string => {
  const digest = createHash('sha256')
    .update(`filemaker.organization:${legacyUuid}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-organization-${digest}`;
};

const collectOrganisers = (rows: LegacyOrganiserRow[]): CollectedOrganisers => {
  const organisers = new Map<string, ParsedLegacyOrganiser>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((row: LegacyOrganiserRow): void => {
    const organiser = parseOrganiserFromRow(row);
    if (organiser === null) {
      skippedRowCount += 1;
      return;
    }
    if (organisers.has(organiser.legacyUuid)) {
      duplicateLegacyUuidCount += 1;
    }
    organisers.set(organiser.legacyUuid, organiser);
  });

  return { duplicateLegacyUuidCount, organisers, skippedRowCount };
};

const ensureIndexes = async (
  collection: Collection<FilemakerOrganizationMongoDocument>
): Promise<void> => {
  await Promise.all([
    collection.createIndex(
      { legacyUuid: 1 },
      {
        name: 'filemaker_organizations_legacy_uuid_unique',
        partialFilterExpression: { legacyUuid: { $type: 'string' } },
        unique: true,
      }
    ),
    collection.createIndex({ name: 1 }, { name: 'filemaker_organizations_name' }),
  ]);
};

const isNamespaceNotFoundError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const maybeError = error as { code?: unknown; codeName?: unknown };
  return maybeError.code === 26 || maybeError.codeName === 'NamespaceNotFound';
};

const dropCollectionIfExists = async (
  collection: Collection<FilemakerOrganizationMongoDocument>
): Promise<boolean> => {
  try {
    await collection.drop();
    return true;
  } catch (error: unknown) {
    if (isNamespaceNotFoundError(error)) return false;
    throw error;
  }
};

const buildExistingOrganizationMap = async (
  collection: Collection<FilemakerOrganizationMongoDocument>
): Promise<Map<string, ExistingOrganizationRecord>> => {
  const existing = await collection
    .find(
      { legacyUuid: { $type: 'string' } },
      { projection: { _id: 0, id: 1, legacyUuid: 1, createdAt: 1, parentOrganizationId: 1 } }
    )
    .toArray();
  return new Map(
    existing
      .map(
        (
          document: WithId<FilemakerOrganizationMongoDocument>
        ): [string, ExistingOrganizationRecord] | null => {
          if (!document.legacyUuid || !document.id) return null;
          return [
            document.legacyUuid,
            {
              createdAt: document.createdAt,
              id: document.id,
              parentOrganizationId: document.parentOrganizationId,
            },
          ];
        }
      )
      .filter((entry): entry is [string, ExistingOrganizationRecord] => entry !== null)
  );
};

const buildModernIdMap = (
  organisers: Map<string, ParsedLegacyOrganiser>,
  existingByLegacyUuid: Map<string, ExistingOrganizationRecord>
): Map<string, string> => {
  const idByLegacyUuid = new Map<string, string>();
  organisers.forEach((organiser: ParsedLegacyOrganiser): void => {
    const existingId = existingByLegacyUuid.get(organiser.legacyUuid)?.id;
    idByLegacyUuid.set(
      organiser.legacyUuid,
      existingId ?? createModernOrganizationId(organiser.legacyUuid)
    );
  });
  return idByLegacyUuid;
};

const resolveParentOrganizationId = (
  organiser: ParsedLegacyOrganiser,
  idByLegacyUuid: Map<string, string>,
  existing: ExistingOrganizationRecord | undefined
): string | null | undefined => {
  if (existing?.parentOrganizationId !== undefined) return existing.parentOrganizationId;
  if (organiser.legacyParentUuid === undefined) return undefined;
  return idByLegacyUuid.get(organiser.legacyParentUuid) ?? null;
};

const toMongoOrganizationDocument = (input: {
  existing: ExistingOrganizationRecord | undefined;
  id: string;
  idByLegacyUuid: Map<string, string>;
  importBatchId: string;
  importedAt: Date;
  organiser: ParsedLegacyOrganiser;
}): FilemakerOrganizationMongoDocument => {
  const parentOrganizationId = resolveParentOrganizationId(
    input.organiser,
    input.idByLegacyUuid,
    input.existing
  );
  return {
    _id: input.id,
    ...(input.organiser.cooperationStatus && {
      cooperationStatus: input.organiser.cooperationStatus,
    }),
    ...(input.organiser.createdAt || input.existing?.createdAt
      ? { createdAt: input.organiser.createdAt ?? input.existing?.createdAt }
      : {}),
    ...(input.organiser.establishedDate && { establishedDate: input.organiser.establishedDate }),
    id: input.id,
    importBatchId: input.importBatchId,
    importSourceKind: IMPORT_SOURCE_KIND,
    importedAt: input.importedAt,
    ...(input.organiser.legacyDefaultAddressUuid && {
      legacyDefaultAddressUuid: input.organiser.legacyDefaultAddressUuid,
    }),
    ...(input.organiser.legacyDefaultBankAccountUuid && {
      legacyDefaultBankAccountUuid: input.organiser.legacyDefaultBankAccountUuid,
    }),
    ...(input.organiser.legacyDisplayAddressUuid && {
      legacyDisplayAddressUuid: input.organiser.legacyDisplayAddressUuid,
    }),
    ...(input.organiser.legacyDisplayBankAccountUuid && {
      legacyDisplayBankAccountUuid: input.organiser.legacyDisplayBankAccountUuid,
    }),
    ...(input.organiser.legacyParentUuid && { legacyParentUuid: input.organiser.legacyParentUuid }),
    legacyUuid: input.organiser.legacyUuid,
    name: input.organiser.name,
    ...(parentOrganizationId !== undefined && { parentOrganizationId }),
    schemaVersion: 1,
    ...(input.organiser.updatedAt && { updatedAt: input.organiser.updatedAt }),
    ...(input.organiser.updatedBy && { updatedBy: input.organiser.updatedBy }),
  };
};

const toBulkOperation = (
  document: FilemakerOrganizationMongoDocument,
  now: Date
): AnyBulkWriteOperation<FilemakerOrganizationMongoDocument> => {
  const { _id, ...set } = document;
  return {
    updateOne: {
      filter: { legacyUuid: document.legacyUuid },
      update: {
        $set: {
          ...set,
          mongoUpdatedAt: now,
        },
        $setOnInsert: {
          _id,
          mongoCreatedAt: now,
        },
      },
      upsert: true,
    },
  };
};

const runBulkWrites = async (input: {
  batchSize: number;
  collection: Collection<FilemakerOrganizationMongoDocument>;
  documents: FilemakerOrganizationMongoDocument[];
  existingByLegacyUuid: Map<string, ExistingOrganizationRecord>;
}): Promise<{
  insertedCount: number;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
}> => {
  let insertedCount = 0;
  let matchedCount = 0;
  let modifiedCount = 0;
  let upsertedCount = 0;
  const now = new Date();
  const documentsToInsert = input.documents.filter(
    (document: FilemakerOrganizationMongoDocument): boolean =>
      !input.existingByLegacyUuid.has(document.legacyUuid ?? '')
  );
  const documentsToUpdate = input.documents.filter(
    (document: FilemakerOrganizationMongoDocument): boolean =>
      input.existingByLegacyUuid.has(document.legacyUuid ?? '')
  );

  for (let index = 0; index < documentsToInsert.length; index += input.batchSize) {
    const batch = documentsToInsert.slice(index, index + input.batchSize);
    const result = await input.collection.insertMany(
      batch.map((document: FilemakerOrganizationMongoDocument) => ({
        ...document,
        mongoCreatedAt: now,
        mongoUpdatedAt: now,
      })),
      { ordered: false }
    );
    insertedCount += result.insertedCount;
  }

  for (let index = 0; index < documentsToUpdate.length; index += input.batchSize) {
    const batch = documentsToUpdate.slice(index, index + input.batchSize);
    const result = await input.collection.bulkWrite(
      batch.map((document: FilemakerOrganizationMongoDocument) => toBulkOperation(document, now)),
      { ordered: false }
    );
    matchedCount += result.matchedCount;
    modifiedCount += result.modifiedCount;
    upsertedCount += result.upsertedCount;
  }

  return { insertedCount, matchedCount, modifiedCount, upsertedCount };
};

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (!options.inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const text = await readFile(options.inputPath, 'utf8');
  const parsedRows = parseFilemakerLegacyOrganiserRows(text);
  const collected = collectOrganisers(parsedRows);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const collection = db.collection<FilemakerOrganizationMongoDocument>(options.collectionName);
    const replacedCollection =
      !options.dryRun && options.replaceCollection ? await dropCollectionIfExists(collection) : false;
    if (!options.dryRun && !options.replaceCollection) {
      await ensureIndexes(collection);
    }
    const existingByLegacyUuid = await buildExistingOrganizationMap(collection);
    const idByLegacyUuid = buildModernIdMap(collected.organisers, existingByLegacyUuid);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const documents = Array.from(collected.organisers.values()).map(
      (organiser: ParsedLegacyOrganiser): FilemakerOrganizationMongoDocument => {
        const id = idByLegacyUuid.get(organiser.legacyUuid) ?? '';
        return toMongoOrganizationDocument({
          existing: existingByLegacyUuid.get(organiser.legacyUuid),
          id,
          idByLegacyUuid,
          importBatchId,
          importedAt,
          organiser,
        });
      }
    );
    const writeResult = options.dryRun
      ? { insertedCount: 0, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : await runBulkWrites({
          batchSize: options.batchSize,
          collection,
          documents,
          existingByLegacyUuid,
        });
    if (!options.dryRun && options.replaceCollection) {
      await ensureIndexes(collection);
    }

    console.log(
      JSON.stringify(
        {
          mode: options.dryRun ? 'dry-run' : 'write',
          collectionName: options.collectionName,
          duplicateLegacyUuidCount: collected.duplicateLegacyUuidCount,
          existingLegacyUuidCount: existingByLegacyUuid.size,
          insertedCount: writeResult.insertedCount,
          importBatchId: options.dryRun ? null : importBatchId,
          inputPath: options.inputPath,
          matchedCount: writeResult.matchedCount,
          modifiedCount: writeResult.modifiedCount,
          parsedRowCount: parsedRows.length,
          replacedCollection,
          skippedRowCount: collected.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          uniqueOrganizationCount: collected.organisers.size,
          upsertedCount: writeResult.upsertedCount,
        },
        null,
        2
      )
    );
  } finally {
    await client.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
