import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createEmbeddingDocument,
  getEmbeddingCollectionById,
  listEmbeddingDocuments,
} from '@/features/ai/agentcreator/server';
import { generateOllamaEmbedding } from '@/features/ai/agentcreator/teaching/server/embeddings';
import type {
  AgentTeachingDocumentResponse,
  AgentTeachingDocumentsResponse,
  AgentTeachingEmbeddingDocumentListItem,
  AgentTeachingSourceType,
} from '@/shared/contracts/agent-teaching';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { optionalIntegerQuerySchema } from '@/shared/lib/api/query-schema';

const createDocumentSchema = z.object({
  text: z.string().trim().min(1),
  title: z.string().trim().optional().nullable(),
  source: z.string().trim().optional().nullable(),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
});

export const querySchema = z.object({
  limit: optionalIntegerQuerySchema(z.number().int().positive().max(500)),
  skip: optionalIntegerQuerySchema(z.number().int().nonnegative()),
});

export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const collectionId = ctx.params?.['collectionId'];
  if (typeof collectionId !== 'string' || !collectionId.trim()) {
    throw badRequestError('Missing collectionId.');
  }
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;
  const limit = query.limit ?? 50;
  const skip = query.skip ?? 0;
  const result = await listEmbeddingDocuments(collectionId, { limit, skip });
  const response: AgentTeachingDocumentsResponse = result;
  return NextResponse.json(response);
}

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const collectionId = ctx.params?.['collectionId'];
  if (typeof collectionId !== 'string' || !collectionId.trim()) {
    throw badRequestError('Missing collectionId.');
  }
  const collection = await getEmbeddingCollectionById(collectionId);
  if (!collection) {
    throw notFoundError('Collection not found');
  }
  const parsed = await parseJsonBody(req, createDocumentSchema, {
    logPrefix: 'agentcreator.teaching.documents.POST',
  });
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const embedding = await generateOllamaEmbedding({
    model: collection.embeddingModel,
    text: data.text,
  });

  const item: AgentTeachingEmbeddingDocumentListItem = await createEmbeddingDocument({
    collectionId,
    text: data.text,
    embedding,
    embeddingModel: collection.embeddingModel,
    metadata: {
      title: data.title ?? undefined,
      source: (data.source ?? undefined) as AgentTeachingSourceType,
      tags: data.tags ?? [],
    },
  });

  const response: AgentTeachingDocumentResponse = { item };
  return NextResponse.json(response);
}
