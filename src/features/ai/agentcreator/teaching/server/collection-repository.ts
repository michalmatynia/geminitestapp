import 'server-only';

import type { AgentTeachingEmbeddingCollectionRecord } from '@/shared/contracts/agent-teaching';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  COLLECTIONS_COLLECTION,
  DOCUMENTS_COLLECTION,
  createId,
  ensureIndexesOnce,
  isMongoAvailable,
} from './internal-base';

type CollectionDoc = Omit<AgentTeachingEmbeddingCollectionRecord, 'id'> & { _id: string };

function mapCollectionDoc(doc: CollectionDoc): AgentTeachingEmbeddingCollectionRecord {
  return {
    id: doc._id,
    name: doc.name,
    description: doc.description ?? null,
    embeddingModel: doc.embeddingModel,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function listEmbeddingCollections(): Promise<AgentTeachingEmbeddingCollectionRecord[]> {
  if (!isMongoAvailable()) return [];
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const docs = await db
    .collection<CollectionDoc>(COLLECTIONS_COLLECTION)
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map(mapCollectionDoc);
}

export async function getEmbeddingCollectionById(
  collectionId: string
): Promise<AgentTeachingEmbeddingCollectionRecord | null> {
  if (!isMongoAvailable()) return null;
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const doc = await db
    .collection<CollectionDoc>(COLLECTIONS_COLLECTION)
    .findOne({ _id: collectionId });
  if (!doc) return null;
  return mapCollectionDoc(doc);
}

export async function upsertEmbeddingCollection(
  input: Partial<AgentTeachingEmbeddingCollectionRecord> & { name: string }
): Promise<AgentTeachingEmbeddingCollectionRecord> {
  if (!isMongoAvailable()) {
    throw new Error('MongoDB is not configured for agent teaching data.');
  }
  await ensureIndexesOnce();
  const db = await getMongoDb();

  const now = new Date().toISOString();
  const rawId = input.id;
  const id = typeof rawId === 'string' && rawId.trim().length > 0 ? rawId.trim() : createId();
  const existing = await db.collection<CollectionDoc>(COLLECTIONS_COLLECTION).findOne({ _id: id });

  const next: AgentTeachingEmbeddingCollectionRecord = {
    id,
    name: input.name.trim(),
    description: getValidatedDescription(input.description),
    embeddingModel: getValidatedEmbeddingModel(input.embeddingModel, existing?.embeddingModel),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.collection<CollectionDoc>(COLLECTIONS_COLLECTION).updateOne(
    { _id: id },
    {
      $set: {
        name: next.name,
        description: next.description,
        embeddingModel: next.embeddingModel,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: next.createdAt },
    },
    { upsert: true }
  );

  return next;
}

function getValidatedDescription(description: string | null | undefined): string | null {
  if (typeof description !== 'string') return null;
  const trimmed = description.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getValidatedEmbeddingModel(input: string | undefined, existing: string | undefined): string {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return existing ?? '';
}

export async function deleteEmbeddingCollection(
  collectionId: string
): Promise<{ deleted: boolean; deletedDocuments: number }> {
  if (!isMongoAvailable()) return { deleted: false, deletedDocuments: 0 };
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const [deleteCollection, deleteDocs] = await Promise.all([
    db.collection<CollectionDoc>(COLLECTIONS_COLLECTION).deleteOne({ _id: collectionId }),
    db.collection(DOCUMENTS_COLLECTION).deleteMany({ collectionId }),
  ]);
  return {
    deleted: deleteCollection.deletedCount > 0,
    deletedDocuments: deleteDocs.deletedCount,
  };
}
