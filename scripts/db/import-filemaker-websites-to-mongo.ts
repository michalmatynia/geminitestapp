import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';

import {
  parseFilemakerLegacyWebsiteJoinRows,
  parseFilemakerLegacyWebsiteJoinWorkbookRows,
  parseFilemakerLegacyWebsiteRows,
  parseFilemakerLegacyWebsiteWorkbookRows,
  parseWebsiteFromRow,
  parseWebsiteJoinFromRow,
  type LegacyWebsiteJoinRow,
  type LegacyWebsiteRow,
  type ParsedLegacyWebsite,
  type ParsedLegacyWebsiteJoin,
} from '@/features/filemaker/filemaker-websites-import.parser';
import {
  ensureMongoFilemakerWebsiteIndexes,
  FILEMAKER_WEBSITE_LINKS_COLLECTION,
  FILEMAKER_WEBSITES_COLLECTION,
  type MongoFilemakerWebsiteDocument,
  type MongoFilemakerWebsiteLinkDocument,
} from '@/features/filemaker/server/filemaker-website-repository';
import type { FilemakerWebsitePartyKind } from '@/features/filemaker/filemaker-websites.types';
import type { MongoSource } from '@/shared/contracts/database';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const PERSONS_COLLECTION = 'filemaker_persons';
const EVENTS_COLLECTION = 'filemaker_events';
const DEFAULT_BATCH_SIZE = 1_000;
const IMPORT_SOURCE_KIND = 'filemaker.website';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string | null;
  joinInputPath: string | null;
  replaceCollections: boolean;
  source: MongoSource | undefined;
};

type PartyLookupRecord = {
  id: string;
  kind: FilemakerWebsitePartyKind;
  legacyUuid: string;
  name?: string;
};

type CollectedWebsites = {
  duplicateLegacyUuidCount: number;
  skippedRowCount: number;
  websitesByKey: Map<string, ParsedLegacyWebsite[]>;
};

type CollectedWebsiteJoins = {
  joins: ParsedLegacyWebsiteJoin[];
  skippedRowCount: number;
};

type WriteResultSummary = {
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
};

type WebsiteLinkBuildResult = {
  ambiguousOwnerCount: number;
  documents: MongoFilemakerWebsiteLinkDocument[];
  duplicateLegacyJoinUuidCount: number;
  duplicateNormalizedLinkCount: number;
  unresolvedOwnerCount: number;
  unresolvedWebsiteCount: number;
};

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-websites-to-mongo.ts --input=csv/websitebook.xlsx --join-input=csv/websitebookJOIN.xlsx --write',
      '',
      'Imports FileMaker WebsiteBook XLSX/CSV/TSV exports into filemaker_websites and filemaker_website_links.',
      'WebsiteBook UUIDs are retained as legacy UUIDs; each normalized website receives a deterministic modern id.',
      'WebsiteBookJOIN NameEntity_UUID_FK is resolved against filemaker_organizations, filemaker_persons, and filemaker_events legacy UUIDs.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild only the website collections.',
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
    dryRun: true,
    inputPath: null,
    joinInputPath: null,
    replaceCollections: false,
    source: undefined,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') options.dryRun = false;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--replace') options.replaceCollections = true;
    if (arg.startsWith('--input=')) options.inputPath = arg.slice('--input='.length).trim() || null;
    if (arg.startsWith('--join-input=')) {
      options.joinInputPath = arg.slice('--join-input='.length).trim() || null;
    }
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

