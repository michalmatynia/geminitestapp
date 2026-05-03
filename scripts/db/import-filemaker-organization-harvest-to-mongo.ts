import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';

import {
  parseFilemakerLegacyOrganizationHarvestRows,
  parseFilemakerLegacyOrganizationHarvestWorkbookRows,
  parseOrganizationHarvestProfileFromRow,
  type LegacyOrganizationHarvestRow,
  type ParsedLegacyOrganizationHarvestProfile,
} from '@/features/filemaker/filemaker-organization-harvest-import.parser';
import type { MongoSource } from '@/shared/contracts/database';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const ORGANIZATION_HARVEST_COLLECTION = 'filemaker_organization_harvest_profiles';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const DEFAULT_BATCH_SIZE = 5_000;
const IMPORT_SOURCE_KIND = 'filemaker.organization_harvest';

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

type FilemakerOrganizationHarvestMongoDocument = Document & {
  _id: string;
  createdAt?: string;
  createdBy?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  legacyOrganizationUuid: string;
  legacyUuid: string;
  organizationId?: string;
  organizationName?: string;
  owner?: string;
  pageDescription?: string;
  pageKeywords?: string;
  pageTitle?: string;
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
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-organization-harvest-to-mongo.ts --input=csv/harvestHeading.xlsx --write',
      '',
      'Imports FileMaker organization harvest/scraping metadata XLSX exports and headerless TAB/CSV exports into filemaker_organization_harvest_profiles.',
      'Parent_UUID_FK is resolved against filemaker_organizations.legacyUuid.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild only the harvest collection.',
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
    .update(`filemaker.organization_harvest:${legacyUuid}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-organization-harvest-${digest}`;
};

const isWorkbookInputPath = (inputPath: string): boolean => /\.(xlsx|xls)$/i.test(inputPath);

const readLegacyOrganizationHarvestRows = async (
  inputPath: string
): Promise<LegacyOrganizationHarvestRow[]> => {
  if (isWorkbookInputPath(inputPath)) {
    return parseFilemakerLegacyOrganizationHarvestWorkbookRows(await readFile(inputPath));
  }
  return parseFilemakerLegacyOrganizationHarvestRows(await readFile(inputPath, 'utf8'));
};

const collectHarvestProfiles = (rows: LegacyOrganizationHarvestRow[]): {
  duplicateLegacyUuidCount: number;
  profiles: Map<string, ParsedLegacyOrganizationHarvestProfile>;
  skippedRowCount: number;
} => {
  const profiles = new Map<string, ParsedLegacyOrganizationHarvestProfile>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((row: LegacyOrganizationHarvestRow): void => {
    const profile = parseOrganizationHarvestProfileFromRow(row);
    if (profile === null) {
      skippedRowCount += 1;
      return;
    }
    if (profiles.has(profile.legacyUuid)) duplicateLegacyUuidCount += 1;
    profiles.set(profile.legacyUuid, profile);
  });

  return { duplicateLegacyUuidCount, profiles, skippedRowCount };
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

const toHarvestDocument = (input: {
  importBatchId: string;
  importedAt: Date;
  organization: OrganizationLookupRecord | undefined;
  profile: ParsedLegacyOrganizationHarvestProfile;
}): FilemakerOrganizationHarvestMongoDocument => {
  const id = createModernId(input.profile.legacyUuid);
  return {
    _id: id,
    ...(input.profile.createdAt ? { createdAt: input.profile.createdAt } : {}),
    ...(input.profile.createdBy ? { createdBy: input.profile.createdBy } : {}),
    id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    importSourceKind: IMPORT_SOURCE_KIND,
    legacyOrganizationUuid: input.profile.legacyOrganizationUuid,
    legacyUuid: input.profile.legacyUuid,
    ...(input.organization
      ? { organizationId: input.organization.id, organizationName: input.organization.name }
      : {}),
    ...(input.profile.owner ? { owner: input.profile.owner } : {}),
    ...(input.profile.pageDescription ? { pageDescription: input.profile.pageDescription } : {}),
    ...(input.profile.pageKeywords ? { pageKeywords: input.profile.pageKeywords } : {}),
    ...(input.profile.pageTitle ? { pageTitle: input.profile.pageTitle } : {}),
    schemaVersion: 1,
    ...(input.profile.updatedAt ? { updatedAt: input.profile.updatedAt } : {}),
    ...(input.profile.updatedBy ? { updatedBy: input.profile.updatedBy } : {}),
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
    db.collection(ORGANIZATION_HARVEST_COLLECTION).createIndex(
      { legacyUuid: 1 },
      { name: 'filemaker_organization_harvest_legacy_uuid_unique', unique: true }
    ),
    db.collection(ORGANIZATION_HARVEST_COLLECTION).createIndex(
      { organizationId: 1 },
      {
        name: 'filemaker_organization_harvest_organization_id',
        partialFilterExpression: { organizationId: { $type: 'string' } },
      }
    ),
    db.collection(ORGANIZATION_HARVEST_COLLECTION).createIndex(
      { legacyOrganizationUuid: 1 },
      { name: 'filemaker_organization_harvest_legacy_organization_uuid' }
    ),
    db.collection(ORGANIZATION_HARVEST_COLLECTION).createIndex(
      { owner: 1 },
      {
        name: 'filemaker_organization_harvest_owner',
        partialFilterExpression: { owner: { $type: 'string' } },
      }
    ),
    db.collection(ORGANIZATION_HARVEST_COLLECTION).createIndex(
      { pageTitle: 'text', pageDescription: 'text', pageKeywords: 'text', owner: 'text' },
      {
        name: 'filemaker_organization_harvest_text',
        default_language: 'none',
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

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (!options.inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const parsedRows = await readLegacyOrganizationHarvestRows(options.inputPath);
  const collected = collectHarvestProfiles(parsedRows);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const collection = db.collection<FilemakerOrganizationHarvestMongoDocument>(
      ORGANIZATION_HARVEST_COLLECTION
    );
    const replacedCollection = !options.dryRun && options.replaceCollection
      ? await dropCollectionIfExists(db.collection(ORGANIZATION_HARVEST_COLLECTION))
      : false;
    if (!options.dryRun && !options.replaceCollection) await ensureIndexes(db);

    const organizationByLegacyUuid = await buildOrganizationMap(db);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const harvestDocuments = Array.from(collected.profiles.values()).map(
      (profile: ParsedLegacyOrganizationHarvestProfile): FilemakerOrganizationHarvestMongoDocument =>
        toHarvestDocument({
          importBatchId,
          importedAt,
          organization: organizationByLegacyUuid.get(profile.legacyOrganizationUuid),
          profile,
        })
    );
    const harvestWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : options.replaceCollection
        ? await runInsertWrites(collection, harvestDocuments, options.batchSize)
        : await runBulkWrites(collection, harvestDocuments, options.batchSize);
    if (!options.dryRun) await ensureIndexes(db);

    console.log(
      JSON.stringify(
        {
          duplicateLegacyUuidCount: collected.duplicateLegacyUuidCount,
          harvestWrite,
          importBatchId: options.dryRun ? null : importBatchId,
          inputFormat: isWorkbookInputPath(options.inputPath)
            ? extname(options.inputPath).slice(1) || 'workbook'
            : 'text',
          inputPath: options.inputPath,
          mode: options.dryRun ? 'dry-run' : 'write',
          organizationLookupCount: organizationByLegacyUuid.size,
          parsedRowCount: parsedRows.length,
          replacedCollection,
          resolvedOrganizationLinkCount: harvestDocuments.filter(
            (profile: FilemakerOrganizationHarvestMongoDocument): boolean =>
              typeof profile.organizationId === 'string'
          ).length,
          skippedRowCount: collected.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          uniqueHarvestProfileCount: collected.profiles.size,
          unresolvedOrganizationLinkCount: harvestDocuments.filter(
            (profile: FilemakerOrganizationHarvestMongoDocument): boolean =>
              typeof profile.organizationId !== 'string'
          ).length,
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
