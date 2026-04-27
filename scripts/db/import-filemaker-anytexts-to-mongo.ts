import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';

import {
  parseAnyTextFromRow,
  parseFilemakerLegacyAnyTextRows,
  parseFilemakerLegacyAnyTextWorkbookRows,
  type LegacyAnyTextRow,
  type ParsedLegacyAnyText,
} from '@/features/filemaker/filemaker-anytext-import.parser';
import type { FilemakerAnyTextOwnerKind } from '@/features/filemaker/filemaker-anytext.types';
import type { MongoSource } from '@/shared/contracts/database';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const ANYTEXTS_COLLECTION = 'filemaker_anytexts';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const PERSONS_COLLECTION = 'filemaker_persons';
const EVENTS_COLLECTION = 'filemaker_events';
const DEFAULT_BATCH_SIZE = 5_000;
const IMPORT_SOURCE_KIND = 'filemaker.anytext';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string | null;
  replaceCollection: boolean;
  source: MongoSource | undefined;
};

type OwnerLookupRecord = {
  id: string;
  kind: FilemakerAnyTextOwnerKind;
  legacyUuid: string;
  name?: string;
};

type FilemakerAnyTextMongoDocument = Document & {
  _id: string;
  createdAt?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  legacyOwnerUuid: string;
  legacyUuid: string;
  ownerId?: string;
  ownerKind?: FilemakerAnyTextOwnerKind;
  ownerName?: string;
  schemaVersion: 1;
  text: string;
  updatedAt?: string;
  updatedBy?: string;
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
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-anytexts-to-mongo.ts --input=csv/b/anytext.xlsx --write',
      '',
      'Imports FileMaker AnyText CSV/TSV/XLSX exports into filemaker_anytexts.',
      'Parent_UUID_FK is resolved against imported organizations, persons, and events.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild only the anytext collection.',
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
    inputPath: null,
    replaceCollection: false,
    source: undefined,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') options.dryRun = false;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--replace') options.replaceCollection = true;
    if (arg.startsWith('--input=')) options.inputPath = arg.slice('--input='.length).trim() || null;
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parsePositiveInteger(arg.slice('--batch-size='.length), DEFAULT_BATCH_SIZE);
    }
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length).trim();
      if (source === 'local' || source === 'cloud') options.source = source;
    }
    if (!arg.startsWith('--') && options.inputPath === null) options.inputPath = arg.trim() || null;
  });

  return options;
};

