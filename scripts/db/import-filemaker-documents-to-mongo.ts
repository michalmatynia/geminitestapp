import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';

import {
  parseDocumentFromRow,
  parseFilemakerLegacyDocumentRows,
  parseFilemakerLegacyDocumentWorkbookRows,
  type LegacyDocumentRow,
  type ParsedLegacyDocument,
} from '@/features/filemaker/filemaker-documents-import.parser';
import type { FilemakerDocumentOwnerKind } from '@/features/filemaker/filemaker-document.types';
import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { parseFilemakerDatabase } from '@/features/filemaker/settings/database-getters';
import type { FilemakerValue } from '@/features/filemaker/types';
import type { MongoSource } from '@/shared/contracts/database';
import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const DOCUMENTS_COLLECTION = 'filemaker_documents';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const PERSONS_COLLECTION = 'filemaker_persons';
const EVENTS_COLLECTION = 'filemaker_events';
const VALUES_COLLECTION = 'filemaker_values';
const SETTINGS_COLLECTION = 'settings';
const DEFAULT_BATCH_SIZE = 5_000;
const DEFAULT_INPUT = 'csv/b/documentBook.xlsx';
const IMPORT_SOURCE_KIND = 'filemaker.document';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string;
  replaceCollection: boolean;
  source: MongoSource | undefined;
};

type OwnerLookupRecord = {
  id: string;
  kind: FilemakerDocumentOwnerKind;
  legacyUuid: string;
  name?: string;
};

type ValueLookupRecord = {
  id: string;
  label: string;
  legacyUuid: string;
};

type ValueCatalogDocument = Document & {
  id?: unknown;
  label?: unknown;
  legacyUuid?: unknown;
};

