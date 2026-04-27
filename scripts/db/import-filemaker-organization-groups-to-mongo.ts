import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';
import { read, utils as xlsxUtils } from 'xlsx';

import type { MongoSource } from '@/shared/contracts/database';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const ORGANIZATION_GROUPS_COLLECTION = 'filemaker_organization_groups';
const ORGANIZATION_GROUP_LINKS_COLLECTION = 'filemaker_organization_group_links';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const DEFAULT_BATCH_SIZE = 1_000;
const IMPORT_SOURCE_KIND = 'filemaker.organization_group';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string | null;
  joinInputPath: string | null;
  replaceCollections: boolean;
  source: MongoSource | undefined;
};

type ParsedOrganizationGroup = {
  checked1?: string;
  checked2?: string;
  name: string;
  legacyUuid: string;
};

type ParsedOrganizationGroupJoin = {
  createdAt?: string;
  createdBy?: string;
  legacyJoinUuid: string;
  legacyGroupUuid: string;
  legacyOrganizationUuid: string;
  modifiedAt?: string;
  modifiedBy?: string;
};

type FilemakerOrganizationGroupMongoDocument = Document & {
  _id: string;
  checked1?: string;
  checked2?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  legacyUuid: string;
  name: string;
  schemaVersion: 1;
};

type FilemakerOrganizationGroupLinkMongoDocument = Document & {
  _id: string;
  createdAt?: string;
  createdBy?: string;
  groupId?: string;
  groupName?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  legacyJoinUuid: string;
  legacyGroupUuid: string;
  legacyOrganizationUuid: string;
  modifiedAt?: string;
  modifiedBy?: string;
  organizationId?: string;
  organizationName?: string;
  schemaVersion: 1;
};

type WriteResultSummary = {
  insertedCount?: number;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
};

type OrganizationLookupRecord = {
  id: string;
  name?: string;
};

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-organization-groups-to-mongo.ts --input=csv/organisationGroup.xlsx --join-input=csv/organisationGroupJOIN.xlsx --write',
      '',
      'Imports FileMaker organization groups and join rows into filemaker_organization_groups and filemaker_organization_group_links.',
      'Groups are imported as legacy UUID keyed records and linked against organisations by NameOrganisation_UUID_FK.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild the group collections.',
      'Pass --source=local or --source=cloud to override active Mongo source.',
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
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      return;
    }
    if (arg === '--replace') {
      options.replaceCollections = true;
      return;
    }
    if (arg.startsWith('--input=')) {
      options.inputPath = arg.slice('--input='.length).trim() || null;
      return;
    }
    if (arg.startsWith('--join-input=')) {
      options.joinInputPath = arg.slice('--join-input='.length).trim() || null;
      return;
    }
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parsePositiveInteger(arg.slice('--batch-size='.length), DEFAULT_BATCH_SIZE);
      return;
    }
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length).trim();
      if (source === 'local' || source === 'cloud') {
        options.source = source;
      }
      return;
    }
    if (!arg.startsWith('--') && options.inputPath === null) {
      options.inputPath = arg.trim() || null;
    }
  });

  return options;
};

const createModernId = (kind: 'organization-group' | 'organization-group-link', key: string): string => {
  const digest = createHash('sha256')
    .update(`filemaker.${kind}:${key}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-${kind}-${digest}`;
};

const isWorkbookInputPath = (inputPath: string): boolean => ['.xlsx', '.xls'].includes(extname(inputPath).toLowerCase());

const normalizeUuid = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  return normalized.length > 0 ? normalized.toUpperCase() : '';
};

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const parseRows = (buffer: Buffer, inputPath: string): string[][] => {
  if (isWorkbookInputPath(inputPath)) {
    const workbook = read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    return xlsxUtils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' }) as string[][];
  }

  const text = buffer.toString('utf8');
  return text
    .split('\n')
    .map((line: string): string[] => line.replace(/\r/g, '').split('\t'));
};

