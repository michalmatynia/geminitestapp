import "server-only";

import { getMongoDb } from "@/shared/lib/db/mongo-client";
import type {
  AgentTeachingAgentRecord,
  AgentTeachingEmbeddingCollectionRecord,
  AgentTeachingEmbeddingDocumentListItem,
  AgentTeachingEmbeddingDocumentMetadata,
} from "@/shared/types/agent-teaching";

const AGENTS_COLLECTION = "agent_teaching_agents";
const COLLECTIONS_COLLECTION = "agent_teaching_collections";
const DOCUMENTS_COLLECTION = "agent_teaching_documents";

type AgentDoc = Omit<AgentTeachingAgentRecord, "id"> & { _id: string };
type CollectionDoc = Omit<AgentTeachingEmbeddingCollectionRecord, "id"> & { _id: string };

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

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const ensureIndexesOnce = (() => {
  let started = false;
  return async (): Promise<void> => {
    if (started) return;
    started = true;
    try {
      const db = await getMongoDb();
      await Promise.all([
        db.collection<AgentDoc>(AGENTS_COLLECTION).createIndex({ updatedAt: -1 }),
        db.collection<CollectionDoc>(COLLECTIONS_COLLECTION).createIndex({ updatedAt: -1 }),
        db.collection<DocumentDoc>(DOCUMENTS_COLLECTION).createIndex({ collectionId: 1, updatedAt: -1 }),
      ]);
    } catch {
      // best-effort; indexing failures should not block the app
    }
  };
})();

export async function listTeachingAgents(): Promise<AgentTeachingAgentRecord[]> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const docs = await db
    .collection<AgentDoc>(AGENTS_COLLECTION)
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map((doc: AgentDoc) => ({
    id: doc._id,
    name: doc.name,
    description: doc.description ?? null,
    llmModel: doc.llmModel,
    embeddingModel: doc.embeddingModel,
    systemPrompt: doc.systemPrompt,
    collectionIds: Array.isArray(doc.collectionIds) ? doc.collectionIds : [],
    retrievalTopK: typeof doc.retrievalTopK === "number" ? doc.retrievalTopK : 5,
    retrievalMinScore: typeof doc.retrievalMinScore === "number" ? doc.retrievalMinScore : 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));
}

