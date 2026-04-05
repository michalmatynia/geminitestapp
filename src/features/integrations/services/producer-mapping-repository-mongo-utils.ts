import { ObjectId, type Filter } from 'mongodb';

import type { MongoExternalCatalogEntityDoc as MongoExternalProducerDoc } from '@/shared/contracts/integrations/mongo';
import type { ProducerMapping, ProducerMappingWithDetails } from '@/shared/contracts/integrations/producers';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { MongoProducerDoc as SharedMongoProducerDoc } from '@/shared/lib/db/services/database-sync-types';

export type MongoProducerMappingDoc = {
  _id: string | ObjectId;
  connectionId: string;
  externalProducerId: string;
  internalProducerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MongoInternalProducerDoc = Omit<
  SharedMongoProducerDoc,
  '_id' | 'id' | 'name' | 'createdAt' | 'updatedAt'
> & {
  _id: string | ObjectId;
  id: string;
  name: string;
  website?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type { MongoExternalProducerDoc };
export type { MongoInternalProducerDoc };

export const PRODUCER_MAPPING_COLLECTION = 'producer_mappings';
export const EXTERNAL_PRODUCER_COLLECTION = 'external_producers';
export const INTERNAL_PRODUCER_COLLECTION = 'product_producers';

let mongoProducerMappingIndexesReady: Promise<void> | null = null;

export const ensureMongoProducerMappingIndexes = async (): Promise<void> => {
  if (!mongoProducerMappingIndexesReady) {
    mongoProducerMappingIndexesReady = (async () => {
      const db = await getMongoDb();
      const mappingCollection = db.collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION);
      const externalCollection = db.collection<MongoExternalProducerDoc>(
        EXTERNAL_PRODUCER_COLLECTION
      );

      await Promise.all([
        mappingCollection.createIndex(
          { connectionId: 1, internalProducerId: 1 },
          {
            unique: true,
            name: 'producer_mappings_connection_internal_unique',
          }
        ),
        mappingCollection.createIndex(
          { connectionId: 1, isActive: 1 },
          { name: 'producer_mappings_connection_active' }
        ),
        mappingCollection.createIndex(
          { connectionId: 1, externalProducerId: 1 },
          { name: 'producer_mappings_connection_external' }
        ),
        externalCollection.createIndex(
          { connectionId: 1, externalId: 1 },
          {
            unique: true,
            name: 'external_producers_connection_external_unique',
          }
        ),
        externalCollection.createIndex(
          { connectionId: 1, name: 1 },
          { name: 'external_producers_connection_name' }
        ),
      ]);
    })();
  }
  await mongoProducerMappingIndexesReady;
};

export const buildMongoIdFilter = (id: string): Filter<MongoProducerMappingDoc> => {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ _id: id }, { _id: new ObjectId(id) }],
    } as Filter<MongoProducerMappingDoc>;
  }
  return { _id: id } as Filter<MongoProducerMappingDoc>;
};

const buildMongoIdCandidates = (values: string[]): Array<string | ObjectId> => {
  const candidates: Array<string | ObjectId> = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = raw.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    candidates.push(value);
    if (ObjectId.isValid(value)) {
      candidates.push(new ObjectId(value));
    }
  }
  return candidates;
};