const buildHeaderMap = (headerRow: string[]): Map<string, number> => {
  const map = new Map<string, number>();
  headerRow.forEach((header: string, index: number): void => {
    map.set(header.trim(), index);
  });
  return map;
};

const readOrganisationGroupRows = async (inputPath: string): Promise<ParsedOrganizationGroup[]> => {
  const rows = parseRows(await readFile(inputPath), inputPath);
  if (rows.length === 0) return [];
  const header = buildHeaderMap(rows[0] ?? []);
  const nameIndex = header.get('Name') ?? -1;
  const uuidIndex = header.get('UUID') ?? -1;
  const checked1Index = header.get('Checked_1');
  const checked2Index = header.get('Checked_2');

  return rows
    .slice(1)
    .map((row: string[]): ParsedOrganizationGroup | null => {
      const legacyUuid = normalizeUuid(row[uuidIndex]);
      const name = optionalString(row[nameIndex]);
      if (!legacyUuid || !name) return null;
      return {
        checked1: optionalString(checked1Index === undefined ? undefined : row[checked1Index]),
        checked2: optionalString(checked2Index === undefined ? undefined : row[checked2Index]),
        name,
        legacyUuid,
      };
    })
    .filter((group): group is ParsedOrganizationGroup => group !== null);
};

const readOrganisationGroupJoinRows = async (
  inputPath: string
): Promise<ParsedOrganizationGroupJoin[]> => {
  const rows = parseRows(await readFile(inputPath), inputPath);
  if (rows.length === 0) return [];
  const header = buildHeaderMap(rows[0] ?? []);
  const createdAtIndex = header.get('creationTimestamp');
  const createdByIndex = header.get('creationAccountName');
  const modifiedAtIndex = header.get('modificationTimestamp');
  const modifiedByIndex = header.get('modificationAccountName');
  const groupUuidIndex = header.get('Group_UUID_FK') ?? -1;
  const organisationUuidIndex = header.get('NameOrganisation_UUID_FK') ?? -1;
  const uuidIndex = header.get('UUID') ?? -1;

  return rows
    .slice(1)
    .map((row: string[]): ParsedOrganizationGroupJoin | null => {
      const legacyJoinUuid = normalizeUuid(row[uuidIndex]);
      const legacyGroupUuid = normalizeUuid(row[groupUuidIndex]);
      const legacyOrganizationUuid = normalizeUuid(row[organisationUuidIndex]);
      if (!legacyJoinUuid || !legacyGroupUuid || !legacyOrganizationUuid) return null;
      return {
        createdAt: optionalString(createdAtIndex === undefined ? undefined : row[createdAtIndex]),
        createdBy: optionalString(createdByIndex === undefined ? undefined : row[createdByIndex]),
        legacyJoinUuid,
        legacyGroupUuid,
        legacyOrganizationUuid,
        modifiedAt: optionalString(modifiedAtIndex === undefined ? undefined : row[modifiedAtIndex]),
        modifiedBy: optionalString(modifiedByIndex === undefined ? undefined : row[modifiedByIndex]),
      };
    })
    .filter((join): join is ParsedOrganizationGroupJoin => join !== null);
};

const collectGroups = (rows: ParsedOrganizationGroup[]): {
  duplicateLegacyUuidCount: number;
  skippedRowCount: number;
  groups: Map<string, ParsedOrganizationGroup>;
} => {
  const groups = new Map<string, ParsedOrganizationGroup>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((group: ParsedOrganizationGroup): void => {
    if (group.legacyUuid.length === 0 || group.name.length === 0) {
      skippedRowCount += 1;
      return;
    }
    if (groups.has(group.legacyUuid)) duplicateLegacyUuidCount += 1;
    groups.set(group.legacyUuid, group);
  });

  return { duplicateLegacyUuidCount, skippedRowCount, groups };
};

