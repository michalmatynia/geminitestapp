import { ObjectId, type Filter } from 'mongodb';

import type {
  MongoExternalCatalogEntityDoc,
  TagMapping,
  TagMappingWithDetails,
} from '@/shared/contracts/integrations';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

export type MongoTagMappingDoc = {
  _id: string | ObjectId;
  connectionId: string;
  externalTagId: string;
  internalTagId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MongoExternalTagDoc = MongoExternalCatalogEntityDoc;

export type MongoInternalTagDoc = {
  _id: string | ObjectId;
  id?: string;
  name: string;
  color?: string | null;
  catalogId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export const TAG_MAPPING_COLLECTION = 'tag_mappings';
export const EXTERNAL_TAG_COLLECTION = 'external_tags';
export const INTERNAL_TAG_COLLECTION = 'product_tags';

let mongoTagMappingIndexesReady: Promise<void> | null = null;

export const ensureMongoTagMappingIndexes = async (): Promise<void> => {
  if (!mongoTagMappingIndexesReady) {
    mongoTagMappingIndexesReady = (async () => {
      const db = await getMongoDb();
      const mappingCollection = db.collection<MongoTagMappingDoc>(TAG_MAPPING_COLLECTION);
      const externalCollection = db.collection<MongoExternalTagDoc>(EXTERNAL_TAG_COLLECTION);

      await Promise.all([
        mappingCollection.createIndex(
          { connectionId: 1, internalTagId: 1 },
          {
            unique: true,
            name: 'tag_mappings_connection_internal_unique',
          }
        ),
        mappingCollection.createIndex(
          { connectionId: 1, isActive: 1 },
          { name: 'tag_mappings_connection_active' }
        ),
        mappingCollection.createIndex(
          { connectionId: 1, externalTagId: 1 },
          { name: 'tag_mappings_connection_external' }
        ),
        externalCollection.createIndex(
          { connectionId: 1, externalId: 1 },
          {
            unique: true,
            name: 'external_tags_connection_external_unique',
          }
        ),
        externalCollection.createIndex({ connectionId: 1, name: 1 }, { name: 'external_tags_name' }),
      ]);
    })();
  }

  await mongoTagMappingIndexesReady;
};

export const buildMongoTagMappingIdFilter = (id: string): Filter<MongoTagMappingDoc> => {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: id }, { _id: new ObjectId(id) }] } as Filter<MongoTagMappingDoc>;
  }
  return { _id: id } as Filter<MongoTagMappingDoc>;
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

export const mapMongoTagMappingToRecord = (record: MongoTagMappingDoc): TagMapping => ({
  id: record._id.toString(),
  connectionId: record.connectionId,
  externalTagId: record.externalTagId,
  internalTagId: record.internalTagId,
  isActive: Boolean(record.isActive),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const mapMongoExternalTag = (
  record: MongoExternalTagDoc
): TagMappingWithDetails['externalTag'] => ({
  id: record._id.toString(),
  connectionId: record.connectionId,
  externalId: record.externalId,
  name: record.name,
  metadata: record.metadata ?? null,
  fetchedAt: record.fetchedAt.toISOString(),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const mapMongoInternalTag = (record: MongoInternalTagDoc): TagMappingWithDetails['internalTag'] => ({
  id: record.id || record._id.toString(),
  name: record.name,
  color: record.color ?? null,
  catalogId: record.catalogId ?? '',
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const createMissingExternalTag = (
  mapping: MongoTagMappingDoc
): TagMappingWithDetails['externalTag'] => ({
  id: mapping.externalTagId,
  connectionId: mapping.connectionId,
  externalId: mapping.externalTagId,
  name: `[Missing external tag: ${mapping.externalTagId}]`,
  metadata: null,
  fetchedAt: mapping.updatedAt.toISOString(),
  createdAt: mapping.createdAt.toISOString(),
  updatedAt: mapping.updatedAt.toISOString(),
});

const createMissingInternalTag = (
  mapping: MongoTagMappingDoc
): TagMappingWithDetails['internalTag'] => ({
  id: mapping.internalTagId,
  name: `[Missing internal tag: ${mapping.internalTagId}]`,
  color: null,
  catalogId: '',
  createdAt: mapping.createdAt.toISOString(),
  updatedAt: mapping.updatedAt.toISOString(),
});

export const hydrateMongoTagMappingDetails = async (
  records: MongoTagMappingDoc[]
): Promise<TagMappingWithDetails[]> => {
  if (records.length === 0) return [];

  const db = await getMongoDb();
  const externalCollection = db.collection<MongoExternalTagDoc>(EXTERNAL_TAG_COLLECTION);
  const internalCollection = db.collection<MongoInternalTagDoc>(INTERNAL_TAG_COLLECTION);

  const connectionIds = Array.from(
    new Set(records.map((record: MongoTagMappingDoc) => record.connectionId))
  );
  const externalIds = Array.from(
    new Set(
      records
        .map((record: MongoTagMappingDoc) => record.externalTagId)
        .filter((value: string) => Boolean(value))
    )
  );
  const internalIds = Array.from(
    new Set(
      records
        .map((record: MongoTagMappingDoc) => record.internalTagId)
        .filter((value: string) => Boolean(value))
    )
  );

  const externalCandidates = buildMongoIdCandidates(externalIds);
  const internalCandidates = buildMongoIdCandidates(internalIds);

  const externalFilter: Filter<MongoExternalTagDoc> =
    externalIds.length > 0
      ? ({
          connectionId: connectionIds.length === 1 ? connectionIds[0] : { $in: connectionIds },
          $or: [{ _id: { $in: externalCandidates } }, { externalId: { $in: externalIds } }],
        } as Filter<MongoExternalTagDoc>)
      : ({ _id: { $exists: false } } as Filter<MongoExternalTagDoc>);

  const internalFilter: Filter<MongoInternalTagDoc> =
    internalIds.length > 0
      ? ({
          $or: [{ id: { $in: internalIds } }, { _id: { $in: internalCandidates } }],
        } as Filter<MongoInternalTagDoc>)
      : ({ _id: { $exists: false } } as Filter<MongoInternalTagDoc>);

  const [externalDocs, internalDocs] = await Promise.all([
    externalCollection.find(externalFilter).toArray(),
    internalCollection.find(internalFilter).toArray(),
  ]);

  const externalByKey = new Map<string, MongoExternalTagDoc>();
  externalDocs.forEach((doc: MongoExternalTagDoc) => {
    externalByKey.set(doc._id.toString(), doc);
    externalByKey.set(doc.externalId, doc);
  });

  const internalByKey = new Map<string, MongoInternalTagDoc>();
  internalDocs.forEach((doc: MongoInternalTagDoc) => {
    internalByKey.set(doc._id.toString(), doc);
    if (doc.id) {
      internalByKey.set(doc.id, doc);
    }
  });

  return records.map((record: MongoTagMappingDoc): TagMappingWithDetails => {
    const externalDoc = externalByKey.get(record.externalTagId);
    const internalDoc = internalByKey.get(record.internalTagId);

    return {
      ...mapMongoTagMappingToRecord(record),
      externalTag: externalDoc ? mapMongoExternalTag(externalDoc) : createMissingExternalTag(record),
      internalTag: internalDoc ? mapMongoInternalTag(internalDoc) : createMissingInternalTag(record),
    };
  });
};
