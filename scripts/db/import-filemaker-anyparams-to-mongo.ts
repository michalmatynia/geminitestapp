import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';

import {
  parseAnyParamFromRow,
  parseFilemakerLegacyAnyParamRows,
  parseFilemakerLegacyAnyParamWorkbookRows,
  type LegacyAnyParamRow,
  type ParsedLegacyAnyParam,
  type ParsedLegacyAnyParamText,
} from '@/features/filemaker/filemaker-anyparam-import.parser';
import type {
  FilemakerAnyParamOwnerKind,
  FilemakerAnyParamTextValue,
  FilemakerAnyParamValue,
} from '@/features/filemaker/filemaker-anyparam.types';
import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { parseFilemakerDatabase } from '@/features/filemaker/settings/database-getters';
import type { FilemakerValue } from '@/features/filemaker/types';
import type { MongoSource } from '@/shared/contracts/database';
import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const ANYPARAMS_COLLECTION = 'filemaker_anyparams';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const PERSONS_COLLECTION = 'filemaker_persons';
const EVENTS_COLLECTION = 'filemaker_events';
const VALUES_COLLECTION = 'filemaker_values';
const SETTINGS_COLLECTION = 'settings';
const DEFAULT_BATCH_SIZE = 5_000;
const IMPORT_SOURCE_KIND = 'filemaker.anyparam';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string | null;
  replaceCollection: boolean;
  source: MongoSource | undefined;
};

type OwnerLookupRecord = {
  id: string;
  kind: FilemakerAnyParamOwnerKind;
  legacyUuid: string;
  name?: string;
};

type ValueLookupRecord = {
  id: string;
  label: string;
  legacyUuid: string;
  parentId?: string | null;
};

type ValueCatalogDocument = Document & {
  id?: unknown;
  label?: unknown;
  legacyUuid?: unknown;
  parentId?: unknown;
};