const createModernId = (legacyUuid: string): string => {
  const digest = createHash('sha256')
    .update(`filemaker.anytext:${legacyUuid}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-anytext-${digest}`;
};

const isWorkbookInputPath = (inputPath: string): boolean => /\.(xlsx|xls)$/i.test(inputPath);

const readLegacyAnyTextRows = async (inputPath: string): Promise<LegacyAnyTextRow[]> => {
  if (isWorkbookInputPath(inputPath)) {
    return parseFilemakerLegacyAnyTextWorkbookRows(await readFile(inputPath));
  }
  return parseFilemakerLegacyAnyTextRows(await readFile(inputPath, 'utf8'));
};

const collectAnyTexts = (rows: LegacyAnyTextRow[]): {
  anyTexts: Map<string, ParsedLegacyAnyText>;
  duplicateLegacyUuidCount: number;
  skippedRowCount: number;
} => {
  const anyTexts = new Map<string, ParsedLegacyAnyText>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((row: LegacyAnyTextRow): void => {
    const anyText = parseAnyTextFromRow(row);
    if (anyText === null) {
      skippedRowCount += 1;
      return;
    }
    if (anyTexts.has(anyText.legacyUuid)) duplicateLegacyUuidCount += 1;
    anyTexts.set(anyText.legacyUuid, anyText);
  });

  return { anyTexts, duplicateLegacyUuidCount, skippedRowCount };
};

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const buildOwnerName = (
  document: Document,
  kind: FilemakerAnyTextOwnerKind
): string | undefined => {
  if (kind === 'organization') return optionalString(document['name']);
  if (kind === 'event') return optionalString(document['eventName']);
  const fullName = optionalString(document['fullName']);
  if (fullName !== undefined) return fullName;
  const name = [document['firstName'], document['lastName']]
    .map(optionalString)
    .filter((part): part is string => part !== undefined)
    .join(' ');
  return name.length > 0 ? name : undefined;
};

const buildOwnerMapForCollection = async (
  db: Db,
  input: { collectionName: string; kind: FilemakerAnyTextOwnerKind }
): Promise<Map<string, OwnerLookupRecord[]>> => {
  const documents = await db
    .collection(input.collectionName)
    .find(
      { legacyUuid: { $type: 'string' } },
      {
        projection: {
          eventName: 1,
          firstName: 1,
          fullName: 1,
          id: 1,
          lastName: 1,
          legacyUuid: 1,
          name: 1,
        },
      }
    )
    .toArray();
  const ownerByLegacyUuid = new Map<string, OwnerLookupRecord[]>();
  documents.forEach((document: Document): void => {
    const id = optionalString(document['id']);
    const legacyUuid = optionalString(document['legacyUuid'])?.toUpperCase();
    if (id === undefined || legacyUuid === undefined) return;
    ownerByLegacyUuid.set(legacyUuid, [
      ...(ownerByLegacyUuid.get(legacyUuid) ?? []),
      {
        id,
        kind: input.kind,
        legacyUuid,
        name: buildOwnerName(document, input.kind),
      },
    ]);
  });
  return ownerByLegacyUuid;
};

const combineOwnerMaps = (
  maps: Array<Map<string, OwnerLookupRecord[]>>
): Map<string, OwnerLookupRecord[]> => {
  const combined = new Map<string, OwnerLookupRecord[]>();
  maps.forEach((map: Map<string, OwnerLookupRecord[]>): void => {
    map.forEach((owners: OwnerLookupRecord[], legacyUuid: string): void => {
      combined.set(legacyUuid, [...(combined.get(legacyUuid) ?? []), ...owners]);
    });
  });
  return combined;
};

const buildOwnerMap = async (db: Db): Promise<Map<string, OwnerLookupRecord[]>> =>
  combineOwnerMaps([
    await buildOwnerMapForCollection(db, {
      collectionName: ORGANIZATIONS_COLLECTION,
      kind: 'organization',
    }),
    await buildOwnerMapForCollection(db, { collectionName: PERSONS_COLLECTION, kind: 'person' }),
    await buildOwnerMapForCollection(db, { collectionName: EVENTS_COLLECTION, kind: 'event' }),
  ]);

const resolveOwner = (
  anyText: ParsedLegacyAnyText,
  ownerByLegacyUuid: Map<string, OwnerLookupRecord[]>
): OwnerLookupRecord | undefined => ownerByLegacyUuid.get(anyText.legacyOwnerUuid)?.[0];

const toAnyTextDocument = (input: {
  anyText: ParsedLegacyAnyText;
  importBatchId: string;
  importedAt: Date;
  owner: OwnerLookupRecord | undefined;
}): FilemakerAnyTextMongoDocument => {
  const id = createModernId(input.anyText.legacyUuid);
  return {
    _id: id,
    ...(input.anyText.createdAt ? { createdAt: input.anyText.createdAt } : {}),
    id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    importSourceKind: IMPORT_SOURCE_KIND,
    legacyOwnerUuid: input.anyText.legacyOwnerUuid,
    legacyUuid: input.anyText.legacyUuid,
    ...(input.owner ? { ownerId: input.owner.id, ownerKind: input.owner.kind } : {}),
    ...(input.owner?.name ? { ownerName: input.owner.name } : {}),
    schemaVersion: 1,
    text: input.anyText.text,
    ...(input.anyText.updatedAt ? { updatedAt: input.anyText.updatedAt } : {}),
    ...(input.anyText.updatedBy ? { updatedBy: input.anyText.updatedBy } : {}),
  };
};

const isNamespaceNotFoundError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const maybeError = error as { code?: unknown; codeName?: unknown };
  return maybeError.code === 26 || maybeError.codeName === 'NamespaceNotFound';
};

const dropCollectionIfExists = async (collection: Collection<Document>): Promise<boolean> => {
  try {
    await collection.drop();
    return true;
  } catch (error: unknown) {
    if (isNamespaceNotFoundError(error)) return false;
    throw error;
  }
};