const collectJoins = (rows: ParsedOrganizationGroupJoin[]): {
  duplicateLegacyJoinUuidCount: number;
  joins: ParsedOrganizationGroupJoin[];
  skippedRowCount: number;
} => {
  const joins: ParsedOrganizationGroupJoin[] = [];
  const seen = new Set<string>();
  let duplicateLegacyJoinUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((join: ParsedOrganizationGroupJoin): void => {
    if (
      !join.legacyJoinUuid ||
      !join.legacyGroupUuid ||
      !join.legacyOrganizationUuid
    ) {
      skippedRowCount += 1;
      return;
    }
    if (seen.has(join.legacyJoinUuid)) duplicateLegacyJoinUuidCount += 1;
    seen.add(join.legacyJoinUuid);
    joins.push(join);
  });

  return { duplicateLegacyJoinUuidCount, joins, skippedRowCount };
};

const buildGroupLookup = (groupRows: Map<string, ParsedOrganizationGroup>): Map<string, string> =>
  new Map(
    Array.from(groupRows.entries()).map(([legacyUuid, group]: [string, ParsedOrganizationGroup]) => [
      legacyUuid,
      createModernId('organization-group', group.legacyUuid),
    ])
  );

const buildOrganizationLookup = async (db: Db): Promise<Map<string, OrganizationLookupRecord>> => {
  const documents = await db
    .collection<Document>(ORGANIZATIONS_COLLECTION)
    .find(
      { legacyUuid: { $type: 'string' } },
      { projection: { id: 1, legacyUuid: 1, name: 1 } }
    )
    .toArray();
  return new Map(
    documents
      .map((document: Document): [string, OrganizationLookupRecord] | null => {
        const legacyUuid =
          typeof document['legacyUuid'] === 'string' ? document['legacyUuid'].toUpperCase() : '';
        const id = typeof document['id'] === 'string' ? document['id'] : '';
        if (!legacyUuid || !id) return null;
        const name = typeof document['name'] === 'string' ? document['name'] : undefined;
        return [legacyUuid, { id, ...(name ? { name } : {}) }];
      })
      .filter((entry): entry is [string, OrganizationLookupRecord] => entry !== null)
  );
};

const isNamespaceNotFoundError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const maybeError = error as { code?: unknown; codeName?: unknown };
  return maybeError.code === 26 || maybeError.codeName === 'NamespaceNotFound';
};