type FilemakerAnyParamMongoDocument = Document & {
  _id: string;
  createdAt?: string;
  createdBy?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  legacyOwnerUuid: string;
  legacyUuid: string;
  legacyValueUuids: string[];
  ownerId?: string;
  ownerKind?: FilemakerAnyParamOwnerKind;
  ownerName?: string;
  schemaVersion: 1;
  textValues: FilemakerAnyParamTextValue[];
  updatedAt?: string;
  updatedBy?: string;
  valueIds: string[];
  values: FilemakerAnyParamValue[];
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
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-anyparams-to-mongo.ts --input=csv/b/anyparam.xlsx --write',
      '',
      'Imports FileMaker AnyParam CSV/TSV/XLSX exports into filemaker_anyparams.',
      'UUID_Related is resolved against imported organizations, persons, and events.',
      'option1..option4 are retained as ordered legacy value UUIDs and linked to modern FileMaker value IDs when present.',
      'text1..text4 are retained as free-text parameter values.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild only the anyparam collection.',
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
    .update(`filemaker.anyparam:${legacyUuid}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-anyparam-${digest}`;
};

const isWorkbookInputPath = (inputPath: string): boolean => /\.(xlsx|xls)$/i.test(inputPath);

const readLegacyAnyParamRows = async (inputPath: string): Promise<LegacyAnyParamRow[]> => {
  if (isWorkbookInputPath(inputPath)) {
    return parseFilemakerLegacyAnyParamWorkbookRows(await readFile(inputPath));
  }
  return parseFilemakerLegacyAnyParamRows(await readFile(inputPath, 'utf8'));
};

const collectAnyParams = (rows: LegacyAnyParamRow[]): {
  anyParams: Map<string, ParsedLegacyAnyParam>;
  duplicateLegacyUuidCount: number;
  skippedRowCount: number;
} => {
  const anyParams = new Map<string, ParsedLegacyAnyParam>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((row: LegacyAnyParamRow): void => {
    const anyParam = parseAnyParamFromRow(row);
    if (anyParam === null) {
      skippedRowCount += 1;
      return;
    }
    if (anyParams.has(anyParam.legacyUuid)) duplicateLegacyUuidCount += 1;
    anyParams.set(anyParam.legacyUuid, anyParam);
  });

  return { anyParams, duplicateLegacyUuidCount, skippedRowCount };
};

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const buildOwnerName = (
  document: Document,
  kind: FilemakerAnyParamOwnerKind
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
  input: { collectionName: string; kind: FilemakerAnyParamOwnerKind }
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

const buildValueMapFromMongo = async (db: Db): Promise<Map<string, ValueLookupRecord>> => {
  const valueDocuments = await db
    .collection<ValueCatalogDocument>(VALUES_COLLECTION)
    .find(
      { legacyUuid: { $type: 'string' } },
      { projection: { id: 1, label: 1, legacyUuid: 1, parentId: 1 } }
    )
    .toArray();
  return new Map(
    valueDocuments
      .map((document: ValueCatalogDocument): [string, ValueLookupRecord] | null => {
        const id = typeof document.id === 'string' ? document.id : '';
        const label = typeof document.label === 'string' ? document.label : '';
        const legacyUuid =
          typeof document.legacyUuid === 'string' ? document.legacyUuid.toUpperCase() : '';
        const parentId =
          typeof document.parentId === 'string' && document.parentId.length > 0
            ? document.parentId
            : null;
        if (!id || !legacyUuid) return null;
        return [legacyUuid, { id, label, legacyUuid, parentId }];
      })
      .filter((entry): entry is [string, ValueLookupRecord] => entry !== null)
  );
};

const buildValueMapFromSettings = async (db: Db): Promise<Map<string, ValueLookupRecord>> => {
  const document = await db
    .collection(SETTINGS_COLLECTION)
    .findOne({ key: FILEMAKER_DATABASE_KEY }, { projection: { value: 1 } });
  const rawValue = typeof document?.['value'] === 'string' ? document['value'] : '';
  if (rawValue.length === 0) return new Map();
  const database = parseFilemakerDatabase(decodeSettingValue(FILEMAKER_DATABASE_KEY, rawValue));
  return new Map(
    database.values
      .map((value: FilemakerValue): [string, ValueLookupRecord] | null => {
        const legacyUuid = typeof value.legacyUuid === 'string' ? value.legacyUuid.toUpperCase() : '';
        if (legacyUuid.length === 0) return null;
        return [
          legacyUuid,
          {
            id: value.id,
            label: value.label,
            legacyUuid,
            parentId: value.parentId,
          },
        ];
      })
      .filter((entry): entry is [string, ValueLookupRecord] => entry !== null)
  );
};

const buildValueMap = async (db: Db): Promise<Map<string, ValueLookupRecord>> => {
  const mongoValueMap = await buildValueMapFromMongo(db);
  return mongoValueMap.size > 0 ? mongoValueMap : buildValueMapFromSettings(db);
};

const toAnyParamValueDocument = (
  legacyValueUuid: string,
  levelIndex: number,
  value: ValueLookupRecord | undefined
): FilemakerAnyParamValue => {
  const valueFields =
    value === undefined
      ? {}
      : {
          label: value.label,
          ...(value.parentId !== undefined ? { parentId: value.parentId } : {}),
          valueId: value.id,
        };
  return {
    ...valueFields,
    legacyValueUuid,
    level: levelIndex + 1,
  };
};

const toTextValueDocument = (
  textValue: ParsedLegacyAnyParamText
): FilemakerAnyParamTextValue => ({
  field: textValue.field,
  slot: textValue.slot,
  value: textValue.value,
});

const resolveOwner = (
  anyParam: ParsedLegacyAnyParam,
  ownerByLegacyUuid: Map<string, OwnerLookupRecord[]>
): OwnerLookupRecord | undefined => ownerByLegacyUuid.get(anyParam.legacyOwnerUuid)?.[0];

const toAnyParamDocument = (input: {
  anyParam: ParsedLegacyAnyParam;
  importBatchId: string;
  importedAt: Date;
  owner: OwnerLookupRecord | undefined;
  valueByLegacyUuid: Map<string, ValueLookupRecord>;
}): FilemakerAnyParamMongoDocument => {
  const id = createModernId(input.anyParam.legacyUuid);
  const values = input.anyParam.legacyValueUuids.map((legacyValueUuid: string, index: number) =>
    toAnyParamValueDocument(legacyValueUuid, index, input.valueByLegacyUuid.get(legacyValueUuid))
  );
  const valueIds = values
    .map((value: FilemakerAnyParamValue): string => value.valueId ?? '')
    .filter((valueId: string): boolean => valueId.length > 0);
  return {
    _id: id,
    ...(input.anyParam.createdAt ? { createdAt: input.anyParam.createdAt } : {}),
    ...(input.anyParam.createdBy ? { createdBy: input.anyParam.createdBy } : {}),
    id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    importSourceKind: IMPORT_SOURCE_KIND,
    legacyOwnerUuid: input.anyParam.legacyOwnerUuid,
    legacyUuid: input.anyParam.legacyUuid,
    legacyValueUuids: input.anyParam.legacyValueUuids,
    ...(input.owner ? { ownerId: input.owner.id, ownerKind: input.owner.kind } : {}),
    ...(input.owner?.name ? { ownerName: input.owner.name } : {}),
    schemaVersion: 1,
    textValues: input.anyParam.textValues.map(toTextValueDocument),
    ...(input.anyParam.updatedAt ? { updatedAt: input.anyParam.updatedAt } : {}),
    ...(input.anyParam.updatedBy ? { updatedBy: input.anyParam.updatedBy } : {}),
    valueIds,
    values,
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
    db.collection(ANYPARAMS_COLLECTION).createIndex(
      { legacyUuid: 1 },
      { name: 'filemaker_anyparams_legacy_uuid_unique', unique: true }
    ),
    db.collection(ANYPARAMS_COLLECTION).createIndex(
      { ownerKind: 1, ownerId: 1 },
      {
        name: 'filemaker_anyparams_owner',
        partialFilterExpression: { ownerId: { $type: 'string' } },
      }
    ),
    db.collection(ANYPARAMS_COLLECTION).createIndex(
      { legacyOwnerUuid: 1 },
      { name: 'filemaker_anyparams_legacy_owner_uuid' }
    ),
    db.collection(ANYPARAMS_COLLECTION).createIndex(
      { valueIds: 1 },
      { name: 'filemaker_anyparams_value_ids' }
    ),
    db.collection(ANYPARAMS_COLLECTION).createIndex(
      { legacyValueUuids: 1 },
      { name: 'filemaker_anyparams_legacy_value_uuids' }
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

  const parsedRows = await readLegacyAnyParamRows(options.inputPath);
  const collected = collectAnyParams(parsedRows);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const collection = db.collection<FilemakerAnyParamMongoDocument>(ANYPARAMS_COLLECTION);
    const replacedCollection =
      !options.dryRun && options.replaceCollection
        ? await dropCollectionIfExists(db.collection(ANYPARAMS_COLLECTION))
        : false;
    if (!options.dryRun && !options.replaceCollection) await ensureIndexes(db);

    const ownerByLegacyUuid = await buildOwnerMap(db);
    const valueByLegacyUuid = await buildValueMap(db);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const anyParamDocuments = Array.from(collected.anyParams.values()).map(
      (anyParam: ParsedLegacyAnyParam): FilemakerAnyParamMongoDocument =>
        toAnyParamDocument({
          anyParam,
          importBatchId,
          importedAt,
          owner: resolveOwner(anyParam, ownerByLegacyUuid),
          valueByLegacyUuid,
        })
    );
    const anyParamWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : options.replaceCollection
        ? await runInsertWrites(collection, anyParamDocuments, options.batchSize)
        : await runBulkWrites(collection, anyParamDocuments, options.batchSize);
    if (!options.dryRun) await ensureIndexes(db);

    const totalLegacyValueUuidCount = anyParamDocuments.reduce(
      (total: number, anyParam: FilemakerAnyParamMongoDocument): number =>
        total + anyParam.legacyValueUuids.length,
      0
    );
    const resolvedValueUuidCount = anyParamDocuments.reduce(
      (total: number, anyParam: FilemakerAnyParamMongoDocument): number =>
        total + anyParam.valueIds.length,
      0
    );
    const ambiguousOwnerLinkCount = anyParamDocuments.filter((anyParam): boolean => {
      const owners = ownerByLegacyUuid.get(anyParam.legacyOwnerUuid) ?? [];
      return owners.length > 1;
    }).length;

    console.log(
      JSON.stringify(
        {
          ambiguousOwnerLinkCount,
          anyParamWrite,
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
          resolvedOwnerLinkCount: anyParamDocuments.filter(
            (anyParam: FilemakerAnyParamMongoDocument): boolean =>
              typeof anyParam.ownerId === 'string'
          ).length,
          resolvedValueUuidCount,
          skippedRowCount: collected.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          totalLegacyValueUuidCount,
          uniqueAnyParamCount: collected.anyParams.size,
          unresolvedOwnerLinkCount: anyParamDocuments.filter(
            (anyParam: FilemakerAnyParamMongoDocument): boolean =>
              typeof anyParam.ownerId !== 'string'
          ).length,
          unresolvedValueUuidCount: totalLegacyValueUuidCount - resolvedValueUuidCount,
          valueLookupCount: valueByLegacyUuid.size,
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
