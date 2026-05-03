import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';

import {
  parseFilemakerLegacyPersonOccupationRows,
  parseFilemakerLegacyPersonOccupationWorkbookRows,
  parsePersonOccupationFromRow,
  type LegacyPersonOccupationRow,
  type ParsedLegacyPersonOccupation,
} from '@/features/filemaker/filemaker-person-occupations-import.parser';
import type {
  FilemakerPersonOccupationValue,
} from '@/features/filemaker/filemaker-person-occupation.types';
import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { parseFilemakerDatabase } from '@/features/filemaker/settings/database-getters';
import type { FilemakerValue } from '@/features/filemaker/types';
import type { MongoSource } from '@/shared/contracts/database';
import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const OCCUPATIONS_COLLECTION = 'filemaker_person_occupations';
const PERSONS_COLLECTION = 'filemaker_persons';
const VALUES_COLLECTION = 'filemaker_values';
const SETTINGS_COLLECTION = 'settings';
const DEFAULT_BATCH_SIZE = 5_000;
const DEFAULT_INPUT = 'csv/b/occupation.xlsx';
const IMPORT_SOURCE_KIND = 'filemaker.person_occupation';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string;
  replaceCollection: boolean;
  source: MongoSource | undefined;
};

type PersonLookupRecord = {
  id: string;
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

type FilemakerPersonOccupationMongoDocument = Document & {
  _id: string;
  createdAt?: string;
  createdBy?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  legacyPersonUuid: string;
  legacyUuid: string;
  legacyValueUuids: string[];
  personId?: string;
  personName?: string;
  schemaVersion: 1;
  updatedAt?: string;
  updatedBy?: string;
  valueIds: string[];
  values: FilemakerPersonOccupationValue[];
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
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-person-occupations-to-mongo.ts --input=csv/b/occupation.xlsx --write',
      '',
      'Imports FileMaker person occupation CSV/TSV/XLSX exports into filemaker_person_occupations.',
      'UUID_Related is resolved against imported persons.',
      'option1..option3 are retained as ordered legacy value UUIDs and linked to modern FileMaker value IDs when present.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild only the person occupation collection.',
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
    inputPath: DEFAULT_INPUT,
    replaceCollection: false,
    source: undefined,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') options.dryRun = false;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--replace') options.replaceCollection = true;
    if (arg.startsWith('--input=')) {
      options.inputPath = arg.slice('--input='.length).trim() || DEFAULT_INPUT;
    }
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parsePositiveInteger(arg.slice('--batch-size='.length), DEFAULT_BATCH_SIZE);
    }
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length).trim();
      if (source === 'local' || source === 'cloud') options.source = source;
    }
    if (!arg.startsWith('--')) options.inputPath = arg.trim() || DEFAULT_INPUT;
  });

  return options;
};