type FilemakerDocumentMongoDocument = Document & {
  _id: string;
  codeA?: string;
  codeB?: string;
  comment?: string;
  createdAt?: string;
  documentName?: string;
  documentTypeLabel?: string;
  documentTypeValueId?: string;
  expiryDate?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  issueDate?: string;
  issuedBy?: string;
  legacyDocumentTypeUuid?: string;
  legacyOwnerUuid?: string;
  legacyUuid: string;
  ownerId?: string;
  ownerKind?: FilemakerDocumentOwnerKind;
  ownerName?: string;
  schemaVersion: 1;
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
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-documents-to-mongo.ts --input=csv/b/documentBook.xlsx --write',
      '',
      'Imports FileMaker document CSV/TSV/XLSX exports into filemaker_documents.',
      'Parent_UUID_FK is resolved against imported organizations, persons, and events.',
      'DocumentType_UUID_FK is retained and linked to a modern FileMaker value ID when present.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild only the document collection.',
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
    .update(`filemaker.document:${legacyUuid}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-document-${digest}`;
};

const isWorkbookInputPath = (inputPath: string): boolean => /\.(xlsx|xls)$/i.test(inputPath);

const readLegacyDocumentRows = async (inputPath: string): Promise<LegacyDocumentRow[]> => {
  if (isWorkbookInputPath(inputPath)) {
    return parseFilemakerLegacyDocumentWorkbookRows(await readFile(inputPath));
  }
  return parseFilemakerLegacyDocumentRows(await readFile(inputPath, 'utf8'));
};

const collectDocuments = (rows: LegacyDocumentRow[]): {
  documents: Map<string, ParsedLegacyDocument>;
  duplicateLegacyUuidCount: number;
  skippedRowCount: number;
} => {
  const documents = new Map<string, ParsedLegacyDocument>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((row: LegacyDocumentRow): void => {
    const document = parseDocumentFromRow(row);
    if (document === null) {
      skippedRowCount += 1;
      return;
    }
    if (documents.has(document.legacyUuid)) duplicateLegacyUuidCount += 1;
    documents.set(document.legacyUuid, document);
  });

  return { documents, duplicateLegacyUuidCount, skippedRowCount };
};

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const buildOwnerName = (
  document: Document,
  kind: FilemakerDocumentOwnerKind
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
  input: { collectionName: string; kind: FilemakerDocumentOwnerKind }
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
    .find({ legacyUuid: { $type: 'string' } }, { projection: { id: 1, label: 1, legacyUuid: 1 } })
    .toArray();
  return new Map(
    valueDocuments
      .map((document: ValueCatalogDocument): [string, ValueLookupRecord] | null => {
        const id = typeof document.id === 'string' ? document.id : '';
        const label = typeof document.label === 'string' ? document.label : '';
        const legacyUuid =
          typeof document.legacyUuid === 'string' ? document.legacyUuid.toUpperCase() : '';
        if (!id || !legacyUuid) return null;
        return [legacyUuid, { id, label, legacyUuid }];
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
        return [legacyUuid, { id: value.id, label: value.label, legacyUuid }];
      })
      .filter((entry): entry is [string, ValueLookupRecord] => entry !== null)
  );
};

const buildValueMap = async (db: Db): Promise<Map<string, ValueLookupRecord>> => {
  const mongoValueMap = await buildValueMapFromMongo(db);
  return mongoValueMap.size > 0 ? mongoValueMap : buildValueMapFromSettings(db);
};

const resolveOwner = (
  document: ParsedLegacyDocument,
  ownerByLegacyUuid: Map<string, OwnerLookupRecord[]>
): OwnerLookupRecord | undefined =>
  document.legacyOwnerUuid === undefined
    ? undefined
    : ownerByLegacyUuid.get(document.legacyOwnerUuid)?.[0];

const toDocumentDocument = (input: {
  document: ParsedLegacyDocument;
  documentType: ValueLookupRecord | undefined;
  importBatchId: string;
  importedAt: Date;
  owner: OwnerLookupRecord | undefined;
}): FilemakerDocumentMongoDocument => {
  const id = createModernId(input.document.legacyUuid);
  return {
    _id: id,
    ...(input.document.codeA ? { codeA: input.document.codeA } : {}),
    ...(input.document.codeB ? { codeB: input.document.codeB } : {}),
    ...(input.document.comment ? { comment: input.document.comment } : {}),
    ...(input.document.createdAt ? { createdAt: input.document.createdAt } : {}),
    ...(input.document.documentName ? { documentName: input.document.documentName } : {}),
    ...(input.documentType
      ? { documentTypeLabel: input.documentType.label, documentTypeValueId: input.documentType.id }
      : {}),
    ...(input.document.expiryDate ? { expiryDate: input.document.expiryDate } : {}),
    id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    importSourceKind: IMPORT_SOURCE_KIND,
    ...(input.document.issueDate ? { issueDate: input.document.issueDate } : {}),
    ...(input.document.issuedBy ? { issuedBy: input.document.issuedBy } : {}),
    ...(input.document.legacyDocumentTypeUuid
      ? { legacyDocumentTypeUuid: input.document.legacyDocumentTypeUuid }
      : {}),
    ...(input.document.legacyOwnerUuid ? { legacyOwnerUuid: input.document.legacyOwnerUuid } : {}),
    legacyUuid: input.document.legacyUuid,
    ...(input.owner ? { ownerId: input.owner.id, ownerKind: input.owner.kind } : {}),
    ...(input.owner?.name ? { ownerName: input.owner.name } : {}),
    schemaVersion: 1,
    ...(input.document.updatedAt ? { updatedAt: input.document.updatedAt } : {}),
    ...(input.document.updatedBy ? { updatedBy: input.document.updatedBy } : {}),
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
    db.collection(DOCUMENTS_COLLECTION).createIndex(
      { legacyUuid: 1 },
      { name: 'filemaker_documents_legacy_uuid_unique', unique: true }
    ),
    db.collection(DOCUMENTS_COLLECTION).createIndex(
      { ownerKind: 1, ownerId: 1 },
      {
        name: 'filemaker_documents_owner',
        partialFilterExpression: { ownerId: { $type: 'string' } },
      }
    ),
    db.collection(DOCUMENTS_COLLECTION).createIndex(
      { legacyOwnerUuid: 1 },
      { name: 'filemaker_documents_legacy_owner_uuid' }
    ),
    db.collection(DOCUMENTS_COLLECTION).createIndex(
      { documentTypeValueId: 1 },
      {
        name: 'filemaker_documents_type_value_id',
        partialFilterExpression: { documentTypeValueId: { $type: 'string' } },
      }
    ),
    db.collection(DOCUMENTS_COLLECTION).createIndex(
      { legacyDocumentTypeUuid: 1 },
      {
        name: 'filemaker_documents_legacy_type_uuid',
        partialFilterExpression: { legacyDocumentTypeUuid: { $type: 'string' } },
      }
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

const countByOwnerKind = (
  documents: FilemakerDocumentMongoDocument[]
): Record<FilemakerDocumentOwnerKind | 'unresolved', number> =>
  documents.reduce<Record<FilemakerDocumentOwnerKind | 'unresolved', number>>(
    (counts, document): Record<FilemakerDocumentOwnerKind | 'unresolved', number> => {
      const key = document.ownerKind ?? 'unresolved';
      counts[key] += 1;
      return counts;
    },
    { event: 0, organization: 0, person: 0, unresolved: 0 }
  );

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (options.inputPath.length === 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const parsedRows = await readLegacyDocumentRows(options.inputPath);
  const collected = collectDocuments(parsedRows);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const collection = db.collection<FilemakerDocumentMongoDocument>(DOCUMENTS_COLLECTION);
    const replacedCollection =
      !options.dryRun && options.replaceCollection
        ? await dropCollectionIfExists(db.collection(DOCUMENTS_COLLECTION))
        : false;
    if (!options.dryRun && !options.replaceCollection) await ensureIndexes(db);

    const ownerByLegacyUuid = await buildOwnerMap(db);
    const valueByLegacyUuid = await buildValueMap(db);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const documentDocuments = Array.from(collected.documents.values()).map(
      (document: ParsedLegacyDocument): FilemakerDocumentMongoDocument => {
        const owner = resolveOwner(document, ownerByLegacyUuid);
        const documentType =
          document.legacyDocumentTypeUuid === undefined
            ? undefined
            : valueByLegacyUuid.get(document.legacyDocumentTypeUuid);
        return toDocumentDocument({
          document,
          documentType,
          importBatchId,
          importedAt,
          owner,
        });
      }
    );

    const documentWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : options.replaceCollection
        ? await runInsertWrites(collection, documentDocuments, options.batchSize)
        : await runBulkWrites(collection, documentDocuments, options.batchSize);
    if (!options.dryRun) await ensureIndexes(db);

    const totalDocumentTypeUuidCount = documentDocuments.filter(
      (document: FilemakerDocumentMongoDocument): boolean =>
        typeof document.legacyDocumentTypeUuid === 'string'
    ).length;
    const resolvedDocumentTypeUuidCount = documentDocuments.filter(
      (document: FilemakerDocumentMongoDocument): boolean =>
        typeof document.documentTypeValueId === 'string'
    ).length;
    const ambiguousOwnerLinkCount = documentDocuments.filter((document): boolean => {
      const legacyOwnerUuid = document.legacyOwnerUuid;
      return legacyOwnerUuid !== undefined && (ownerByLegacyUuid.get(legacyOwnerUuid)?.length ?? 0) > 1;
    }).length;
    const resolvedOwnerLinkCount = documentDocuments.filter(
      (document: FilemakerDocumentMongoDocument): boolean => typeof document.ownerId === 'string'
    ).length;
    const missingOwnerUuidCount = documentDocuments.filter(
      (document: FilemakerDocumentMongoDocument): boolean =>
        typeof document.legacyOwnerUuid !== 'string'
    ).length;
    const unresolvedLegacyOwnerUuidCount =
      documentDocuments.length - resolvedOwnerLinkCount - missingOwnerUuidCount;

    console.log(
      JSON.stringify(
        {
          ambiguousOwnerLinkCount,
          documentWrite,
          duplicateLegacyUuidCount: collected.duplicateLegacyUuidCount,
          importBatchId: options.dryRun ? null : importBatchId,
          inputFormat: isWorkbookInputPath(options.inputPath)
            ? extname(options.inputPath).slice(1) || 'workbook'
            : 'text',
          inputPath: options.inputPath,
          missingOwnerUuidCount,
          mode: options.dryRun ? 'dry-run' : 'write',
          ownerKindCounts: countByOwnerKind(documentDocuments),
          ownerLookupCount: ownerByLegacyUuid.size,
          parsedRowCount: parsedRows.length,
          replacedCollection,
          resolvedDocumentTypeUuidCount,
          resolvedOwnerLinkCount,
          skippedRowCount: collected.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          totalDocumentTypeUuidCount,
          uniqueDocumentCount: collected.documents.size,
          unresolvedDocumentTypeUuidCount:
            totalDocumentTypeUuidCount - resolvedDocumentTypeUuidCount,
          unresolvedLegacyOwnerUuidCount,
          unresolvedOwnerLinkCount: documentDocuments.length - resolvedOwnerLinkCount,
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