const ensureIndexes = async (db: Db): Promise<void> => {
  await Promise.all([
    db.collection(ANYTEXTS_COLLECTION).createIndex(
      { legacyUuid: 1 },
      { name: 'filemaker_anytexts_legacy_uuid_unique', unique: true }
    ),
    db.collection(ANYTEXTS_COLLECTION).createIndex(
      { ownerKind: 1, ownerId: 1 },
      {
        name: 'filemaker_anytexts_owner',
        partialFilterExpression: { ownerId: { $type: 'string' } },
      }
    ),
    db.collection(ANYTEXTS_COLLECTION).createIndex(
      { legacyOwnerUuid: 1 },
      { name: 'filemaker_anytexts_legacy_owner_uuid' }
    ),
  ]);
};

const toUpsertOperation = <TDocument extends Document>(
  document: TDocument & { _id: string; id: string }
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

const runBulkWrites = async <TDocument extends Document>(
  collection: Collection<TDocument>,
  documents: Array<TDocument & { _id: string; id: string }>,
  batchSize: number
): Promise<WriteResultSummary> => {
  let matchedCount = 0;
  let modifiedCount = 0;
  let upsertedCount = 0;
  for (let index = 0; index < documents.length; index += batchSize) {
    const batch = documents.slice(index, index + batchSize);
    const result = await collection.bulkWrite(batch.map(toUpsertOperation), { ordered: false });
    matchedCount += result.matchedCount;
    modifiedCount += result.modifiedCount;
    upsertedCount += result.upsertedCount;
  }
  return { matchedCount, modifiedCount, upsertedCount };
};

const runInsertWrites = async <TDocument extends Document>(
  collection: Collection<TDocument>,
  documents: TDocument[],
  batchSize: number
): Promise<WriteResultSummary> => {
  let insertedCount = 0;
  for (let index = 0; index < documents.length; index += batchSize) {
    const batch = documents.slice(index, index + batchSize);
    if (batch.length === 0) continue;
    const result = await collection.insertMany(batch, { ordered: false });
    insertedCount += result.insertedCount;
  }
  return { insertedCount, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
};

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (!options.inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const parsedRows = await readLegacyAnyTextRows(options.inputPath);
  const collected = collectAnyTexts(parsedRows);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const collection = db.collection<FilemakerAnyTextMongoDocument>(ANYTEXTS_COLLECTION);
    const replacedCollection =
      !options.dryRun && options.replaceCollection
        ? await dropCollectionIfExists(db.collection(ANYTEXTS_COLLECTION))
        : false;
    if (!options.dryRun && !options.replaceCollection) await ensureIndexes(db);

    const ownerByLegacyUuid = await buildOwnerMap(db);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const anyTextDocuments = Array.from(collected.anyTexts.values()).map(
      (anyText: ParsedLegacyAnyText): FilemakerAnyTextMongoDocument =>
        toAnyTextDocument({
          anyText,
          importBatchId,
          importedAt,
          owner: resolveOwner(anyText, ownerByLegacyUuid),
        })
    );
    const anyTextWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : options.replaceCollection
        ? await runInsertWrites(collection, anyTextDocuments, options.batchSize)
        : await runBulkWrites(collection, anyTextDocuments, options.batchSize);
    if (!options.dryRun) await ensureIndexes(db);

    const ambiguousOwnerLinkCount = anyTextDocuments.filter((anyText): boolean => {
      const owners = ownerByLegacyUuid.get(anyText.legacyOwnerUuid) ?? [];
      return owners.length > 1;
    }).length;
    const resolvedOwnerLinkCount = anyTextDocuments.filter(
      (anyText: FilemakerAnyTextMongoDocument): boolean => typeof anyText.ownerId === 'string'
    ).length;

    console.log(
      JSON.stringify(
        {
          ambiguousOwnerLinkCount,
          anyTextWrite,
          duplicateLegacyUuidCount: collected.duplicateLegacyUuidCount,
          importBatchId: options.dryRun ? null : importBatchId,
          inputFormat: isWorkbookInputPath(options.inputPath)
            ? extname(options.inputPath).slice(1) || 'workbook'
            : 'text',
          inputPath: options.inputPath,
          mode: options.dryRun ? 'dry-run' : 'write',
          ownerLookupCount: ownerByLegacyUuid.size,
          parsedRowCount: parsedRows.length,
          replacedCollection,
          resolvedOwnerLinkCount,
          skippedRowCount: collected.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          uniqueAnyTextCount: collected.anyTexts.size,
          unresolvedOwnerLinkCount: anyTextDocuments.length - resolvedOwnerLinkCount,
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
