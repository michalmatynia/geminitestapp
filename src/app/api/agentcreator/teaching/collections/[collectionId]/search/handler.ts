import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { generateOllamaEmbedding } from '@/features/ai/agentcreator/teaching/server/embeddings';
import { getEmbeddingCollectionById } from '@/features/ai/agentcreator/teaching/server/repository';
import { retrieveTopContext } from '@/features/ai/agentcreator/teaching/server/retrieval';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { AgentTeachingChatSource } from '@/shared/types/domain/agent-teaching';

const searchSchema = z.object({
  queryText: z.string().trim().min(1),
  topK: z.number().int().min(1).max(50).optional().default(8),
  minScore: z.number().min(-1).max(1).optional().default(0.15),
  maxDocsPerCollection: z.number().int().min(10).max(2000).optional().default(400),
});

type Params = { collectionId: string };

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const params = ctx.params as unknown as Params | undefined;
  const collectionId = params?.collectionId;
  if (!collectionId) throw badRequestError('Missing collectionId.');

  const collection = await getEmbeddingCollectionById(collectionId);
  if (!collection) {
    throw notFoundError('Collection not found');
  }

  const parsed = await parseJsonBody(req, searchSchema, {
    logPrefix: 'agentcreator.teaching.collections.search.POST',
  });
  if (!parsed.ok) return parsed.response;

  const queryEmbedding = await generateOllamaEmbedding({
    model: collection.embeddingModel,
    text: parsed.data.queryText,
  });

  const sources: AgentTeachingChatSource[] = await retrieveTopContext({
    queryEmbedding,
    collectionIds: [collectionId],
    topK: parsed.data.topK,
    minScore: parsed.data.minScore,
    embeddingModel: collection.embeddingModel,
    maxDocsPerCollection: parsed.data.maxDocsPerCollection,
  });

  return NextResponse.json({ sources });
}
