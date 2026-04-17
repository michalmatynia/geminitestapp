import 'server-only';

import { createHash } from 'crypto';

import type {
  DatabaseEngineMongoSyncVerification,
  DatabaseEngineMongoSyncVerificationCollection,
  MongoSource,
} from '@/shared/contracts/database';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { BSON, type Db, type Document } from 'mongodb';

const DOCUMENT_HASH_BATCH_SIZE = 500;

type MongoCollectionListEntry = {
  name: string;
  type?: string;
  options?: Record<string, unknown>;
};

type MongoCollectionFingerprint = {
  name: string;
  type: string;
  count: number | null;
  documentsHash: string | null;
  indexesHash: string | null;
  optionsHash: string;
};

type MongoSourceFingerprint = {
  dbName: string;
  collections: Map<string, MongoCollectionFingerprint>;
};

type CollectionMatchState = {
  typeMatches: boolean;
  optionsMatch: boolean;
  indexesMatch: boolean;
  documentsMatch: boolean;
};

type CollectionContentComparison = {
  name: string;
  sourceCollection: MongoCollectionFingerprint | undefined;
  targetCollection: MongoCollectionFingerprint | undefined;
  state: CollectionMatchState;
  mismatches: string[];
};

const isUserCollectionName = (name: string): boolean => !name.startsWith('system.');

const sortCanonicalValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortCanonicalValue);
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortCanonicalValue(record[key])])
    );
  }

  return value;
};

const canonicalizeForHash = (value: unknown): string => {
  const serialized = BSON.EJSON.serialize(value, { relaxed: false });
  return JSON.stringify(sortCanonicalValue(serialized));
};

const createCanonicalHash = (value: unknown): string =>
  createHash('sha256').update(canonicalizeForHash(value)).digest('hex');

const normalizeIndexDefinition = (index: Document): Record<string, unknown> => {
  const normalized: Record<string, unknown> = { ...index };
  delete normalized['v'];
  delete normalized['ns'];
  return normalized;
};

const hashCollectionDocuments = async (
  db: Db,
  collectionName: string
): Promise<{ count: number; documentsHash: string }> => {
  const hash = createHash('sha256');
  let count = 0;
  const cursor = db
    .collection(collectionName)
    .find({}, { batchSize: DOCUMENT_HASH_BATCH_SIZE })
    .sort({ _id: 1 });

  for await (const document of cursor) {
    count += 1;
    hash.update(canonicalizeForHash(document));
    hash.update('\n');
  }

  return {
    count,
    documentsHash: hash.digest('hex'),
  };
};

const fingerprintCollection = async (
  db: Db,
  entry: MongoCollectionListEntry
): Promise<MongoCollectionFingerprint> => {
  const type = entry.type ?? 'collection';
  const optionsHash = createCanonicalHash({
    type,
    options: entry.options ?? {},
  });

  if (type !== 'collection') {
    return {
      name: entry.name,
      type,
      count: null,
      documentsHash: null,
      indexesHash: null,
      optionsHash,
    };
  }

  const collection = db.collection(entry.name);
  const indexes = (await collection.listIndexes().toArray())
    .map(normalizeIndexDefinition)
    .sort((left, right) => String(left['name'] ?? '').localeCompare(String(right['name'] ?? '')));
  const { count, documentsHash } = await hashCollectionDocuments(db, entry.name);

  return {
    name: entry.name,
    type,
    count,
    documentsHash,
    indexesHash: createCanonicalHash(indexes),
    optionsHash,
  };
};

const fingerprintMongoSource = async (
  source: MongoSource,
  dbName: string
): Promise<MongoSourceFingerprint> => {
  const db = await getMongoDb(source);
  const collections = (
    (await db.listCollections({}, { nameOnly: false }).toArray()) as MongoCollectionListEntry[]
  )
    .filter((entry) => isUserCollectionName(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name));

  const fingerprints = new Map<string, MongoCollectionFingerprint>();
  const collectionFingerprints = await Promise.all(
    collections.map(async (entry) => fingerprintCollection(db, entry))
  );
  for (const fingerprint of collectionFingerprints) {
    fingerprints.set(fingerprint.name, fingerprint);
  }

  return {
    dbName,
    collections: fingerprints,
  };
};

const recordMissingCollectionMismatch = (
  name: string,
  sourceCollection: MongoCollectionFingerprint | undefined,
  mismatches: string[]
): void => {
  if (sourceCollection !== undefined) {
    mismatches.push(`Target is missing collection "${name}".`);
    return;
  }

  mismatches.push(`Target has extra collection "${name}".`);
};

const getCollectionMatchState = (
  sourceCollection: MongoCollectionFingerprint | undefined,
  targetCollection: MongoCollectionFingerprint | undefined
): CollectionMatchState => {
  const hasBothCollections = sourceCollection !== undefined && targetCollection !== undefined;
  return {
    typeMatches: hasBothCollections && sourceCollection.type === targetCollection.type,
    optionsMatch: hasBothCollections && sourceCollection.optionsHash === targetCollection.optionsHash,
    indexesMatch: hasBothCollections && sourceCollection.indexesHash === targetCollection.indexesHash,
    documentsMatch:
      hasBothCollections &&
      sourceCollection.count === targetCollection.count &&
      sourceCollection.documentsHash === targetCollection.documentsHash,
  };
};

