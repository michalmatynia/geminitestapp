import { type NextRequest, NextResponse } from 'next/server';
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
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const updateCollectionSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  embeddingModel: z.string().trim().min(1).optional(),
});

const resolveNextCollectionRecord = (
  existing: AgentTeachingEmbeddingCollectionRecord,
  collectionId: string,
  data: z.infer<typeof updateCollectionSchema>
): AgentTeachingEmbeddingCollectionRecord => {
  const nextRecord: AgentTeachingEmbeddingCollectionRecord = { ...existing, id: collectionId };
  if (data.name !== undefined) nextRecord.name = data.name;
  if (data.description !== undefined) nextRecord.description = data.description ?? null;
  if (data.embeddingModel !== undefined) nextRecord.embeddingModel = data.embeddingModel;
  return nextRecord;
};

export async function patchHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const collectionId = ctx.params?.['collectionId'];
  if (typeof collectionId !== 'string' || collectionId.trim().length === 0) {
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

  const collection = await upsertEmbeddingCollection(
    resolveNextCollectionRecord(existing, collectionId, parsed.data)
  );
  const response: AgentTeachingCollectionResponse = { collection };
  return NextResponse.json(response);
}

export async function deleteHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const collectionId = ctx.params?.['collectionId'];
  if (typeof collectionId !== 'string' || collectionId.trim().length === 0) {
    throw badRequestError('Missing collectionId.');
  }
  const result = await deleteEmbeddingCollection(collectionId);
  const response: AgentTeachingCollectionDeleteResponse = {
    success: true,
    deletedCount: result.deletedDocuments,
    ok: true,
    ...result,
  };
  return NextResponse.json(response);
}
