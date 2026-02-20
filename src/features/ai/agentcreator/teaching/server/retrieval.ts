import 'server-only';

import type { AgentTeachingChatSource, AgentTeachingEmbeddingDocumentMetadata } from '@/shared/contracts/agent-teaching';

import { listEmbeddingDocumentsForRetrieval } from './repository';

type ScoredDocument = {
  documentId: string;
  collectionId: string;
  score: number;
  text: string;
  metadata: AgentTeachingEmbeddingDocumentMetadata | null;
};

const dot = (a: number[], b: number[]): number => {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i += 1) {
    sum += a[i]! * b[i]!;
  }
  return sum;
};

const norm = (a: number[]): number => Math.sqrt(dot(a, a));

export const cosineSimilarity = (a: number[], b: number[]): number => {
  const denom = norm(a) * norm(b);
  if (!Number.isFinite(denom) || denom === 0) return 0;
  return dot(a, b) / denom;
};

export async function retrieveTopContext(params: {
  queryEmbedding: number[];
  collectionIds: string[];
  topK: number;
  minScore: number;
  embeddingModel?: string;
  maxDocsPerCollection?: number;
}): Promise<AgentTeachingChatSource[]> {
  const docs = await listEmbeddingDocumentsForRetrieval({
    collectionIds: params.collectionIds,
    limitPerCollection: params.maxDocsPerCollection ?? 400,
  });

  const embeddingModel = params.embeddingModel?.trim();
  type RetrievalDoc = typeof docs[number];
  const filteredDocs = embeddingModel
    ? docs.filter((doc: RetrievalDoc): boolean => doc.embeddingModel === embeddingModel)
    : docs;

  const scored = filteredDocs
    .map((doc: RetrievalDoc): ScoredDocument => ({
      documentId: doc.id,
      collectionId: doc.collectionId,
      score: cosineSimilarity(params.queryEmbedding, doc.embedding),
      text: doc.text,
      metadata: doc.metadata,
    }))
    .filter((item: { score: number }): boolean => Number.isFinite(item.score) && item.score >= params.minScore);

  scored.sort((a: AgentTeachingChatSource, b: AgentTeachingChatSource): number => b.score - a.score);
  return scored.slice(0, Math.max(0, Math.min(params.topK, 50)));
}
