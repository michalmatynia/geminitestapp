import 'server-only';

import type { AgentTeachingAgentDto as AgentTeachingAgentRecord } from '@/shared/contracts/agent-teaching';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  AGENTS_COLLECTION,
  createId,
  ensureIndexesOnce,
  isMongoAvailable,
} from './internal-base';

type AgentDoc = Omit<AgentTeachingAgentRecord, 'id'> & { _id: string };

function mapAgentDoc(doc: AgentDoc): AgentTeachingAgentRecord {
  return {
    id: doc._id,
    agentId: doc.agentId ?? '',
    enabled: doc.enabled ?? true,
    name: doc.name,
    description: doc.description ?? null,
    llmModel: doc.llmModel,
    embeddingModel: doc.embeddingModel,
    systemPrompt: doc.systemPrompt,
    collectionIds: Array.isArray(doc.collectionIds) ? doc.collectionIds : [],
    temperature: getValidNumber(doc.temperature, 0.2),
    maxTokens: getValidNumber(doc.maxTokens, 800),
    retrievalTopK: getValidNumber(doc.retrievalTopK, 5),
    retrievalMinScore: getValidNumber(doc.retrievalMinScore, 0),
    maxDocsPerCollection: getValidNumber(doc.maxDocsPerCollection, 400),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function getValidNumber(val: number | undefined | null, fallback: number): number {
  return typeof val === 'number' ? val : fallback;
}

export async function listTeachingAgents(): Promise<AgentTeachingAgentRecord[]> {
  if (!isMongoAvailable()) return [];
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const docs = await db
    .collection<AgentDoc>(AGENTS_COLLECTION)
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map(mapAgentDoc);
}

export async function getTeachingAgentById(
  agentId: string
): Promise<AgentTeachingAgentRecord | null> {
  if (!isMongoAvailable()) return null;
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const doc = await db.collection<AgentDoc>(AGENTS_COLLECTION).findOne({ _id: agentId });
  if (!doc) return null;
  return mapAgentDoc(doc);
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
  const rawId = input.id;
  const id = typeof rawId === 'string' && rawId.trim().length > 0 ? rawId.trim() : createId();
  const existingDoc = await db.collection<AgentDoc>(AGENTS_COLLECTION).findOne({ _id: id });
  const existing = existingDoc ? mapAgentDoc(existingDoc) : null;

  const next = mergeAgentInput(input, existing, id, now);

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

function mergeAgentInput(
  input: Partial<AgentTeachingAgentRecord>,
  existing: AgentTeachingAgentRecord | null,
  id: string,
  now: string
): AgentTeachingAgentRecord {
  const base = existing ?? {
    agentId: '',
    enabled: true,
    name: '',
    description: null,
    llmModel: '',
    embeddingModel: '',
    systemPrompt: '',
    collectionIds: [],
    temperature: 0.2,
    maxTokens: 800,
    retrievalTopK: 5,
    retrievalMinScore: 0,
    maxDocsPerCollection: 400,
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...base,
    id,
    ...mergeBasicFields(input, base),
    ...mergeModelFields(input, base),
    ...mergeParameterFields(input, base),
    updatedAt: now,
  };
}

type BasicFields = Pick<AgentTeachingAgentRecord, 'agentId' | 'enabled' | 'name' | 'description'>;

function mergeBasicFields(input: Partial<AgentTeachingAgentRecord>, base: AgentTeachingAgentRecord): BasicFields {
  return {
    agentId: input.agentId ?? base.agentId,
    enabled: input.enabled ?? base.enabled,
    name: (input.name ?? base.name).trim(),
    description: getValidatedDescription(input.description ?? base.description),
  };
}

type ModelFields = Pick<AgentTeachingAgentRecord, 'llmModel' | 'embeddingModel' | 'systemPrompt' | 'collectionIds'>;

function mergeModelFields(input: Partial<AgentTeachingAgentRecord>, base: AgentTeachingAgentRecord): ModelFields {
  const sysPromptInput = input.systemPrompt;
  return {
    llmModel: getValidatedString(input.llmModel, base.llmModel, ''),
    embeddingModel: getValidatedString(input.embeddingModel, base.embeddingModel, ''),
    systemPrompt: typeof sysPromptInput === 'string' ? sysPromptInput : base.systemPrompt,
    collectionIds: Array.isArray(input.collectionIds) ? input.collectionIds : base.collectionIds,
  };
}

type ParameterFields = Pick<AgentTeachingAgentRecord, 'temperature' | 'maxTokens' | 'retrievalTopK' | 'retrievalMinScore' | 'maxDocsPerCollection'>;

function mergeParameterFields(input: Partial<AgentTeachingAgentRecord>, base: AgentTeachingAgentRecord): ParameterFields {
  return {
    temperature: getValidNumber(input.temperature, base.temperature),
    maxTokens: getValidNumber(input.maxTokens, base.maxTokens),
    retrievalTopK: getValidNumber(input.retrievalTopK, base.retrievalTopK),
    retrievalMinScore: getValidNumber(input.retrievalMinScore, base.retrievalMinScore),
    maxDocsPerCollection: getValidNumber(input.maxDocsPerCollection, base.maxDocsPerCollection),
  };
}

function getValidatedDescription(description: string | null | undefined): string | null {
  if (typeof description !== 'string') return null;
  const trimmed = description.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getValidatedString(input: string | undefined, existing: string | undefined, fallback: string): string {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return existing ?? fallback;
}

export async function deleteTeachingAgent(agentId: string): Promise<boolean> {
  if (!isMongoAvailable()) return false;
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const result = await db.collection<AgentDoc>(AGENTS_COLLECTION).deleteOne({ _id: agentId });
  return result.deletedCount > 0;
}
