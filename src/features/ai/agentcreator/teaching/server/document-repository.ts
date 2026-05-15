import 'server-only';

import type {
  AgentTeachingDocumentDto as AgentTeachingEmbeddingDocumentListItem,
  AgentTeachingDocumentMetadataDto as AgentTeachingEmbeddingDocumentMetadata,
} from '@/shared/contracts/agent-teaching';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  DOCUMENTS_COLLECTION,
  createId,
  ensureIndexesOnce,
  isMongoAvailable,
} from './internal-base';

type DocumentDoc = {
  _id: string;
  collectionId: string;
  text: string;
  embedding: number[];
  embeddingDimensions: number;
  embeddingModel: string;
  metadata?: AgentTeachingEmbeddingDocumentMetadata | null;
  createdAt: string;
  updatedAt: string;
};

export async function listEmbeddingDocuments(
  collectionId: string,
  options?: { limit?: number; skip?: number }
): Promise<{ items: AgentTeachingEmbeddingDocumentListItem[]; total: number }> {
  if (!isMongoAvailable()) return { items: [], total: 0 };
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const limit = Math.max(1, Math.min(options?.limit ?? 50, 200));
  const skip = Math.max(0, options?.skip ?? 0);
  const [itemsRaw, total] = await Promise.all([
    db
      .collection<DocumentDoc>(DOCUMENTS_COLLECTION)
      .find({ collectionId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .project<Omit<DocumentDoc, 'embedding'>>({ embedding: 0 })
      .toArray(),
    db.collection<DocumentDoc>(DOCUMENTS_COLLECTION).countDocuments({ collectionId }),
  ]);

  const items: AgentTeachingEmbeddingDocumentListItem[] = itemsRaw.map(
    (doc: Omit<DocumentDoc, 'embedding'>) => {
      const docMetadata: AgentTeachingEmbeddingDocumentMetadata = doc.metadata ?? {};
      const trimmedText = doc.text.slice(0, 50).trim();
      const docName = docMetadata.title ?? (trimmedText.length > 0 ? trimmedText : 'Untitled');
      return {
        id: doc._id,
        name: docName,
        description: docMetadata.source ?? null,
        collectionId: doc.collectionId,
        content: doc.text,
        text: doc.text,
        metadata: docMetadata,
        embeddingModel: doc.embeddingModel,
        embeddingDimensions:
          typeof doc.embeddingDimensions === 'number' ? doc.embeddingDimensions : 0,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    }
  );

  return { items, total };
}

export async function createEmbeddingDocument(params: {
  collectionId: string;
  text: string;
  embedding: number[];
  embeddingModel: string;
  metadata?: AgentTeachingEmbeddingDocumentMetadata | null;
}): Promise<AgentTeachingEmbeddingDocumentListItem> {
  if (!isMongoAvailable()) {
    throw new Error('MongoDB is not configured for agent teaching data.');
  }
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const now = new Date().toISOString();
  const id = createId();
  const doc: DocumentDoc = {
    _id: id,
    collectionId: params.collectionId,
    text: params.text,
    embedding: params.embedding,
    embeddingDimensions: params.embedding.length,
    embeddingModel: params.embeddingModel,
    ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<DocumentDoc>(DOCUMENTS_COLLECTION).insertOne(doc);
  const returnMetadata: AgentTeachingEmbeddingDocumentMetadata = params.metadata ?? {};
  const trimmedText = params.text.slice(0, 50).trim();
  const returnName = returnMetadata.title ?? (trimmedText.length > 0 ? trimmedText : 'Untitled');
  return {
    id,
    name: returnName,
    description: returnMetadata.source ?? null,
    collectionId: params.collectionId,
    content: params.text,
    text: params.text,
    metadata: returnMetadata,
    embeddingModel: params.embeddingModel,
    embeddingDimensions: params.embedding.length,
    createdAt: now,
    updatedAt: now,
  };
}

export async function deleteEmbeddingDocument(documentId: string): Promise<boolean> {
  if (!isMongoAvailable()) return false;
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const result = await db
    .collection<DocumentDoc>(DOCUMENTS_COLLECTION)
    .deleteOne({ _id: documentId });
  return result.deletedCount > 0;
}

export type RetrievalDocumentItem = {
  id: string;
  collectionId: string;
  text: string;
  embedding: number[];
  embeddingModel: string;
  metadata: AgentTeachingEmbeddingDocumentMetadata | null;
};

export async function listEmbeddingDocumentsForRetrieval(params: {
  collectionIds: string[];
  limitPerCollection?: number;
}): Promise<Array<RetrievalDocumentItem>> {
  if (!isMongoAvailable()) return [];
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const ids = params.collectionIds.filter((id: string) => id.trim().length > 0);
  if (ids.length === 0) return [];

  const limit = Math.max(1, Math.min(params.limitPerCollection ?? 400, 2000));

  const docs = await db
    .collection<DocumentDoc>(DOCUMENTS_COLLECTION)
    .find({ collectionId: { $in: ids } })
    .sort({ updatedAt: -1 })
    .limit(limit * Math.max(1, ids.length))
    .toArray();

  return docs.map(
    (doc: DocumentDoc): RetrievalDocumentItem => ({
      id: doc._id,
      collectionId: doc.collectionId,
      text: doc.text,
      embedding: Array.isArray(doc.embedding) ? doc.embedding : [],
      embeddingModel: doc.embeddingModel,
      metadata: doc.metadata ?? null,
    })
  );
}
