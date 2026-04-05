import { randomUUID } from 'crypto';

import { ObjectId } from 'mongodb';

import type { TagMappingAssignment, TagMapping, TagMappingCreateInput, TagMappingUpdateInput, TagMappingWithDetails } from '@/shared/contracts/integrations/listings';
import { internalError, notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getTagRepository } from '@/shared/lib/products/services/tag-repository';

import {
  EXTERNAL_TAG_COLLECTION,
  INTERNAL_TAG_COLLECTION,
  TAG_MAPPING_COLLECTION,
  buildMongoTagMappingIdFilter,
  ensureMongoTagMappingIndexes,
  hydrateMongoTagMappingDetails,
  mapMongoTagMappingToRecord,
  type MongoExternalTagDoc,
  type MongoInternalTagDoc,
  type MongoTagMappingDoc,
} from './tag-mapping-repository-mongo-utils';

export type TagMappingRepository = {
  create: (input: TagMappingCreateInput) => Promise<TagMapping>;
  update: (id: string, input: TagMappingUpdateInput) => Promise<TagMapping>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => Promise<TagMapping | null>;
  listByConnection: (connectionId: string) => Promise<TagMappingWithDetails[]>;
  getByInternalTag: (connectionId: string, internalTagId: string) => Promise<TagMapping | null>;
  listByInternalTagIds: (
    connectionId: string,
    internalTagIds: string[]
  ) => Promise<TagMappingWithDetails[]>;
  listByExternalTagIds: (
    connectionId: string,
    externalTagIds: string[]
  ) => Promise<TagMappingWithDetails[]>;
  bulkUpsert: (
    connectionId: string,
    mappings: TagMappingAssignment[]
  ) => Promise<number>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

const buildFallbackTagName = (internalTagId: string): string => {
  const suffix = internalTagId.slice(-6);
  return `Tag ${suffix || 'unknown'}`;
};

const resolveExternalTagRefMongo = async (
  connectionId: string,
  externalTagId: string
): Promise<string> => {
  await ensureMongoTagMappingIndexes();
  const db = await getMongoDb();
  const collection = db.collection<MongoExternalTagDoc>(EXTERNAL_TAG_COLLECTION);

  const candidate = externalTagId.trim();
  if (candidate.length === 0) {
    return candidate;
  }

  const byCandidate = await collection.findOne({
    connectionId,
    $or: ObjectId.isValid(candidate)
      ? [{ _id: candidate }, { _id: new ObjectId(candidate) }, { externalId: candidate }]
      : [{ _id: candidate }, { externalId: candidate }],
  });

  if (byCandidate) {
    return byCandidate._id.toString();
  }

  const now = new Date();
  const doc: MongoExternalTagDoc = {
    _id: randomUUID(),
    connectionId,
    externalId: candidate,
    name: `External Tag ${candidate}`,
    metadata: null,
    fetchedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(doc);
  return doc._id.toString();
};

const ensureInternalTagRefMongo = async (internalTagId: string): Promise<void> => {
  const candidate = internalTagId.trim();
  if (candidate.length === 0) {
    return;
  }

  const db = await getMongoDb();
  const collection = db.collection<MongoInternalTagDoc>(INTERNAL_TAG_COLLECTION);
  const existing = await collection.findOne({
    $or: ObjectId.isValid(candidate)
      ? [{ id: candidate }, { _id: candidate }, { _id: new ObjectId(candidate) }]
      : [{ id: candidate }, { _id: candidate }],
  });
  if (existing) {
    return;
  }

  const tagRepository = await getTagRepository();
  const sourceTag = await tagRepository.getTagById(candidate).catch(() => null);

  const now = new Date();
  await collection.updateOne(
    { id: candidate },
    {
      $set: {
        updatedAt: now,
      },
      $setOnInsert: {
        _id: randomUUID(),
        id: candidate,
        name: sourceTag?.name?.trim() || buildFallbackTagName(candidate),
        color: sourceTag?.color ?? null,
        catalogId: sourceTag?.catalogId ?? '',
        createdAt: now,
      },
    },
    { upsert: true }
  );
};

const sortByInternalTagName = (records: TagMappingWithDetails[]): TagMappingWithDetails[] =>
  [...records].sort((a, b) => {
    const nameA = a.internalTag?.name ?? '';
    const nameB = b.internalTag?.name ?? '';
    return nameA.localeCompare(nameB);
  });

export function getTagMappingRepository(): TagMappingRepository {
  return {
    async create(input: TagMappingCreateInput): Promise<TagMapping> {
      await ensureMongoTagMappingIndexes();
      const db = await getMongoDb();
      const collection = db.collection<MongoTagMappingDoc>(TAG_MAPPING_COLLECTION);

      const resolvedExternalTagId = await resolveExternalTagRefMongo(
        input.connectionId,
        input.externalTagId
      );
      await ensureInternalTagRefMongo(input.internalTagId);

      const now = new Date();
      await collection.updateOne(
        {
          connectionId: input.connectionId,
          internalTagId: input.internalTagId,
        },
        {
          $set: {
            externalTagId: resolvedExternalTagId,
            isActive: true,
            updatedAt: now,
          },
          $setOnInsert: {
            _id: randomUUID(),
            createdAt: now,
          },
        },
        { upsert: true }
      );

      const record = await collection.findOne({
        connectionId: input.connectionId,
        internalTagId: input.internalTagId,
      });
      if (!record) {
        throw internalError('Failed to create tag mapping');
      }
      return mapMongoTagMappingToRecord(record);
    },

    async update(id: string, input: TagMappingUpdateInput): Promise<TagMapping> {
      await ensureMongoTagMappingIndexes();
      const db = await getMongoDb();
      const collection = db.collection<MongoTagMappingDoc>(TAG_MAPPING_COLLECTION);

      const filter = buildMongoTagMappingIdFilter(id);
      const current = await collection.findOne(filter);
      if (!current) {
        throw notFoundError('Tag mapping not found', { mappingId: id });
      }

      const updatePayload: Partial<MongoTagMappingDoc> = {
        updatedAt: new Date(),
      };

      if (input.externalTagId !== undefined) {
        updatePayload.externalTagId = await resolveExternalTagRefMongo(
          current.connectionId,
          input.externalTagId
        );
      }
      if (input.isActive !== undefined) {
        updatePayload.isActive = input.isActive;
      }

      await collection.updateOne(filter, { $set: updatePayload });
      const updated = await collection.findOne(filter);
      if (!updated) {
        throw notFoundError('Tag mapping not found', { mappingId: id });
      }
      return mapMongoTagMappingToRecord(updated);
    },

    async delete(id: string): Promise<void> {
      await ensureMongoTagMappingIndexes();
      const db = await getMongoDb();
      await db.collection<MongoTagMappingDoc>(TAG_MAPPING_COLLECTION).deleteOne(
        buildMongoTagMappingIdFilter(id)
      );
    },

    async getById(id: string): Promise<TagMapping | null> {
      await ensureMongoTagMappingIndexes();
      const db = await getMongoDb();
      const record = await db
        .collection<MongoTagMappingDoc>(TAG_MAPPING_COLLECTION)
        .findOne(buildMongoTagMappingIdFilter(id));
      return record ? mapMongoTagMappingToRecord(record) : null;
    },

    async listByConnection(connectionId: string): Promise<TagMappingWithDetails[]> {
      await ensureMongoTagMappingIndexes();
      const db = await getMongoDb();
      const records = await db
        .collection<MongoTagMappingDoc>(TAG_MAPPING_COLLECTION)
        .find({ connectionId })
        .toArray();

      return sortByInternalTagName(await hydrateMongoTagMappingDetails(records));
    },

    async getByInternalTag(connectionId: string, internalTagId: string): Promise<TagMapping | null> {
      await ensureMongoTagMappingIndexes();
      const db = await getMongoDb();
      const record = await db
        .collection<MongoTagMappingDoc>(TAG_MAPPING_COLLECTION)
        .findOne({ connectionId, internalTagId });
      return record ? mapMongoTagMappingToRecord(record) : null;
    },

    async listByInternalTagIds(
      connectionId: string,
      internalTagIds: string[]
    ): Promise<TagMappingWithDetails[]> {
      if (internalTagIds.length === 0) return [];

      await ensureMongoTagMappingIndexes();
      const db = await getMongoDb();
      const records = await db
        .collection<MongoTagMappingDoc>(TAG_MAPPING_COLLECTION)
        .find({
          connectionId,
          internalTagId: { $in: internalTagIds },
          isActive: true,
        })
        .toArray();

      return hydrateMongoTagMappingDetails(records);
    },

    async listByExternalTagIds(
      connectionId: string,
      externalTagIds: string[]
    ): Promise<TagMappingWithDetails[]> {
      if (externalTagIds.length === 0) return [];

      await ensureMongoTagMappingIndexes();
      const db = await getMongoDb();
      const externalCollection = db.collection<MongoExternalTagDoc>(EXTERNAL_TAG_COLLECTION);
      const externalDocs = await externalCollection
        .find({
          connectionId,
          $or: [
            { externalId: { $in: externalTagIds } },
            {
              _id: {
                $in: externalTagIds.flatMap((value) =>
                  ObjectId.isValid(value) ? [value, new ObjectId(value)] : [value]
                ),
              },
            },
          ],
        })
        .toArray();

      const resolvedExternalTagIds = Array.from(
        new Set([...externalTagIds, ...externalDocs.map((doc) => doc._id.toString())])
      );

      const records = await db
        .collection<MongoTagMappingDoc>(TAG_MAPPING_COLLECTION)
        .find({
          connectionId,
          isActive: true,
          externalTagId: { $in: resolvedExternalTagIds },
        })
        .toArray();

      return hydrateMongoTagMappingDetails(records);
    },

    async bulkUpsert(
      connectionId: string,
      mappings: TagMappingAssignment[]
    ): Promise<number> {
      await ensureMongoTagMappingIndexes();
      const db = await getMongoDb();
      const collection = db.collection<MongoTagMappingDoc>(TAG_MAPPING_COLLECTION);

      let count = 0;
      for (const mapping of mappings) {
        if (mapping.externalTagId === null) {
          const deactivated = await collection.updateMany(
            {
              connectionId,
              internalTagId: mapping.internalTagId,
              isActive: true,
            },
            {
              $set: {
                isActive: false,
                updatedAt: new Date(),
              },
            }
          );
          count += deactivated.modifiedCount ?? 0;
          continue;
        }

        const resolvedExternalTagId = await resolveExternalTagRefMongo(
          connectionId,
          mapping.externalTagId
        );
        await ensureInternalTagRefMongo(mapping.internalTagId);

        const now = new Date();
        await collection.updateOne(
          {
            connectionId,
            internalTagId: mapping.internalTagId,
          },
          {
            $set: {
              externalTagId: resolvedExternalTagId,
              isActive: true,
              updatedAt: now,
            },
            $setOnInsert: {
              _id: randomUUID(),
              createdAt: now,
            },
          },
          { upsert: true }
        );
        count++;
      }

      return count;
    },

    async deleteByConnection(connectionId: string): Promise<number> {
      await ensureMongoTagMappingIndexes();
      const db = await getMongoDb();
      const result = await db
        .collection<MongoTagMappingDoc>(TAG_MAPPING_COLLECTION)
        .deleteMany({ connectionId });
      return result.deletedCount ?? 0;
    },
  };
}
