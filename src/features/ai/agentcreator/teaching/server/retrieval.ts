import "server-only";

import type { AgentTeachingChatSource } from "@/shared/types/agent-teaching";
import { listEmbeddingDocumentsForRetrieval } from "./repository";

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
  maxDocsPerCollection?: number;
}): Promise<AgentTeachingChatSource[]> {
  const docs = await listEmbeddingDocumentsForRetrieval({
    collectionIds: params.collectionIds,
    limitPerCollection: params.maxDocsPerCollection ?? 400,
  });

  const scored = docs
    .map((doc) => ({
      documentId: doc.id,
      collectionId: doc.collectionId,
      score: cosineSimilarity(params.queryEmbedding, doc.embedding),
      text: doc.text,
      metadata: doc.metadata,
    }))
    .filter((item) => Number.isFinite(item.score) && item.score >= params.minScore);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(0, Math.min(params.topK, 50)));
}

