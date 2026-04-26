import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';

import {
  buildFilemakerPartySnapshotId,
  ensureMongoFilemakerPartySnapshotIndexes,
  FILEMAKER_PARTY_SNAPSHOTS_COLLECTION,
} from '@/features/filemaker/server/filemaker-party-snapshot-repository';
import {
  createEmptyFilemakerPartySnapshotCounts,
  type FilemakerPartySnapshot,
  type FilemakerPartySnapshotCounts,
  type FilemakerPartySnapshotKind,
} from '@/features/filemaker/filemaker-party-snapshot.types';
import type { MongoSource } from '@/shared/contracts/database';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const PERSONS_COLLECTION = 'filemaker_persons';
const EVENTS_COLLECTION = 'filemaker_events';
const ADDRESS_LINKS_COLLECTION = 'filemaker_address_links';
const EMAIL_LINKS_COLLECTION = 'filemaker_email_links';
const WEBSITE_LINKS_COLLECTION = 'filemaker_website_links';
const PERSON_ORGANIZATION_LINKS_COLLECTION = 'filemaker_person_organization_links';
const EVENT_ORGANIZATION_LINKS_COLLECTION = 'filemaker_event_organization_links';
const ORGANIZATION_DEMANDS_COLLECTION = 'filemaker_organization_demands';
const ORGANIZATION_HARVEST_COLLECTION = 'filemaker_organization_harvest_profiles';
const CONTACT_LOGS_COLLECTION = 'filemaker_contact_logs';
const DEFAULT_BATCH_SIZE = 5_000;

type CountField = Exclude<keyof FilemakerPartySnapshotCounts, 'total'>;

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  replaceCollection: boolean;
  source: MongoSource | undefined;
};

type SnapshotDocument = Document & FilemakerPartySnapshot & {
  _id: string;
};

type SnapshotRecord = FilemakerPartySnapshot;

type PartySeed = {
  id: string;
  kind: FilemakerPartySnapshotKind;
  legacyUuid?: string;
  name?: string;
};

type GroupedCount = {
  _id?: {
    partyId?: unknown;
    partyKind?: unknown;
  };
  count?: number;
  latestContactLogAt?: string;
};

type WriteResultSummary = {
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
};

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/rebuild-filemaker-party-snapshots.ts --source=local --write --replace',
      '',
      'Builds filemaker_party_snapshots, a Mongo-native party read model for organizations, persons, and events.',
      'Imported source collections remain authoritative; snapshots store relationship counts and latest contact-log activity for fast UI/API reads.',
      'By default the script performs a dry run. Pass --write to persist snapshots.',
      'Pass --replace with --write to drop and rebuild only filemaker_party_snapshots.',
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
    replaceCollection: false,
    source: undefined,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--help') printUsage();
    if (arg === '--write') options.dryRun = false;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--replace') options.replaceCollection = true;
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

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const buildEmptySnapshot = (seed: PartySeed, rebuiltAt: string): SnapshotRecord => ({
  counts: createEmptyFilemakerPartySnapshotCounts(),
  id: buildFilemakerPartySnapshotId(seed.kind, seed.id),
  partyId: seed.id,
  partyKind: seed.kind,
  ...(seed.legacyUuid !== undefined ? { partyLegacyUuid: seed.legacyUuid } : {}),
  ...(seed.name !== undefined ? { partyName: seed.name } : {}),
  rebuiltAt,
  schemaVersion: 1,
});

const getSnapshotKey = (partyKind: FilemakerPartySnapshotKind, partyId: string): string =>
  buildFilemakerPartySnapshotId(partyKind, partyId);

const getOrCreateSnapshot = (
  snapshots: Map<string, SnapshotRecord>,
  partyKind: FilemakerPartySnapshotKind,
  partyId: string,
  rebuiltAt: string
): SnapshotRecord => {
  const key = getSnapshotKey(partyKind, partyId);
  const existing = snapshots.get(key);
  if (existing !== undefined) return existing;
  const snapshot = buildEmptySnapshot({ id: partyId, kind: partyKind }, rebuiltAt);
  snapshots.set(key, snapshot);
  return snapshot;
};

const incrementSnapshotCount = (
  snapshot: SnapshotRecord,
  field: CountField,
  count: number
): void => {
  snapshot.counts[field] += count;
};

const seedPartyCollection = async (
  db: Db,
  input: {
    collectionName: string;
    kind: FilemakerPartySnapshotKind;
    snapshots: Map<string, SnapshotRecord>;
    rebuiltAt: string;
  }
): Promise<number> => {
  let count = 0;
  const cursor = db.collection(input.collectionName).find(
    {},
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
  );
  for await (const document of cursor) {
    const id = optionalString(document['id']);
    if (id === undefined) continue;
    const fallbackName = [document['firstName'], document['lastName']]
      .filter((part: unknown): part is string => typeof part === 'string')
      .join(' ')
      .trim();
    const seed = buildEmptySnapshot(
      {
        id,
        kind: input.kind,
        legacyUuid: optionalString(document['legacyUuid']),
        name:
          optionalString(document['name']) ??
          optionalString(document['eventName']) ??
          optionalString(document['fullName']) ??
          optionalString(fallbackName),
      },
      input.rebuiltAt
    );
    input.snapshots.set(seed.id, seed);
    count += 1;
  }
  return count;
};