export async function getTeachingAgentById(agentId: string): Promise<AgentTeachingAgentRecord | null> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const doc = await db.collection<AgentDoc>(AGENTS_COLLECTION).findOne({ _id: agentId });
  if (!doc) return null;
  return {
    id: doc._id,
    name: doc.name,
    description: doc.description ?? null,
    llmModel: doc.llmModel,
    embeddingModel: doc.embeddingModel,
    systemPrompt: doc.systemPrompt,
    collectionIds: Array.isArray(doc.collectionIds) ? doc.collectionIds : [],
    retrievalTopK: typeof doc.retrievalTopK === "number" ? doc.retrievalTopK : 5,
    retrievalMinScore: typeof doc.retrievalMinScore === "number" ? doc.retrievalMinScore : 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function upsertTeachingAgent(input: Partial<AgentTeachingAgentRecord> & { name: string }): Promise<AgentTeachingAgentRecord> {
  await ensureIndexesOnce();
  const db = await getMongoDb();

  const now = new Date().toISOString();
  const id = (typeof input.id === "string" && input.id.trim()) ? input.id.trim() : createId();
  const existing = await db.collection<AgentDoc>(AGENTS_COLLECTION).findOne({ _id: id });

  const next: AgentTeachingAgentRecord = {
    id,
    name: input.name.trim(),
    description: typeof input.description === "string" ? input.description.trim() || null : null,
    llmModel: typeof input.llmModel === "string" && input.llmModel.trim() ? input.llmModel.trim() : (existing?.llmModel ?? ""),
    embeddingModel: typeof input.embeddingModel === "string" && input.embeddingModel.trim() ? input.embeddingModel.trim() : (existing?.embeddingModel ?? ""),
    systemPrompt: typeof input.systemPrompt === "string" ? input.systemPrompt : (existing?.systemPrompt ?? ""),
    collectionIds: Array.isArray(input.collectionIds) ? input.collectionIds : (existing?.collectionIds ?? []),
    retrievalTopK: typeof input.retrievalTopK === "number" ? input.retrievalTopK : (existing?.retrievalTopK ?? 5),
    retrievalMinScore: typeof input.retrievalMinScore === "number" ? input.retrievalMinScore : (existing?.retrievalMinScore ?? 0),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.collection<AgentDoc>(AGENTS_COLLECTION).updateOne(
    { _id: id },
    {
      $set: {
        name: next.name,
        description: next.description,
        llmModel: next.llmModel,
        embeddingModel: next.embeddingModel,
        systemPrompt: next.systemPrompt,
        collectionIds: next.collectionIds,
        retrievalTopK: next.retrievalTopK,
        retrievalMinScore: next.retrievalMinScore,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: next.createdAt },
    },
    { upsert: true }
  );

  return next;
}

export async function deleteTeachingAgent(agentId: string): Promise<boolean> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const result = await db.collection<AgentDoc>(AGENTS_COLLECTION).deleteOne({ _id: agentId });
  return result.deletedCount > 0;
}

export async function listEmbeddingCollections(): Promise<AgentTeachingEmbeddingCollectionRecord[]> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const docs = await db
    .collection<CollectionDoc>(COLLECTIONS_COLLECTION)
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map((doc: CollectionDoc) => ({
    id: doc._id,
    name: doc.name,
    description: doc.description ?? null,
    embeddingModel: doc.embeddingModel,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));
}

export async function getEmbeddingCollectionById(collectionId: string): Promise<AgentTeachingEmbeddingCollectionRecord | null> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const doc = await db.collection<CollectionDoc>(COLLECTIONS_COLLECTION).findOne({ _id: collectionId });
  if (!doc) return null;
  return {
    id: doc._id,
    name: doc.name,
    description: doc.description ?? null,
    embeddingModel: doc.embeddingModel,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function upsertEmbeddingCollection(input: Partial<AgentTeachingEmbeddingCollectionRecord> & { name: string }): Promise<AgentTeachingEmbeddingCollectionRecord> {
  await ensureIndexesOnce();
  const db = await getMongoDb();

  const now = new Date().toISOString();
  const id = (typeof input.id === "string" && input.id.trim()) ? input.id.trim() : createId();
  const existing = await db.collection<CollectionDoc>(COLLECTIONS_COLLECTION).findOne({ _id: id });

  const next: AgentTeachingEmbeddingCollectionRecord = {
    id,
    name: input.name.trim(),
    description: typeof input.description === "string" ? input.description.trim() || null : null,
    embeddingModel: typeof input.embeddingModel === "string" && input.embeddingModel.trim() ? input.embeddingModel.trim() : (existing?.embeddingModel ?? ""),
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

export async function deleteEmbeddingCollection(collectionId: string): Promise<{ deleted: boolean; deletedDocuments: number }> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const deleteCollection = await db.collection<CollectionDoc>(COLLECTIONS_COLLECTION).deleteOne({ _id: collectionId });
  const deleteDocs = await db.collection<DocumentDoc>(DOCUMENTS_COLLECTION).deleteMany({ collectionId });
  return { deleted: deleteCollection.deletedCount > 0, deletedDocuments: deleteDocs.deletedCount };
}

export async function listEmbeddingDocuments(collectionId: string, options?: { limit?: number; skip?: number }): Promise<{ items: AgentTeachingEmbeddingDocumentListItem[]; total: number }> {
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
      .project<Omit<DocumentDoc, "embedding">>({ embedding: 0 })
      .toArray(),
    db.collection<DocumentDoc>(DOCUMENTS_COLLECTION).countDocuments({ collectionId }),
  ]);

  const items: AgentTeachingEmbeddingDocumentListItem[] = itemsRaw.map((doc) => ({
    id: doc._id,
    collectionId: doc.collectionId,
    text: doc.text,
    metadata: doc.metadata ?? null,
    embeddingModel: doc.embeddingModel,
    embeddingDimensions: typeof doc.embeddingDimensions === "number" ? doc.embeddingDimensions : 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));

  return { items, total };
}

export async function createEmbeddingDocument(params: {
  collectionId: string;
  text: string;
  embedding: number[];
  embeddingModel: string;
  metadata?: AgentTeachingEmbeddingDocumentMetadata | null;
}): Promise<AgentTeachingEmbeddingDocumentListItem> {
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
  return {
    id,
    collectionId: params.collectionId,
    text: params.text,
    metadata: params.metadata ?? null,
    embeddingModel: params.embeddingModel,
    embeddingDimensions: params.embedding.length,
    createdAt: now,
    updatedAt: now,
  };
}

export async function deleteEmbeddingDocument(documentId: string): Promise<boolean> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const result = await db.collection<DocumentDoc>(DOCUMENTS_COLLECTION).deleteOne({ _id: documentId });
  return result.deletedCount > 0;
}

export async function listEmbeddingDocumentsForRetrieval(params: {
  collectionIds: string[];
  limitPerCollection?: number;
}): Promise<Array<{ id: string; collectionId: string; text: string; embedding: number[]; embeddingModel: string; metadata: AgentTeachingEmbeddingDocumentMetadata | null }>> {
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

  return docs.map((doc: DocumentDoc) => ({
    id: doc._id,
    collectionId: doc.collectionId,
    text: doc.text,
    embedding: Array.isArray(doc.embedding) ? doc.embedding : [],
    embeddingModel: doc.embeddingModel,
    metadata: doc.metadata ?? null,
  }));
}
