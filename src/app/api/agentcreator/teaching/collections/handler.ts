import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  listEmbeddingCollections,
  upsertEmbeddingCollection,
} from '@/features/ai/agentcreator/server';
import type {
  AgentTeachingCollectionResponse,
  AgentTeachingCollectionsResponse,
  AgentTeachingEmbeddingCollectionRecord,
} from '@/shared/contracts/agent-teaching';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const createCollectionSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  embeddingModel: z.string().trim().min(1),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const collections = await listEmbeddingCollections();
  const response: AgentTeachingCollectionsResponse = { collections };
  return NextResponse.json(response);
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, createCollectionSchema, {
    logPrefix: 'agentcreator.teaching.collections.POST',
  });
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  const collection: AgentTeachingEmbeddingCollectionRecord = await upsertEmbeddingCollection({
    name: data.name,
    description: data.description ?? null,
    embeddingModel: data.embeddingModel,
  });
  const response: AgentTeachingCollectionResponse = { collection };
  return NextResponse.json(response);
}