const applyGroupedCounts = async (
  db: Db,
  input: {
    collectionName: string;
    countField: CountField;
    groupIdExpression: Document;
    match: Document;
    partyKindExpression: string | Document;
    rebuiltAt: string;
    snapshots: Map<string, SnapshotRecord>;
  }
): Promise<number> => {
  let groupCount = 0;
  const cursor = db.collection(input.collectionName).aggregate<GroupedCount>([
    { $match: input.match },
    {
      $group: {
        _id: {
          partyId: input.groupIdExpression,
          partyKind: input.partyKindExpression,
        },
        count: { $sum: 1 },
      },
    },
  ]);
  for await (const group of cursor) {
    const partyKind = optionalString(group._id?.partyKind) as FilemakerPartySnapshotKind | undefined;
    const partyId = optionalString(group._id?.partyId);
    if (partyKind === undefined || partyId === undefined) continue;
    const snapshot = getOrCreateSnapshot(input.snapshots, partyKind, partyId, input.rebuiltAt);
    incrementSnapshotCount(snapshot, input.countField, group.count ?? 0);
    groupCount += 1;
  }
  return groupCount;
};

const applyContactLogCounts = async (
  db: Db,
  snapshots: Map<string, SnapshotRecord>,
  rebuiltAt: string
): Promise<number> => {
  let groupCount = 0;
  const cursor = db.collection(CONTACT_LOGS_COLLECTION).aggregate<GroupedCount>([
    { $unwind: '$linkedParties' },
    {
      $group: {
        _id: {
          partyId: '$linkedParties.partyId',
          partyKind: '$linkedParties.partyKind',
        },
        count: { $sum: 1 },
        latestContactLogAt: { $max: '$dateEntered' },
      },
    },
  ]);
  for await (const group of cursor) {
    const partyKind = optionalString(group._id?.partyKind) as FilemakerPartySnapshotKind | undefined;
    const partyId = optionalString(group._id?.partyId);
    if (partyKind === undefined || partyId === undefined) continue;
    const snapshot = getOrCreateSnapshot(snapshots, partyKind, partyId, rebuiltAt);
    incrementSnapshotCount(snapshot, 'contactLogs', group.count ?? 0);
    const latest = optionalString(group.latestContactLogAt);
    if (latest !== undefined) snapshot.latestContactLogAt = latest;
    groupCount += 1;
  }
  return groupCount;
};

const finalizeSnapshotTotals = (snapshots: Map<string, SnapshotRecord>): void => {
  snapshots.forEach((snapshot: SnapshotRecord): void => {
    snapshot.counts.total =
      snapshot.counts.addresses +
      snapshot.counts.contactLogs +
      snapshot.counts.demands +
      snapshot.counts.emails +
      snapshot.counts.events +
      snapshot.counts.harvestProfiles +
      snapshot.counts.organizations +
      snapshot.counts.persons +
      snapshot.counts.websites;
  });
};

const toSnapshotDocument = (snapshot: SnapshotRecord): SnapshotDocument => ({
  _id: snapshot.id,
  ...snapshot,
});

const toReplaceOperation = (
  snapshot: SnapshotRecord
): AnyBulkWriteOperation<SnapshotDocument> => ({
  replaceOne: {
    filter: { _id: snapshot.id },
    replacement: toSnapshotDocument(snapshot),
    upsert: true,
  },
});

