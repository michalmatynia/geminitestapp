import 'server-only';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import type {
  AgentTeachingAgentDto as AgentTeachingAgentRecord,
  AgentTeachingCollectionDto as AgentTeachingEmbeddingCollectionRecord,
  AgentTeachingDocumentDto as AgentTeachingEmbeddingDocumentListItem,
  AgentTeachingDocumentMetadataDto as AgentTeachingEmbeddingDocumentMetadata,
} from '@/shared/contracts/agent-teaching';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const AGENTS_COLLECTION = 'agent_teaching_agents';
const COLLECTIONS_COLLECTION = 'agent_teaching_collections';
const DOCUMENTS_COLLECTION = 'agent_teaching_documents';

type AgentDoc = Omit<AgentTeachingAgentRecord, 'id'> & { _id: string };
type CollectionDoc = Omit<AgentTeachingEmbeddingCollectionRecord, 'id'> & { _id: string };

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
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

let warnedNoMongo = false;
const isMongoAvailable = (): boolean => {
  if (process.env['MONGODB_URI']) return true;
  if (!warnedNoMongo) {
    void logSystemEvent({
      level: 'warn',
      message: 'MONGODB_URI missing; agent teaching data will be empty.',
      source: 'agent-teaching',
    });
    warnedNoMongo = true;
  }
  return false;
};

const ensureIndexesOnce = (() => {
  let started = false;
  return async (): Promise<void> => {
    if (!isMongoAvailable()) return;
    if (started) return;
    started = true;
    try {
      const db = await getMongoDb();
      await Promise.all([
        db.collection<AgentDoc>(AGENTS_COLLECTION).createIndex({ updatedAt: -1 }),
        db.collection<CollectionDoc>(COLLECTIONS_COLLECTION).createIndex({ updatedAt: -1 }),
        db
          .collection<DocumentDoc>(DOCUMENTS_COLLECTION)
          .createIndex({ collectionId: 1, updatedAt: -1 }),
      ]);
    } catch {
      // best-effort; indexing failures should not block the app
    }
  };
})();

