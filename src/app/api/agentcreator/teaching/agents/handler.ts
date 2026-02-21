import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listTeachingAgents, upsertTeachingAgent } from '@/features/ai/agentcreator/teaching/server/repository';
import type { AgentTeachingAgentRecord } from '@/shared/contracts/agent-teaching';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const createAgentSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  llmModel: z.string().trim().min(1),
  embeddingModel: z.string().trim().min(1),
  systemPrompt: z.string().optional().default(''),
  collectionIds: z.array(z.string().trim().min(1)).optional().default([]),
  temperature: z.number().min(0).max(2).optional().default(0.2),
  maxTokens: z.number().int().min(1).max(8000).optional().default(800),
  retrievalTopK: z.number().int().min(1).max(50).optional().default(6),
  retrievalMinScore: z.number().min(-1).max(1).optional().default(0.15),
  maxDocsPerCollection: z.number().int().min(10).max(2000).optional().default(400),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const agents = await listTeachingAgents();
  return NextResponse.json({ agents });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, createAgentSchema, {
    logPrefix: 'agentcreator.teaching.agents.POST',
  });
  if (!parsed.ok) return parsed.response;

  const data = parsed.data;
  const agent: AgentTeachingAgentRecord = await upsertTeachingAgent({
    agentId: data.llmModel, // fallback if needed or add to schema
    name: data.name,
    description: data.description ?? null,
    llmModel: data.llmModel,
    embeddingModel: data.embeddingModel,
    systemPrompt: data.systemPrompt,
    collectionIds: data.collectionIds,
    temperature: data.temperature,
    maxTokens: data.maxTokens,
    retrievalTopK: data.retrievalTopK,
    retrievalMinScore: data.retrievalMinScore,
    maxDocsPerCollection: data.maxDocsPerCollection,
    enabled: true,
  });
  return NextResponse.json({ agent });
}
