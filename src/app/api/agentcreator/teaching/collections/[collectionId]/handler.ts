import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteEmbeddingCollection,
  getEmbeddingCollectionById,
  upsertEmbeddingCollection,
} from '@/features/ai/agentcreator/server';
import type {
  AgentTeachingCollectionDeleteResponse,
  AgentTeachingCollectionResponse,
  AgentTeachingEmbeddingCollectionRecord,
} from '@/shared/contracts/agent-teaching';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const updateCollectionSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  embeddingModel: z.string().trim().min(1).optional(),
});

export async function PATCH_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const collectionId = ctx.params?.['collectionId'];
  if (typeof collectionId !== 'string' || !collectionId.trim()) {
    throw badRequestError('Missing collectionId.');
  }
  const existing = await getEmbeddingCollectionById(collectionId);
  if (!existing) {
    throw notFoundError('Not found');
  }
  const parsed = await parseJsonBody(req, updateCollectionSchema, {
    logPrefix: 'agentcreator.teaching.collections.PATCH',
  });
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  const collection: AgentTeachingEmbeddingCollectionRecord = await upsertEmbeddingCollection({
    ...existing,
    id: collectionId,
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description ?? null } : {}),
    ...(data.embeddingModel !== undefined ? { embeddingModel: data.embeddingModel } : {}),
  });
  const response: AgentTeachingCollectionResponse = { collection };
  return NextResponse.json(response);
}

export async function DELETE_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const collectionId = ctx.params?.['collectionId'];
  if (typeof collectionId !== 'string' || !collectionId.trim()) {
    throw badRequestError('Missing collectionId.');
  }
  const result = await deleteEmbeddingCollection(collectionId);
  const response: AgentTeachingCollectionDeleteResponse = { ok: true, ...result };
  return NextResponse.json(response);
}