export async function listTeachingAgents(): Promise<AgentTeachingAgentRecord[]> {
  if (!isMongoAvailable()) return [];
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const docs = await db
    .collection<AgentDoc>(AGENTS_COLLECTION)
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map((doc: AgentDoc) => ({
    id: doc._id,
    agentId: doc.agentId ?? '',
    enabled: doc.enabled ?? true,
    name: doc.name,
    description: doc.description ?? null,
    llmModel: doc.llmModel,
    embeddingModel: doc.embeddingModel,
    systemPrompt: doc.systemPrompt,
    collectionIds: Array.isArray(doc.collectionIds) ? doc.collectionIds : [],
    temperature: typeof doc.temperature === 'number' ? doc.temperature : 0.2,
    maxTokens: typeof doc.maxTokens === 'number' ? doc.maxTokens : 800,
    retrievalTopK: typeof doc.retrievalTopK === 'number' ? doc.retrievalTopK : 5,
    retrievalMinScore: typeof doc.retrievalMinScore === 'number' ? doc.retrievalMinScore : 0,
    maxDocsPerCollection:
      typeof doc.maxDocsPerCollection === 'number' ? doc.maxDocsPerCollection : 400,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));
}

export async function getTeachingAgentById(
  agentId: string
): Promise<AgentTeachingAgentRecord | null> {
  if (!isMongoAvailable()) return null;
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
    temperature: typeof doc.temperature === 'number' ? doc.temperature : 0.2,
    maxTokens: typeof doc.maxTokens === 'number' ? doc.maxTokens : 800,
    retrievalTopK: typeof doc.retrievalTopK === 'number' ? doc.retrievalTopK : 5,
    retrievalMinScore: typeof doc.retrievalMinScore === 'number' ? doc.retrievalMinScore : 0,
    maxDocsPerCollection:
      typeof doc.maxDocsPerCollection === 'number' ? doc.maxDocsPerCollection : 400,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function upsertTeachingAgent(
  input: Partial<AgentTeachingAgentRecord>
): Promise<AgentTeachingAgentRecord> {
  if (!isMongoAvailable()) {
    throw new Error('MongoDB is not configured for agent teaching data.');
  }
  await ensureIndexesOnce();
  const db = await getMongoDb();

  const now = new Date().toISOString();
  const id = typeof input.id === 'string' && input.id.trim() ? input.id.trim() : createId();
  const existing = await db.collection<AgentDoc>(AGENTS_COLLECTION).findOne({ _id: id });

  const next: AgentTeachingAgentRecord = {
    id,
    agentId: input.agentId ?? '',
    enabled: input.enabled ?? true,
    name: (input.name ?? '').trim(),
    description: typeof input.description === 'string' ? input.description.trim() || null : null,
    llmModel:
      typeof input.llmModel === 'string' && input.llmModel.trim()
        ? input.llmModel.trim()
        : (existing?.llmModel ?? ''),
    embeddingModel:
      typeof input.embeddingModel === 'string' && input.embeddingModel.trim()
        ? input.embeddingModel.trim()
        : (existing?.embeddingModel ?? ''),
    systemPrompt:
      typeof input.systemPrompt === 'string' ? input.systemPrompt : (existing?.systemPrompt ?? ''),
    collectionIds: Array.isArray(input.collectionIds)
      ? input.collectionIds
      : (existing?.collectionIds ?? []),
    temperature:
      typeof input.temperature === 'number' ? input.temperature : (existing?.temperature ?? 0.2),
    maxTokens: typeof input.maxTokens === 'number' ? input.maxTokens : (existing?.maxTokens ?? 800),
    retrievalTopK:
      typeof input.retrievalTopK === 'number'
        ? input.retrievalTopK
        : (existing?.retrievalTopK ?? 5),
    retrievalMinScore:
      typeof input.retrievalMinScore === 'number'
        ? input.retrievalMinScore
        : (existing?.retrievalMinScore ?? 0),
    maxDocsPerCollection:
      typeof input.maxDocsPerCollection === 'number'
        ? input.maxDocsPerCollection
        : (existing?.maxDocsPerCollection ?? 400),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const descriptionValue: string | null = next.description ?? null;
  await db.collection<AgentDoc>(AGENTS_COLLECTION).updateOne(
    { _id: id },
    {
      $set: {
        name: next.name,
        description: descriptionValue,
        llmModel: next.llmModel,
        embeddingModel: next.embeddingModel,
        systemPrompt: next.systemPrompt,
        collectionIds: next.collectionIds,
        temperature: next.temperature,
        maxTokens: next.maxTokens,
        retrievalTopK: next.retrievalTopK,
        retrievalMinScore: next.retrievalMinScore,
        maxDocsPerCollection: next.maxDocsPerCollection,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: next.createdAt },
    },
    { upsert: true }
  );

  return next;
}

export async function deleteTeachingAgent(agentId: string): Promise<boolean> {
  if (!isMongoAvailable()) return false;
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const result = await db.collection<AgentDoc>(AGENTS_COLLECTION).deleteOne({ _id: agentId });
  return result.deletedCount > 0;
}

export async function listEmbeddingCollections(): Promise<
  AgentTeachingEmbeddingCollectionRecord[]
> {
  if (!isMongoAvailable()) return [];
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
  return {
    id: doc._id,
    name: doc.name,
    description: doc.description ?? null,
    embeddingModel: doc.embeddingModel,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
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
  const id = typeof input.id === 'string' && input.id.trim() ? input.id.trim() : createId();
  const existing = await db.collection<CollectionDoc>(COLLECTIONS_COLLECTION).findOne({ _id: id });

  const next: AgentTeachingEmbeddingCollectionRecord = {
    id,
    name: input.name.trim(),
    description: typeof input.description === 'string' ? input.description.trim() || null : null,
    embeddingModel:
      typeof input.embeddingModel === 'string' && input.embeddingModel.trim()
        ? input.embeddingModel.trim()
        : (existing?.embeddingModel ?? ''),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const collectionDescriptionValue: string | null = next.description ?? null;
  await db.collection<CollectionDoc>(COLLECTIONS_COLLECTION).updateOne(
    { _id: id },
    {
      $set: {
        name: next.name,
        description: collectionDescriptionValue,
        embeddingModel: next.embeddingModel,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: next.createdAt },
    },
    { upsert: true }
  );

  return next;
}

export async function deleteEmbeddingCollection(
  collectionId: string
): Promise<{ deleted: boolean; deletedDocuments: number }> {
  if (!isMongoAvailable()) return { deleted: false, deletedDocuments: 0 };
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const deleteCollection = await db
    .collection<CollectionDoc>(COLLECTIONS_COLLECTION)
    .deleteOne({ _id: collectionId });
  const deleteDocs = await db
    .collection<DocumentDoc>(DOCUMENTS_COLLECTION)
    .deleteMany({ collectionId });
  return { deleted: deleteCollection.deletedCount > 0, deletedDocuments: deleteDocs.deletedCount };
}

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
      const docName = docMetadata.title ?? (doc.text.slice(0, 50).trim() || 'Untitled');
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
  const returnName = returnMetadata.title ?? (params.text.slice(0, 50).trim() || 'Untitled');
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

type RetrievalDocumentItem = {
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