const createModernId = (kind: 'website' | 'website-link', key: string): string => {
  const digest = createHash('sha256')
    .update(`filemaker.${kind}:${key}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-${kind}-${digest}`;
};

const isWorkbookInputPath = (inputPath: string): boolean =>
  ['.xlsx', '.xls'].includes(extname(inputPath).toLowerCase());

const readLegacyWebsiteRows = async (inputPath: string): Promise<LegacyWebsiteRow[]> => {
  if (isWorkbookInputPath(inputPath)) {
    return parseFilemakerLegacyWebsiteWorkbookRows(await readFile(inputPath));
  }
  return parseFilemakerLegacyWebsiteRows(await readFile(inputPath, 'utf8'));
};

const readLegacyWebsiteJoinRows = async (
  inputPath: string
): Promise<LegacyWebsiteJoinRow[]> => {
  if (isWorkbookInputPath(inputPath)) {
    return parseFilemakerLegacyWebsiteJoinWorkbookRows(await readFile(inputPath));
  }
  return parseFilemakerLegacyWebsiteJoinRows(await readFile(inputPath, 'utf8'));
};

const getWebsiteKey = (website: ParsedLegacyWebsite): string =>
  website.normalizedUrl ?? website.url.trim().toLowerCase();

const collectWebsites = (rows: LegacyWebsiteRow[]): CollectedWebsites => {
  const websitesByKey = new Map<string, ParsedLegacyWebsite[]>();
  const seenLegacyUuids = new Set<string>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((row: LegacyWebsiteRow): void => {
    const website = parseWebsiteFromRow(row);
    if (website === null) {
      skippedRowCount += 1;
      return;
    }
    if (seenLegacyUuids.has(website.legacyUuid)) duplicateLegacyUuidCount += 1;
    seenLegacyUuids.add(website.legacyUuid);
    const key = getWebsiteKey(website);
    websitesByKey.set(key, [...(websitesByKey.get(key) ?? []), website]);
  });

  return { duplicateLegacyUuidCount, skippedRowCount, websitesByKey };
};

const collectWebsiteJoins = (rows: LegacyWebsiteJoinRow[]): CollectedWebsiteJoins => {
  const joins: ParsedLegacyWebsiteJoin[] = [];
  let skippedRowCount = 0;

  rows.forEach((row: LegacyWebsiteJoinRow): void => {
    const join = parseWebsiteJoinFromRow(row);
    if (join === null) {
      skippedRowCount += 1;
      return;
    }
    joins.push(join);
  });

  return { joins, skippedRowCount };
};

const uniqueDefined = (values: Array<string | undefined>): string[] =>
  Array.from(new Set(values.filter((value): value is string => value !== undefined)));

const firstDefined = (values: Array<string | undefined>): string | undefined =>
  values.find((value: string | undefined): value is string => value !== undefined);

const earliestIso = (values: Array<string | undefined>): string | undefined =>
  uniqueDefined(values).sort()[0];

const latestIso = (values: Array<string | undefined>): string | undefined =>
  uniqueDefined(values).sort().at(-1);

const buildWebsiteDocuments = (input: {
  collected: CollectedWebsites;
  importBatchId: string;
  importedAt: Date;
}): MongoFilemakerWebsiteDocument[] =>
  Array.from(input.collected.websitesByKey.entries()).map(
    ([key, records]: [string, ParsedLegacyWebsite[]]): MongoFilemakerWebsiteDocument => {
      const id = createModernId('website', key);
      const legacyUuids = uniqueDefined(records.map((record) => record.legacyUuid));
      const legacyTypes = uniqueDefined(records.map((record) => record.legacyTypeRaw));
      return {
        _id: id,
        ...(earliestIso(records.map((record) => record.createdAt))
          ? { createdAt: earliestIso(records.map((record) => record.createdAt)) }
          : {}),
        ...(firstDefined(records.map((record) => record.host))
          ? { host: firstDefined(records.map((record) => record.host)) }
          : {}),
        id,
        importBatchId: input.importBatchId,
        importedAt: input.importedAt,
        importSourceKind: IMPORT_SOURCE_KIND,
        ...(legacyTypes[0] ? { legacyTypeRaw: legacyTypes[0] } : {}),
        ...(legacyTypes.length > 0 ? { legacyTypes } : {}),
        legacyUuid: legacyUuids[0],
        legacyUuids,
        ...(firstDefined(records.map((record) => record.normalizedUrl))
          ? { normalizedUrl: firstDefined(records.map((record) => record.normalizedUrl)) }
          : {}),
        schemaVersion: 1,
        ...(latestIso(records.map((record) => record.updatedAt))
          ? { updatedAt: latestIso(records.map((record) => record.updatedAt)) }
          : {}),
        ...(firstDefined(records.map((record) => record.updatedBy))
          ? { updatedBy: firstDefined(records.map((record) => record.updatedBy)) }
          : {}),
        url: records[0]?.url ?? key,
      };
    }
  );

const buildWebsiteIdByLegacyUuid = (
  collected: CollectedWebsites
): Map<string, string> => {
  const idByLegacyUuid = new Map<string, string>();
  collected.websitesByKey.forEach((records: ParsedLegacyWebsite[], key: string): void => {
    const websiteId = createModernId('website', key);
    records.forEach((record: ParsedLegacyWebsite): void => {
      idByLegacyUuid.set(record.legacyUuid, websiteId);
    });
  });
  return idByLegacyUuid;
};

const buildPartyMapForCollection = async (
  db: Db,
  collectionName: string,
  kind: FilemakerWebsitePartyKind
): Promise<Map<string, PartyLookupRecord>> => {
  const documents = await db
    .collection(collectionName)
    .find(
      { legacyUuid: { $type: 'string' } },
      {
        projection: {
          _id: 0,
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
  return new Map(
    documents
      .map((document: Document): [string, PartyLookupRecord] | null => {
        const id = typeof document['id'] === 'string' ? document['id'] : '';
        const legacyUuid = typeof document['legacyUuid'] === 'string' ? document['legacyUuid'] : '';
        if (!id || !legacyUuid) return null;
        const eventName = typeof document['eventName'] === 'string' ? document['eventName'] : '';
        const fullName = typeof document['fullName'] === 'string' ? document['fullName'] : '';
        const name =
          typeof document['name'] === 'string'
            ? document['name']
            : eventName ||
              fullName ||
              [document['firstName'], document['lastName']]
                .filter((part: unknown): part is string => typeof part === 'string')
                .join(' ');
        return [legacyUuid, { id, kind, legacyUuid, ...(name ? { name } : {}) }];
      })
      .filter((entry): entry is [string, PartyLookupRecord] => entry !== null)
  );
};

const mergePartyMaps = (
  partyMaps: Array<Map<string, PartyLookupRecord>>
): Map<string, PartyLookupRecord[]> => {
  const result = new Map<string, PartyLookupRecord[]>();
  partyMaps.forEach((partyMap: Map<string, PartyLookupRecord>): void => {
    partyMap.forEach((record: PartyLookupRecord, legacyUuid: string): void => {
      result.set(legacyUuid, [...(result.get(legacyUuid) ?? []), record]);
    });
  });
  return result;
};

const buildPartyMap = async (db: Db): Promise<Map<string, PartyLookupRecord[]>> => {
  const [organizations, persons, events] = await Promise.all([
    buildPartyMapForCollection(db, ORGANIZATIONS_COLLECTION, 'organization'),
    buildPartyMapForCollection(db, PERSONS_COLLECTION, 'person'),
    buildPartyMapForCollection(db, EVENTS_COLLECTION, 'event'),
  ]);
  return mergePartyMaps([organizations, persons, events]);
};

const buildLinkDocument = (input: {
  importBatchId: string;
  importedAt: Date;
  join: ParsedLegacyWebsiteJoin;
  party: PartyLookupRecord;
  websiteId: string;
}): MongoFilemakerWebsiteLinkDocument => {
  const id = createModernId(
    'website-link',
    `${input.websiteId}:${input.party.kind}:${input.party.id}`
  );
  return {
    _id: id,
    ...(input.join.createdAt ? { createdAt: input.join.createdAt } : {}),
    ...(input.join.createdBy ? { createdBy: input.join.createdBy } : {}),
    id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    importSourceKind: IMPORT_SOURCE_KIND,
    ...(input.join.legacyJoinUuid ? { legacyJoinUuid: input.join.legacyJoinUuid } : {}),
    legacyJoinUuids: uniqueDefined([input.join.legacyJoinUuid]),
    legacyOwnerUuid: input.join.legacyOwnerUuid,
    legacyWebsiteUuid: input.join.legacyWebsiteUuid,
    ...(input.party.kind === 'event' ? { eventId: input.party.id } : {}),
    ...(input.party.kind === 'organization' ? { organizationId: input.party.id } : {}),
    ...(input.party.name ? { ownerName: input.party.name } : {}),
    partyId: input.party.id,
    partyKind: input.party.kind,
    ...(input.party.kind === 'person' ? { personId: input.party.id } : {}),
    schemaVersion: 1,
    ...(input.join.updatedAt ? { updatedAt: input.join.updatedAt } : {}),
    ...(input.join.updatedBy ? { updatedBy: input.join.updatedBy } : {}),
    websiteId: input.websiteId,
  };
};

const mergeLinkDocuments = (
  existing: MongoFilemakerWebsiteLinkDocument,
  incoming: MongoFilemakerWebsiteLinkDocument
): MongoFilemakerWebsiteLinkDocument => ({
  ...existing,
  createdAt: earliestIso([existing.createdAt, incoming.createdAt]),
  createdBy: existing.createdBy ?? incoming.createdBy,
  legacyJoinUuid: existing.legacyJoinUuid ?? incoming.legacyJoinUuid,
  legacyJoinUuids: uniqueDefined([
    ...(existing.legacyJoinUuids ?? []),
    ...(incoming.legacyJoinUuids ?? []),
    existing.legacyJoinUuid,
    incoming.legacyJoinUuid,
  ]),
  ownerName: existing.ownerName ?? incoming.ownerName,
  updatedAt: latestIso([existing.updatedAt, incoming.updatedAt]),
  updatedBy: existing.updatedBy ?? incoming.updatedBy,
});

const buildWebsiteLinkDocuments = (input: {
  importBatchId: string;
  importedAt: Date;
  joins: ParsedLegacyWebsiteJoin[];
  partyByLegacyUuid: Map<string, PartyLookupRecord[]>;
  websiteIdByLegacyUuid: Map<string, string>;
}): WebsiteLinkBuildResult => {
  const documentsById = new Map<string, MongoFilemakerWebsiteLinkDocument>();
  const seenLegacyJoinUuids = new Set<string>();
  let ambiguousOwnerCount = 0;
  let duplicateLegacyJoinUuidCount = 0;
  let duplicateNormalizedLinkCount = 0;
  let unresolvedOwnerCount = 0;
  let unresolvedWebsiteCount = 0;

  input.joins.forEach((join: ParsedLegacyWebsiteJoin): void => {
    if (join.legacyJoinUuid !== undefined) {
      if (seenLegacyJoinUuids.has(join.legacyJoinUuid)) duplicateLegacyJoinUuidCount += 1;
      seenLegacyJoinUuids.add(join.legacyJoinUuid);
    }
    const websiteId = input.websiteIdByLegacyUuid.get(join.legacyWebsiteUuid);
    if (websiteId === undefined) {
      unresolvedWebsiteCount += 1;
      return;
    }
    const parties = input.partyByLegacyUuid.get(join.legacyOwnerUuid) ?? [];
    if (parties.length === 0) {
      unresolvedOwnerCount += 1;
      return;
    }
    if (parties.length > 1) ambiguousOwnerCount += 1;
    parties.forEach((party: PartyLookupRecord): void => {
      const document = buildLinkDocument({
        importBatchId: input.importBatchId,
        importedAt: input.importedAt,
        join,
        party,
        websiteId,
      });
      const existing = documentsById.get(document.id);
      if (existing !== undefined) {
        duplicateNormalizedLinkCount += 1;
        documentsById.set(document.id, mergeLinkDocuments(existing, document));
        return;
      }
      documentsById.set(document.id, document);
    });
  });

  return {
    ambiguousOwnerCount,
    documents: Array.from(documentsById.values()),
    duplicateLegacyJoinUuidCount,
    duplicateNormalizedLinkCount,
    unresolvedOwnerCount,
    unresolvedWebsiteCount,
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

const toUpsertOperation = <TDocument extends Document>(
  document: TDocument & { _id: string }
): AnyBulkWriteOperation<TDocument> => {
  const { _id, ...set } = document;
  return {
    updateOne: {
      filter: { _id } as Document,
      update: { $set: set, $setOnInsert: { _id } },
      upsert: true,
    },
  };
};

const runUpsertWrites = async <TDocument extends Document>(
  collection: Collection<TDocument>,
  documents: Array<TDocument & { _id: string }>,
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

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (!options.inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const websiteRows = await readLegacyWebsiteRows(options.inputPath);
  const collectedWebsites = collectWebsites(websiteRows);
  const joinRows =
    options.joinInputPath === null
      ? []
      : await readLegacyWebsiteJoinRows(options.joinInputPath);
  const collectedJoins = collectWebsiteJoins(joinRows);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const websites = db.collection<MongoFilemakerWebsiteDocument>(FILEMAKER_WEBSITES_COLLECTION);
    const links = db.collection<MongoFilemakerWebsiteLinkDocument>(
      FILEMAKER_WEBSITE_LINKS_COLLECTION
    );
    const replacedCollections =
      !options.dryRun && options.replaceCollections
        ? {
            links: await dropCollectionIfExists(links),
            websites: await dropCollectionIfExists(websites),
          }
        : { links: false, websites: false };
    const partyByLegacyUuid = await buildPartyMap(db);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const websiteDocuments = buildWebsiteDocuments({
      collected: collectedWebsites,
      importBatchId,
      importedAt,
    });
    const linkBuild = buildWebsiteLinkDocuments({
      importBatchId,
      importedAt,
      joins: collectedJoins.joins,
      partyByLegacyUuid,
      websiteIdByLegacyUuid: buildWebsiteIdByLegacyUuid(collectedWebsites),
    });
    const websiteWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : await runUpsertWrites(websites, websiteDocuments, options.batchSize);
    const linkWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : await runUpsertWrites(links, linkBuild.documents, options.batchSize);
    if (!options.dryRun) {
      await ensureMongoFilemakerWebsiteIndexes({ links, websites });
    }

    console.log(
      JSON.stringify(
        {
          ambiguousOwnerCount: linkBuild.ambiguousOwnerCount,
          duplicateLegacyJoinUuidCount: linkBuild.duplicateLegacyJoinUuidCount,
          duplicateLegacyUuidCount: collectedWebsites.duplicateLegacyUuidCount,
          duplicateNormalizedLinkCount: linkBuild.duplicateNormalizedLinkCount,
          importBatchId: options.dryRun ? null : importBatchId,
          inputPath: options.inputPath,
          joinInputPath: options.joinInputPath,
          linkWrite,
          mode: options.dryRun ? 'dry-run' : 'write',
          parsedJoinRowCount: joinRows.length,
          parsedWebsiteRowCount: websiteRows.length,
          partyLookupCount: partyByLegacyUuid.size,
          replacedCollections,
          resolvedLinkCount: linkBuild.documents.length,
          skippedJoinRowCount: collectedJoins.skippedRowCount,
          skippedWebsiteRowCount: collectedWebsites.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          uniqueWebsiteCount: websiteDocuments.length,
          unresolvedOwnerCount: linkBuild.unresolvedOwnerCount,
          unresolvedWebsiteCount: linkBuild.unresolvedWebsiteCount,
          websiteWrite,
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
