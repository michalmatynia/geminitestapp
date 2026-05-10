import 'server-only';

import type { Collection, Document } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  createEmptyFilemakerPartySnapshotCounts,
  type FilemakerPartySnapshot,
  type FilemakerPartySnapshotCounts,
  type FilemakerPartySnapshotKind,
} from '../filemaker-party-snapshot.types';

export const FILEMAKER_PARTY_SNAPSHOTS_COLLECTION = 'filemaker_party_snapshots';

type FilemakerPartySnapshotMongoDocument = Document & FilemakerPartySnapshot & {
  _id: string;
};

type SnapshotLookupInput = {
  legacyUuid?: string;
  partyId: string;
  partyKind: FilemakerPartySnapshotKind;
};

export const buildFilemakerPartySnapshotId = (
  partyKind: FilemakerPartySnapshotKind,
  partyId: string
): string => `${partyKind}:${partyId}`;

export const getFilemakerPartySnapshotsCollection = async (): Promise<
  Collection<FilemakerPartySnapshotMongoDocument>
> => {
  const db = await getMongoDb();
  return db.collection<FilemakerPartySnapshotMongoDocument>(
    FILEMAKER_PARTY_SNAPSHOTS_COLLECTION
  );
};

export const ensureMongoFilemakerPartySnapshotIndexes = async (
  collection: Collection<FilemakerPartySnapshotMongoDocument>
): Promise<void> => {
  await Promise.all([
    collection.createIndex(
      { partyKind: 1, partyId: 1 },
      { name: 'filemaker_party_snapshots_party_unique', unique: true }
    ),
    collection.createIndex(
      { partyKind: 1, partyLegacyUuid: 1 },
      {
        name: 'filemaker_party_snapshots_legacy_uuid',
        partialFilterExpression: { partyLegacyUuid: { $type: 'string' } },
      }
    ),
    collection.createIndex(
      { partyKind: 1, 'counts.total': -1 },
      { name: 'filemaker_party_snapshots_total_links' }
    ),
    collection.createIndex(
      { partyKind: 1, latestContactLogAt: -1 },
      {
        name: 'filemaker_party_snapshots_latest_contact_log',
        partialFilterExpression: { latestContactLogAt: { $type: 'string' } },
      }
    ),
  ]);
};

const toSnapshotCountNumber = (value: unknown): number =>
  typeof value === 'number' ? value : 0;

const toSnapshotCounts = (value: unknown): FilemakerPartySnapshotCounts => {
  const fallback = createEmptyFilemakerPartySnapshotCounts();
  if (typeof value !== 'object' || value === null) return fallback;
  const record = value as Record<keyof FilemakerPartySnapshotCounts, unknown>;
  return {
    addresses: toSnapshotCountNumber(record.addresses),
    contactLogs: toSnapshotCountNumber(record.contactLogs),
    demands: toSnapshotCountNumber(record.demands),
    emails: toSnapshotCountNumber(record.emails),
    events: toSnapshotCountNumber(record.events),
    harvestProfiles: toSnapshotCountNumber(record.harvestProfiles),
    organizations: toSnapshotCountNumber(record.organizations),
    persons: toSnapshotCountNumber(record.persons),
    total: toSnapshotCountNumber(record.total),
    websites: toSnapshotCountNumber(record.websites),
  };
};

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const toFilemakerPartySnapshot = (
  document: FilemakerPartySnapshotMongoDocument
): FilemakerPartySnapshot => ({
  counts: toSnapshotCounts(document.counts),
  id: document.id,
  ...(optionalString(document.latestContactLogAt) !== undefined
    ? { latestContactLogAt: optionalString(document.latestContactLogAt) }
    : {}),
  partyId: document.partyId,
  partyKind: document.partyKind,
  ...(optionalString(document.partyLegacyUuid) !== undefined
    ? { partyLegacyUuid: optionalString(document.partyLegacyUuid) }
    : {}),
  ...(optionalString(document.partyName) !== undefined
    ? { partyName: optionalString(document.partyName) }
    : {}),
  rebuiltAt: document.rebuiltAt,
  schemaVersion: 1,
});

export const getMongoFilemakerPartySnapshot = async (
  input: SnapshotLookupInput
): Promise<FilemakerPartySnapshot | null> => {
  const collection = await getFilemakerPartySnapshotsCollection();
  const clauses: Document[] = [
    {
      partyId: input.partyId,
      partyKind: input.partyKind,
    },
  ];
  const legacyUuid = input.legacyUuid?.trim() ?? '';
  if (legacyUuid.length > 0) {
    clauses.push({
      partyKind: input.partyKind,
      partyLegacyUuid: legacyUuid,
    });
  }
  const document = await collection.findOne({ $or: clauses });
  return document === null ? null : toFilemakerPartySnapshot(document);
};