const createModernId = (legacyUuid: string): string => {
  const digest = createHash('sha256')
    .update(`filemaker.person_occupation:${legacyUuid}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-person-occupation-${digest}`;
};

const isWorkbookInputPath = (inputPath: string): boolean => /\.(xlsx|xls)$/i.test(inputPath);

const readLegacyOccupationRows = async (
  inputPath: string
): Promise<LegacyPersonOccupationRow[]> => {
  if (isWorkbookInputPath(inputPath)) {
    return parseFilemakerLegacyPersonOccupationWorkbookRows(await readFile(inputPath));
  }
  return parseFilemakerLegacyPersonOccupationRows(await readFile(inputPath, 'utf8'));
};

const collectOccupations = (rows: LegacyPersonOccupationRow[]): {
  duplicateLegacyUuidCount: number;
  occupations: Map<string, ParsedLegacyPersonOccupation>;
  skippedRowCount: number;
} => {
  const occupations = new Map<string, ParsedLegacyPersonOccupation>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((row: LegacyPersonOccupationRow): void => {
    const occupation = parsePersonOccupationFromRow(row);
    if (occupation === null) {
      skippedRowCount += 1;
      return;
    }
    if (occupations.has(occupation.legacyUuid)) duplicateLegacyUuidCount += 1;
    occupations.set(occupation.legacyUuid, occupation);
  });

  return { duplicateLegacyUuidCount, occupations, skippedRowCount };
};

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const buildPersonName = (document: Document): string | undefined => {
  const fullName = optionalString(document['fullName']);
  if (fullName !== undefined) return fullName;
  const name = [document['firstName'], document['lastName']]
    .map(optionalString)
    .filter((part): part is string => part !== undefined)
    .join(' ');
  return name.length > 0 ? name : undefined;
};

const buildPersonMap = async (db: Db): Promise<Map<string, PersonLookupRecord>> => {
  const documents = await db
    .collection(PERSONS_COLLECTION)
    .find(
      { legacyUuid: { $type: 'string' } },
      {
        projection: {
          firstName: 1,
          fullName: 1,
          id: 1,
          lastName: 1,
          legacyUuid: 1,
        },
      }
    )
    .toArray();
  return new Map(
    documents
      .map((document: Document): [string, PersonLookupRecord] | null => {
        const id = optionalString(document['id']);
        const legacyUuid = optionalString(document['legacyUuid'])?.toUpperCase();
        if (id === undefined || legacyUuid === undefined) return null;
        return [legacyUuid, { id, legacyUuid, name: buildPersonName(document) }];
      })
      .filter((entry): entry is [string, PersonLookupRecord] => entry !== null)
  );
};

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
        if (!id || !legacyUuid) return null;
        return [
          legacyUuid,
          {
            id,
            label,
            legacyUuid,
            parentId: typeof document.parentId === 'string' ? document.parentId : null,
          },
        ];
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

const toOccupationValues = (
  occupation: ParsedLegacyPersonOccupation,
  valueByLegacyUuid: Map<string, ValueLookupRecord>
): FilemakerPersonOccupationValue[] =>
  occupation.legacyValueUuids.map(
    (legacyValueUuid: string, index: number): FilemakerPersonOccupationValue => {
      const value = valueByLegacyUuid.get(legacyValueUuid);
      return {
        legacyValueUuid,
        level: index + 1,
        ...(value ? { label: value.label, parentId: value.parentId, valueId: value.id } : {}),
      };
    }
  );

const toOccupationDocument = (input: {
  importBatchId: string;
  importedAt: Date;
  occupation: ParsedLegacyPersonOccupation;
  person: PersonLookupRecord | undefined;
  valueByLegacyUuid: Map<string, ValueLookupRecord>;
}): FilemakerPersonOccupationMongoDocument => {
  const id = createModernId(input.occupation.legacyUuid);
  const values = toOccupationValues(input.occupation, input.valueByLegacyUuid);
  return {
    _id: id,
    ...(input.occupation.createdAt ? { createdAt: input.occupation.createdAt } : {}),
    ...(input.occupation.createdBy ? { createdBy: input.occupation.createdBy } : {}),
    id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    importSourceKind: IMPORT_SOURCE_KIND,
    legacyPersonUuid: input.occupation.legacyPersonUuid,
    legacyUuid: input.occupation.legacyUuid,
    legacyValueUuids: input.occupation.legacyValueUuids,
    ...(input.person ? { personId: input.person.id } : {}),
    ...(input.person?.name ? { personName: input.person.name } : {}),
    schemaVersion: 1,
    ...(input.occupation.updatedAt ? { updatedAt: input.occupation.updatedAt } : {}),
    ...(input.occupation.updatedBy ? { updatedBy: input.occupation.updatedBy } : {}),
    valueIds: values
      .map((value: FilemakerPersonOccupationValue): string | undefined => value.valueId)
      .filter((valueId): valueId is string => valueId !== undefined),
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
    db.collection(OCCUPATIONS_COLLECTION).createIndex(
      { legacyUuid: 1 },
      { name: 'filemaker_person_occupations_legacy_uuid_unique', unique: true }
    ),
    db.collection(OCCUPATIONS_COLLECTION).createIndex(
      { personId: 1 },
      {
        name: 'filemaker_person_occupations_person_id',
        partialFilterExpression: { personId: { $type: 'string' } },
      }
    ),
    db.collection(OCCUPATIONS_COLLECTION).createIndex(
      { legacyPersonUuid: 1 },
      { name: 'filemaker_person_occupations_legacy_person_uuid' }
    ),
    db.collection(OCCUPATIONS_COLLECTION).createIndex(
      { valueIds: 1 },
      { name: 'filemaker_person_occupations_value_ids' }
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
  if (options.inputPath.length === 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const parsedRows = await readLegacyOccupationRows(options.inputPath);
  const collected = collectOccupations(parsedRows);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const collection = db.collection<FilemakerPersonOccupationMongoDocument>(
      OCCUPATIONS_COLLECTION
    );
    const replacedCollection =
      !options.dryRun && options.replaceCollection
        ? await dropCollectionIfExists(db.collection(OCCUPATIONS_COLLECTION))
        : false;
    if (!options.dryRun && !options.replaceCollection) await ensureIndexes(db);

    const personByLegacyUuid = await buildPersonMap(db);
    const valueByLegacyUuid = await buildValueMap(db);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const occupationDocuments = Array.from(collected.occupations.values()).map(
      (occupation: ParsedLegacyPersonOccupation): FilemakerPersonOccupationMongoDocument =>
        toOccupationDocument({
          importBatchId,
          importedAt,
          occupation,
          person: personByLegacyUuid.get(occupation.legacyPersonUuid),
          valueByLegacyUuid,
        })
    );

    const occupationWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : options.replaceCollection
        ? await runInsertWrites(collection, occupationDocuments, options.batchSize)
        : await runBulkWrites(collection, occupationDocuments, options.batchSize);
    if (!options.dryRun) await ensureIndexes(db);

    const totalValueUuidCount = occupationDocuments.reduce(
      (total: number, occupation: FilemakerPersonOccupationMongoDocument): number =>
        total + occupation.legacyValueUuids.length,
      0
    );
    const resolvedValueUuidCount = occupationDocuments.reduce(
      (total: number, occupation: FilemakerPersonOccupationMongoDocument): number =>
        total + occupation.valueIds.length,
      0
    );
    const resolvedPersonLinkCount = occupationDocuments.filter(
      (occupation: FilemakerPersonOccupationMongoDocument): boolean =>
        typeof occupation.personId === 'string'
    ).length;

    console.log(
      JSON.stringify(
        {
          duplicateLegacyUuidCount: collected.duplicateLegacyUuidCount,
          importBatchId: options.dryRun ? null : importBatchId,
          inputFormat: isWorkbookInputPath(options.inputPath)
            ? extname(options.inputPath).slice(1) || 'workbook'
            : 'text',
          inputPath: options.inputPath,
          mode: options.dryRun ? 'dry-run' : 'write',
          occupationWrite,
          parsedRowCount: parsedRows.length,
          personLookupCount: personByLegacyUuid.size,
          replacedCollection,
          resolvedPersonLinkCount,
          resolvedValueUuidCount,
          skippedRowCount: collected.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          totalValueUuidCount,
          uniqueOccupationCount: collected.occupations.size,
          unresolvedPersonLinkCount: occupationDocuments.length - resolvedPersonLinkCount,
          unresolvedValueUuidCount: totalValueUuidCount - resolvedValueUuidCount,
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
