import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getTeachingAgentById, upsertTeachingAgent, deleteTeachingAgent } from '@/features/ai/agentcreator/teaching/server/repository';
import type { AgentTeachingAgentRecord } from '@/shared/contracts/agent-teaching';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const updateAgentSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  llmModel: z.string().trim().min(1).optional(),
  embeddingModel: z.string().trim().min(1).optional(),
  systemPrompt: z.string().optional(),
  collectionIds: z.array(z.string().trim().min(1)).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(8000).optional(),
  retrievalTopK: z.number().int().min(1).max(50).optional(),
  retrievalMinScore: z.number().min(-1).max(1).optional(),
  maxDocsPerCollection: z.number().int().min(10).max(2000).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const agentId = ctx.params?.['agentId'];
  if (typeof agentId !== 'string' || !agentId.trim()) {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
  }

  const existing = await getTeachingAgentById(agentId);
  if (!existing) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const parsed = await parseJsonBody(req, updateAgentSchema, {
    logPrefix: `agentcreator.teaching.agents.${agentId}.PATCH`,
  });
  if (!parsed.ok) return parsed.response;

  const data = parsed.data;
  const agent: AgentTeachingAgentRecord = await upsertTeachingAgent({
    ...existing,
    id: agentId,
    name: data.name ?? existing.name,
    description: data.description !== undefined ? (data.description ?? null) : existing.description,
    llmModel: data.llmModel ?? existing.llmModel,
    embeddingModel: data.embeddingModel ?? existing.embeddingModel,
    systemPrompt: data.systemPrompt ?? existing.systemPrompt,
    collectionIds: data.collectionIds ?? existing.collectionIds,
    temperature: data.temperature ?? existing.temperature,
    maxTokens: data.maxTokens ?? existing.maxTokens,
    retrievalTopK: data.retrievalTopK ?? existing.retrievalTopK,
    retrievalMinScore: data.retrievalMinScore ?? existing.retrievalMinScore,
    maxDocsPerCollection: data.maxDocsPerCollection ?? existing.maxDocsPerCollection,
    enabled: data.enabled ?? existing.enabled,
  });
  
  return NextResponse.json({ agent });
}

export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const agentId = ctx.params?.['agentId'];
  if (typeof agentId !== 'string' || !agentId.trim()) {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
  }
  const agent = await getTeachingAgentById(agentId);
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  return NextResponse.json({ agent });
}

export async function DELETE_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const agentId = ctx.params?.['agentId'];
  if (typeof agentId !== 'string' || !agentId.trim()) {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
  }
  const success = await deleteTeachingAgent(agentId);
  return NextResponse.json({ success });
}