const dropCollectionIfExists = async (
  collection: Collection<Document>
): Promise<boolean> => {
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
    db.collection(ORGANIZATION_GROUPS_COLLECTION).createIndex(
      { legacyUuid: 1 },
      { name: 'filemaker_organization_groups_legacy_uuid_unique', unique: true }
    ),
    db.collection(ORGANIZATION_GROUP_LINKS_COLLECTION).createIndex(
      { legacyJoinUuid: 1 },
      { name: 'filemaker_organization_group_links_legacy_join_uuid_unique', unique: true }
    ),
    db.collection(ORGANIZATION_GROUP_LINKS_COLLECTION).createIndex(
      { groupId: 1 },
      { name: 'filemaker_organization_group_links_group_id' }
    ),
    db.collection(ORGANIZATION_GROUP_LINKS_COLLECTION).createIndex(
      { organizationId: 1 },
      { name: 'filemaker_organization_group_links_organization_id' }
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

const main = async (argv: string[] = process.argv.slice(2)): Promise<void> => {
  const options = parseArgs(argv);
  if (options.inputPath === null || options.joinInputPath === null) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const groupRows = await readOrganisationGroupRows(options.inputPath);
  const joinRows = await readOrganisationGroupJoinRows(options.joinInputPath);
  const collectedGroups = collectGroups(groupRows);
  const collectedJoins = collectJoins(joinRows);

  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);
  try {
    const db = await getMongoDb(options.source);
    const organizationCollection = db.collection(ORGANIZATIONS_COLLECTION);
    const groupsCollection = db.collection<FilemakerOrganizationGroupMongoDocument>(ORGANIZATION_GROUPS_COLLECTION);
    const linksCollection = db.collection<FilemakerOrganizationGroupLinkMongoDocument>(
      ORGANIZATION_GROUP_LINKS_COLLECTION
    );

    if (!options.dryRun && options.replaceCollections) {
      await Promise.all([
        dropCollectionIfExists(groupsCollection),
        dropCollectionIfExists(linksCollection),
      ]);
    }

    const importedAt = new Date();
    const importBatchId = randomUUID();

    const organizationLookup = await buildOrganizationLookup(db);

    const groupDocuments = Array.from(collectedGroups.groups.values()).map(
      (group: ParsedOrganizationGroup): FilemakerOrganizationGroupMongoDocument => {
        const id = createModernId('organization-group', group.legacyUuid);
        return {
          _id: id,
          ...(group.checked1 ? { checked1: group.checked1 } : {}),
          ...(group.checked2 ? { checked2: group.checked2 } : {}),
          id,
          importBatchId,
          importedAt,
          importSourceKind: IMPORT_SOURCE_KIND,
          legacyUuid: group.legacyUuid,
          name: group.name,
          schemaVersion: 1,
        };
      }
    );

    const groupByLegacyUuid = buildGroupLookup(collectedGroups.groups);
    const linkDocuments = collectedJoins.joins.map(
      (join: ParsedOrganizationGroupJoin): FilemakerOrganizationGroupLinkMongoDocument => {
        const id = createModernId('organization-group-link', join.legacyJoinUuid);
        const groupRecord = groupByLegacyUuid.get(join.legacyGroupUuid);
        const organizationRecord = organizationLookup.get(join.legacyOrganizationUuid);

        return {
          _id: id,
          ...(join.createdAt ? { createdAt: join.createdAt } : {}),
          ...(join.createdBy ? { createdBy: join.createdBy } : {}),
          ...(groupRecord ? { groupId: groupRecord } : {}),
          ...(groupRecord
            ? { groupName: collectedGroups.groups.get(join.legacyGroupUuid)?.name }
            : {}),
          id,
          importBatchId,
          importedAt,
          importSourceKind: IMPORT_SOURCE_KIND,
          legacyJoinUuid: join.legacyJoinUuid,
          legacyGroupUuid: join.legacyGroupUuid,
          legacyOrganizationUuid: join.legacyOrganizationUuid,
          ...(join.modifiedAt ? { modifiedAt: join.modifiedAt } : {}),
          ...(join.modifiedBy ? { modifiedBy: join.modifiedBy } : {}),
          ...(organizationRecord ? { organizationId: organizationRecord.id } : {}),
          ...(organizationRecord ? { organizationName: organizationRecord.name } : {}),
          schemaVersion: 1,
        };
      }
    );

    const groupWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : await runBulkWrites(groupsCollection, groupDocuments, options.batchSize);
    const linkWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : await runBulkWrites(linksCollection, linkDocuments, options.batchSize);

    if (!options.dryRun) {
      await ensureIndexes(db);
    }

    const resolvedOrganizationLinks = linkDocuments.filter(
      (document: FilemakerOrganizationGroupLinkMongoDocument): boolean =>
        typeof document.organizationId === 'string' && typeof document.groupId === 'string'
    ).length;
    const unresolvedOrganizationLinks = linkDocuments.length - resolvedOrganizationLinks;

    console.log(
      JSON.stringify(
        {
          duplicateGroupLegacyUuidCount: collectedGroups.duplicateLegacyUuidCount,
          duplicateLinkLegacyJoinUuidCount: collectedJoins.duplicateLegacyJoinUuidCount,
          groupCount: collectedGroups.groups.size,
          groupLinkCount: collectedJoins.joins.length,
          groupWrite,
          linkWrite,
          inputPath: options.inputPath,
          joinInputPath: options.joinInputPath,
          mode: options.dryRun ? 'dry-run' : 'write',
          parsedGroupRowCount: groupRows.length,
          parsedJoinRowCount: joinRows.length,
          skippedGroupRowCount: collectedGroups.skippedRowCount,
          skippedJoinRowCount: collectedJoins.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE_DEFAULT'] ?? null,
          resolvedOrganizationLinks,
          unresolvedOrganizationLinks,
        },
        null,
        2
      )
    );
  } finally {
    await client.close();
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