export const mapMongoProducerMappingToRecord = (
  record: MongoProducerMappingDoc
): ProducerMapping => ({
  id: record._id.toString(),
  connectionId: record.connectionId,
  externalProducerId: record.externalProducerId,
  internalProducerId: record.internalProducerId,
  isActive: Boolean(record.isActive),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const mapMongoExternalProducer = (
  record: MongoExternalProducerDoc
): ProducerMappingWithDetails['externalProducer'] => ({
  id: record._id.toString(),
  connectionId: record.connectionId,
  externalId: record.externalId,
  name: record.name,
  metadata: record.metadata ?? null,
  fetchedAt: record.fetchedAt.toISOString(),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const mapMongoInternalProducer = (
  record: MongoInternalProducerDoc
): ProducerMappingWithDetails['internalProducer'] => ({
  id: record.id || record._id.toString(),
  name: record.name,
  website: record.website ?? null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const createMissingExternalProducer = (
  mapping: MongoProducerMappingDoc
): ProducerMappingWithDetails['externalProducer'] => ({
  id: mapping.externalProducerId,
  connectionId: mapping.connectionId,
  externalId: mapping.externalProducerId,
  name: `[Missing external producer: ${mapping.externalProducerId}]`,
  metadata: null,
  fetchedAt: mapping.updatedAt.toISOString(),
  createdAt: mapping.createdAt.toISOString(),
  updatedAt: mapping.updatedAt.toISOString(),
});

const createMissingInternalProducer = (
  mapping: MongoProducerMappingDoc
): ProducerMappingWithDetails['internalProducer'] => ({
  id: mapping.internalProducerId,
  name: `[Missing internal producer: ${mapping.internalProducerId}]`,
  website: null,
  createdAt: mapping.createdAt.toISOString(),
  updatedAt: mapping.updatedAt.toISOString(),
});

export const hydrateMongoProducerMappingDetails = async (
  records: MongoProducerMappingDoc[]
): Promise<ProducerMappingWithDetails[]> => {
  if (records.length === 0) return [];

  const db = await getMongoDb();
  const externalCollection = db.collection<MongoExternalProducerDoc>(EXTERNAL_PRODUCER_COLLECTION);
  const internalCollection = db.collection<MongoInternalProducerDoc>(INTERNAL_PRODUCER_COLLECTION);

  const connectionIds = Array.from(
    new Set(records.map((record: MongoProducerMappingDoc) => record.connectionId))
  );
  const externalIds = Array.from(
    new Set(
      records
        .map((record: MongoProducerMappingDoc) => record.externalProducerId)
        .filter((value: string) => Boolean(value))
    )
  );
  const internalIds = Array.from(
    new Set(
      records
        .map((record: MongoProducerMappingDoc) => record.internalProducerId)
        .filter((value: string) => Boolean(value))
    )
  );

  const externalCandidates = buildMongoIdCandidates(externalIds);
  const internalCandidates = buildMongoIdCandidates(internalIds);

  const externalFilter: Filter<MongoExternalProducerDoc> =
    externalIds.length > 0
      ? ({
        connectionId: connectionIds.length === 1 ? connectionIds[0] : { $in: connectionIds },
        $or: [{ _id: { $in: externalCandidates } }, { externalId: { $in: externalIds } }],
      } as Filter<MongoExternalProducerDoc>)
      : ({ _id: { $exists: false } } as Filter<MongoExternalProducerDoc>);

  const internalFilter: Filter<MongoInternalProducerDoc> =
    internalIds.length > 0
      ? ({
        $or: [{ id: { $in: internalIds } }, { _id: { $in: internalCandidates } }],
      } as Filter<MongoInternalProducerDoc>)
      : ({ _id: { $exists: false } } as Filter<MongoInternalProducerDoc>);

  const [externalDocs, internalDocs] = await Promise.all([
    externalCollection.find(externalFilter).toArray(),
    internalCollection.find(internalFilter).toArray(),
  ]);

  const externalByKey = new Map<string, MongoExternalProducerDoc>();
  externalDocs.forEach((doc: MongoExternalProducerDoc) => {
    externalByKey.set(doc._id.toString(), doc);
    externalByKey.set(doc.externalId, doc);
  });

  const internalByKey = new Map<string, MongoInternalProducerDoc>();
  internalDocs.forEach((doc: MongoInternalProducerDoc) => {
    internalByKey.set(doc.id, doc);
    internalByKey.set(doc._id.toString(), doc);
  });

  return records.map((record: MongoProducerMappingDoc): ProducerMappingWithDetails => {
    const externalDoc = externalByKey.get(record.externalProducerId);
    const internalDoc = internalByKey.get(record.internalProducerId);

    return {
      ...mapMongoProducerMappingToRecord(record),
      externalProducer: externalDoc
        ? mapMongoExternalProducer(externalDoc)
        : createMissingExternalProducer(record),
      internalProducer: internalDoc
        ? mapMongoInternalProducer(internalDoc)
        : createMissingInternalProducer(record),
    };
  });
};