const recordCollectionContentMismatches = (comparison: CollectionContentComparison): void => {
  const { name, sourceCollection, targetCollection, state, mismatches } = comparison;
  if (sourceCollection === undefined || targetCollection === undefined) return;
  mismatches.push(
    ...[
      {
        matches: state.typeMatches,
        message: `Collection "${name}" type mismatch: ${sourceCollection.type} != ${targetCollection.type}.`,
      },
      { matches: state.optionsMatch, message: `Collection "${name}" options mismatch.` },
      { matches: state.indexesMatch, message: `Collection "${name}" indexes mismatch.` },
      {
        matches: state.documentsMatch,
        message: `Collection "${name}" document mismatch: count ${sourceCollection.count ?? 'n/a'} != ${targetCollection.count ?? 'n/a'}.`,
      },
    ]
      .filter((mismatch) => !mismatch.matches)
      .map((mismatch) => mismatch.message)
  );
};

const getCollectionType = (collection: MongoCollectionFingerprint | undefined): string | null =>
  collection === undefined ? null : collection.type;

const getCollectionCount = (collection: MongoCollectionFingerprint | undefined): number | null =>
  collection === undefined ? null : collection.count;

const getCollectionDocumentHash = (
  collection: MongoCollectionFingerprint | undefined
): string | null => (collection === undefined ? null : collection.documentsHash);

const getCollectionIndexesHash = (
  collection: MongoCollectionFingerprint | undefined
): string | null => (collection === undefined ? null : collection.indexesHash);

const getCollectionOptionsHash = (
  collection: MongoCollectionFingerprint | undefined
): string | null => (collection === undefined ? null : collection.optionsHash);

const compareCollectionFingerprint = (
  name: string,
  sourceCollection: MongoCollectionFingerprint | undefined,
  targetCollection: MongoCollectionFingerprint | undefined,
  mismatches: string[]
): DatabaseEngineMongoSyncVerificationCollection => {
  if (sourceCollection === undefined || targetCollection === undefined) {
    recordMissingCollectionMismatch(name, sourceCollection, mismatches);
  }
  const state = getCollectionMatchState(sourceCollection, targetCollection);
  recordCollectionContentMismatches({
    name,
    sourceCollection,
    targetCollection,
    state,
    mismatches,
  });

  return {
    name,
    sourceExists: sourceCollection !== undefined,
    targetExists: targetCollection !== undefined,
    typeMatches: state.typeMatches,
    optionsMatch: state.optionsMatch,
    indexesMatch: state.indexesMatch,
    documentsMatch: state.documentsMatch,
    sourceType: getCollectionType(sourceCollection),
    targetType: getCollectionType(targetCollection),
    sourceCount: getCollectionCount(sourceCollection),
    targetCount: getCollectionCount(targetCollection),
    sourceHash: getCollectionDocumentHash(sourceCollection),
    targetHash: getCollectionDocumentHash(targetCollection),
    sourceIndexesHash: getCollectionIndexesHash(sourceCollection),
    targetIndexesHash: getCollectionIndexesHash(targetCollection),
    sourceOptionsHash: getCollectionOptionsHash(sourceCollection),
    targetOptionsHash: getCollectionOptionsHash(targetCollection),
  };
};

export const verifyMongoSourceParity = async (params: {
  source: MongoSource;
  target: MongoSource;
  sourceDbName: string;
  targetDbName: string;
}): Promise<DatabaseEngineMongoSyncVerification> => {
  const sourceFingerprint = await fingerprintMongoSource(params.source, params.sourceDbName);
  const targetFingerprint = await fingerprintMongoSource(params.target, params.targetDbName);

  const collectionNames = Array.from(
    new Set([
      ...sourceFingerprint.collections.keys(),
      ...targetFingerprint.collections.keys(),
    ])
  ).sort((left, right) => left.localeCompare(right));
  const mismatches: string[] = [];
  const collections = collectionNames.map((name) =>
    compareCollectionFingerprint(
      name,
      sourceFingerprint.collections.get(name),
      targetFingerprint.collections.get(name),
      mismatches
    )
  );

  return {
    status: mismatches.length === 0 ? 'passed' : 'failed',
    verifiedAt: new Date().toISOString(),
    source: params.source,
    target: params.target,
    sourceDbName: sourceFingerprint.dbName,
    targetDbName: targetFingerprint.dbName,
    sourceCollections: sourceFingerprint.collections.size,
    targetCollections: targetFingerprint.collections.size,
    collectionsCompared: collections.length,
    mismatches,
    collections,
  };
};

export const testOnly = {
  canonicalizeForHash,
  sortCanonicalValue,
};
