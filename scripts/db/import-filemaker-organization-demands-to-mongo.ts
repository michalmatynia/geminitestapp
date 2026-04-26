import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';

import {
  parseFilemakerLegacyOrganizationDemandRows,
  parseFilemakerLegacyOrganizationDemandWorkbookRows,
  parseOrganizationDemandFromRow,
  type LegacyOrganizationDemandRow,
  type ParsedLegacyOrganizationDemand,
} from '@/features/filemaker/filemaker-organization-demands-import.parser';
import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { parseFilemakerDatabase } from '@/features/filemaker/settings/database-getters';
import type { FilemakerValue } from '@/features/filemaker/types';
import type { MongoSource } from '@/shared/contracts/database';
import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const ORGANIZATION_DEMANDS_COLLECTION = 'filemaker_organization_demands';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const SETTINGS_COLLECTION = 'settings';
const DEFAULT_BATCH_SIZE = 5_000;
const IMPORT_SOURCE_KIND = 'filemaker.organization_demand';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string | null;
  replaceCollection: boolean;
  source: MongoSource | undefined;
};

type OrganizationLookupRecord = {
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

type OrganizationDemandValueMongoDocument = {
  label?: string;
  legacyValueUuid: string;
  level: number;
  parentId?: string | null;
  valueId?: string;
};

type FilemakerOrganizationDemandMongoDocument = Document & {
  _id: string;
  createdAt?: string;
  createdBy?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  legacyOrganizationUuid: string;
  legacyUuid: string;
  legacyValueUuids: string[];
  organizationId?: string;
  organizationName?: string;
  schemaVersion: 1;
  updatedAt?: string;
  updatedBy?: string;
  valueIds: string[];
  values: OrganizationDemandValueMongoDocument[];
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
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-organization-demands-to-mongo.ts --input=csv/demandHeader.xlsx --write',
      '',
      'Imports FileMaker organization Demand XLSX exports and headerless TAB/CSV exports into filemaker_organization_demands.',
      'option1..option4 are retained as ordered legacy value UUIDs and linked to modern FileMaker value IDs when present.',
      'UUID_Related is resolved against filemaker_organizations.legacyUuid.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild only the demand collection.',
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
    .update(`filemaker.organization_demand:${legacyUuid}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-organization-demand-${digest}`;
};

const isWorkbookInputPath = (inputPath: string): boolean => /\.(xlsx|xls)$/i.test(inputPath);

const readLegacyOrganizationDemandRows = async (
  inputPath: string
): Promise<LegacyOrganizationDemandRow[]> => {
  if (isWorkbookInputPath(inputPath)) {
    return parseFilemakerLegacyOrganizationDemandWorkbookRows(await readFile(inputPath));
  }
  return parseFilemakerLegacyOrganizationDemandRows(await readFile(inputPath, 'utf8'));
};

const collectDemands = (rows: LegacyOrganizationDemandRow[]): {
  demands: Map<string, ParsedLegacyOrganizationDemand>;
  duplicateLegacyUuidCount: number;
  skippedRowCount: number;
} => {
  const demands = new Map<string, ParsedLegacyOrganizationDemand>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((row: LegacyOrganizationDemandRow): void => {
    const demand = parseOrganizationDemandFromRow(row);
    if (demand === null) {
      skippedRowCount += 1;
      return;
    }
    if (demands.has(demand.legacyUuid)) duplicateLegacyUuidCount += 1;
    demands.set(demand.legacyUuid, demand);
  });

  return { demands, duplicateLegacyUuidCount, skippedRowCount };
};

const buildOrganizationMap = async (db: Db): Promise<Map<string, OrganizationLookupRecord>> => {
  const documents = await db
    .collection(ORGANIZATIONS_COLLECTION)
    .find(
      { legacyUuid: { $type: 'string' } },
      { projection: { id: 1, legacyUuid: 1, name: 1 } }
    )
    .toArray();
  return new Map(
    documents
      .map((document: Document): [string, OrganizationLookupRecord] | null => {
        const id = typeof document['id'] === 'string' ? document['id'] : '';
        const legacyUuid = typeof document['legacyUuid'] === 'string' ? document['legacyUuid'] : '';
        if (!id || !legacyUuid) return null;
        const name = typeof document['name'] === 'string' ? document['name'] : undefined;
        return [legacyUuid, { id, legacyUuid, ...(name ? { name } : {}) }];
      })
      .filter((entry): entry is [string, OrganizationLookupRecord] => entry !== null)
  );
};

const buildValueMap = async (db: Db): Promise<Map<string, ValueLookupRecord>> => {
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

const toDemandValueDocument = (
  legacyValueUuid: string,
  levelIndex: number,
  value: ValueLookupRecord | undefined
): OrganizationDemandValueMongoDocument => ({
  ...(value ? { label: value.label, parentId: value.parentId, valueId: value.id } : {}),
  legacyValueUuid,
  level: levelIndex + 1,
});

const toDemandDocument = (input: {
  demand: ParsedLegacyOrganizationDemand;
  importBatchId: string;
  importedAt: Date;
  organization: OrganizationLookupRecord | undefined;
  valueByLegacyUuid: Map<string, ValueLookupRecord>;
}): FilemakerOrganizationDemandMongoDocument => {
  const id = createModernId(input.demand.legacyUuid);
  const values = input.demand.legacyValueUuids.map((legacyValueUuid: string, index: number) =>
    toDemandValueDocument(legacyValueUuid, index, input.valueByLegacyUuid.get(legacyValueUuid))
  );
  const valueIds = values
    .map((value: OrganizationDemandValueMongoDocument): string => value.valueId ?? '')
    .filter((valueId: string): boolean => valueId.length > 0);
  return {
    _id: id,
    ...(input.demand.createdAt ? { createdAt: input.demand.createdAt } : {}),
    ...(input.demand.createdBy ? { createdBy: input.demand.createdBy } : {}),
    id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    importSourceKind: IMPORT_SOURCE_KIND,
    legacyOrganizationUuid: input.demand.legacyOrganizationUuid,
    legacyUuid: input.demand.legacyUuid,
    legacyValueUuids: input.demand.legacyValueUuids,
    ...(input.organization
      ? { organizationId: input.organization.id, organizationName: input.organization.name }
      : {}),
    schemaVersion: 1,
    ...(input.demand.updatedAt ? { updatedAt: input.demand.updatedAt } : {}),
    ...(input.demand.updatedBy ? { updatedBy: input.demand.updatedBy } : {}),
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
    db.collection(ORGANIZATION_DEMANDS_COLLECTION).createIndex(
      { legacyUuid: 1 },
      { name: 'filemaker_organization_demands_legacy_uuid_unique', unique: true }
    ),
    db.collection(ORGANIZATION_DEMANDS_COLLECTION).createIndex(
      { organizationId: 1 },
      {
        name: 'filemaker_organization_demands_organization_id',
        partialFilterExpression: { organizationId: { $type: 'string' } },
      }
    ),
    db.collection(ORGANIZATION_DEMANDS_COLLECTION).createIndex(
      { legacyOrganizationUuid: 1 },
      { name: 'filemaker_organization_demands_legacy_organization_uuid' }
    ),
    db.collection(ORGANIZATION_DEMANDS_COLLECTION).createIndex(
      { valueIds: 1 },
      { name: 'filemaker_organization_demands_value_ids' }
    ),
    db.collection(ORGANIZATION_DEMANDS_COLLECTION).createIndex(
      { legacyValueUuids: 1 },
      { name: 'filemaker_organization_demands_legacy_value_uuids' }
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

  const parsedRows = await readLegacyOrganizationDemandRows(options.inputPath);
  const collected = collectDemands(parsedRows);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const collection = db.collection<FilemakerOrganizationDemandMongoDocument>(
      ORGANIZATION_DEMANDS_COLLECTION
    );
    const replacedCollection = !options.dryRun && options.replaceCollection
      ? await dropCollectionIfExists(db.collection(ORGANIZATION_DEMANDS_COLLECTION))
      : false;
    if (!options.dryRun && !options.replaceCollection) await ensureIndexes(db);

    const organizationByLegacyUuid = await buildOrganizationMap(db);
    const valueByLegacyUuid = await buildValueMap(db);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const demandDocuments = Array.from(collected.demands.values()).map(
      (demand: ParsedLegacyOrganizationDemand): FilemakerOrganizationDemandMongoDocument =>
        toDemandDocument({
          demand,
          importBatchId,
          importedAt,
          organization: organizationByLegacyUuid.get(demand.legacyOrganizationUuid),
          valueByLegacyUuid,
        })
    );
    const demandWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : options.replaceCollection
        ? await runInsertWrites(collection, demandDocuments, options.batchSize)
        : await runBulkWrites(collection, demandDocuments, options.batchSize);
    if (!options.dryRun) await ensureIndexes(db);

    const totalLegacyValueUuidCount = demandDocuments.reduce(
      (total: number, demand: FilemakerOrganizationDemandMongoDocument): number =>
        total + demand.legacyValueUuids.length,
      0
    );
    const resolvedValueUuidCount = demandDocuments.reduce(
      (total: number, demand: FilemakerOrganizationDemandMongoDocument): number =>
        total + demand.valueIds.length,
      0
    );

    console.log(
      JSON.stringify(
        {
          demandWrite,
          duplicateLegacyUuidCount: collected.duplicateLegacyUuidCount,
          importBatchId: options.dryRun ? null : importBatchId,
          inputFormat: isWorkbookInputPath(options.inputPath)
            ? extname(options.inputPath).slice(1) || 'workbook'
            : 'text',
          inputPath: options.inputPath,
          mode: options.dryRun ? 'dry-run' : 'write',
          organizationLookupCount: organizationByLegacyUuid.size,
          parsedRowCount: parsedRows.length,
          replacedCollection,
          resolvedOrganizationLinkCount: demandDocuments.filter(
            (demand: FilemakerOrganizationDemandMongoDocument): boolean =>
              typeof demand.organizationId === 'string'
          ).length,
          resolvedValueUuidCount,
          skippedRowCount: collected.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          totalLegacyValueUuidCount,
          uniqueDemandCount: collected.demands.size,
          unresolvedOrganizationLinkCount: demandDocuments.filter(
            (demand: FilemakerOrganizationDemandMongoDocument): boolean =>
              typeof demand.organizationId !== 'string'
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