const writeSnapshots = async (
  collection: Collection<SnapshotDocument>,
  snapshots: SnapshotRecord[],
  batchSize: number
): Promise<WriteResultSummary> => {
  let matchedCount = 0;
  let modifiedCount = 0;
  let upsertedCount = 0;
  for (let index = 0; index < snapshots.length; index += batchSize) {
    const batch = snapshots.slice(index, index + batchSize);
    if (batch.length === 0) continue;
    const result = await collection.bulkWrite(batch.map(toReplaceOperation), { ordered: false });
    matchedCount += result.matchedCount;
    modifiedCount += result.modifiedCount;
    upsertedCount += result.upsertedCount;
  }
  return { matchedCount, modifiedCount, upsertedCount };
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

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const snapshots = new Map<string, SnapshotRecord>();
    const rebuiltAt = new Date().toISOString();
    const partySeedCounts = {
      events: await seedPartyCollection(db, {
        collectionName: EVENTS_COLLECTION,
        kind: 'event',
        rebuiltAt,
        snapshots,
      }),
      organizations: await seedPartyCollection(db, {
        collectionName: ORGANIZATIONS_COLLECTION,
        kind: 'organization',
        rebuiltAt,
        snapshots,
      }),
      persons: await seedPartyCollection(db, {
        collectionName: PERSONS_COLLECTION,
        kind: 'person',
        rebuiltAt,
        snapshots,
      }),
    };

    const relationshipGroupCounts = {
      addresses: await applyGroupedCounts(db, {
        collectionName: ADDRESS_LINKS_COLLECTION,
        countField: 'addresses',
        groupIdExpression: '$ownerId',
        match: {
          ownerId: { $type: 'string' },
          ownerKind: { $in: ['organization', 'person', 'event'] },
        },
        partyKindExpression: '$ownerKind',
        rebuiltAt,
        snapshots,
      }),
      demands: await applyGroupedCounts(db, {
        collectionName: ORGANIZATION_DEMANDS_COLLECTION,
        countField: 'demands',
        groupIdExpression: '$organizationId',
        match: { organizationId: { $type: 'string' } },
        partyKindExpression: 'organization',
        rebuiltAt,
        snapshots,
      }),
      emailLinks: await applyGroupedCounts(db, {
        collectionName: EMAIL_LINKS_COLLECTION,
        countField: 'emails',
        groupIdExpression: '$partyId',
        match: {
          partyId: { $type: 'string' },
          partyKind: { $in: ['organization', 'person', 'event'] },
        },
        partyKindExpression: '$partyKind',
        rebuiltAt,
        snapshots,
      }),
      eventOrganizations: await applyGroupedCounts(db, {
        collectionName: EVENT_ORGANIZATION_LINKS_COLLECTION,
        countField: 'organizations',
        groupIdExpression: '$eventId',
        match: { eventId: { $type: 'string' } },
        partyKindExpression: 'event',
        rebuiltAt,
        snapshots,
      }),
      harvestProfiles: await applyGroupedCounts(db, {
        collectionName: ORGANIZATION_HARVEST_COLLECTION,
        countField: 'harvestProfiles',
        groupIdExpression: '$organizationId',
        match: { organizationId: { $type: 'string' } },
        partyKindExpression: 'organization',
        rebuiltAt,
        snapshots,
      }),
      organizationEvents: await applyGroupedCounts(db, {
        collectionName: EVENT_ORGANIZATION_LINKS_COLLECTION,
        countField: 'events',
        groupIdExpression: '$organizationId',
        match: { organizationId: { $type: 'string' } },
        partyKindExpression: 'organization',
        rebuiltAt,
        snapshots,
      }),
      organizationPersons: await applyGroupedCounts(db, {
        collectionName: PERSON_ORGANIZATION_LINKS_COLLECTION,
        countField: 'persons',
        groupIdExpression: '$organizationId',
        match: { organizationId: { $type: 'string' } },
        partyKindExpression: 'organization',
        rebuiltAt,
        snapshots,
      }),
      personOrganizations: await applyGroupedCounts(db, {
        collectionName: PERSON_ORGANIZATION_LINKS_COLLECTION,
        countField: 'organizations',
        groupIdExpression: '$personId',
        match: { personId: { $type: 'string' } },
        partyKindExpression: 'person',
        rebuiltAt,
        snapshots,
      }),
      websiteLinks: await applyGroupedCounts(db, {
        collectionName: WEBSITE_LINKS_COLLECTION,
        countField: 'websites',
        groupIdExpression: '$partyId',
        match: {
          partyId: { $type: 'string' },
          partyKind: { $in: ['organization', 'person', 'event'] },
        },
        partyKindExpression: '$partyKind',
        rebuiltAt,
        snapshots,
      }),
    };
    const contactLogGroupCount = await applyContactLogCounts(db, snapshots, rebuiltAt);
    finalizeSnapshotTotals(snapshots);

    const collection = db.collection<SnapshotDocument>(FILEMAKER_PARTY_SNAPSHOTS_COLLECTION);
    const replacedCollection =
      !options.dryRun && options.replaceCollection
        ? await dropCollectionIfExists(collection)
        : false;
    const snapshotDocuments = Array.from(snapshots.values());
    const writeResult = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : await writeSnapshots(collection, snapshotDocuments, options.batchSize);
    if (!options.dryRun) await ensureMongoFilemakerPartySnapshotIndexes(collection);

    console.log(
      JSON.stringify(
        {
          contactLogGroupCount,
          mode: options.dryRun ? 'dry-run' : 'write',
          partySeedCounts,
          relationshipGroupCounts,
          replacedCollection,
          snapshotCount: snapshotDocuments.length,
          snapshotsWithRelationships: snapshotDocuments.filter(
            (snapshot: SnapshotRecord): boolean => snapshot.counts.total > 0
          ).length,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          writeResult,
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
