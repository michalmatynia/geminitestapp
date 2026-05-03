import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getTeachingAgentById,
  upsertTeachingAgent,
  deleteTeachingAgent,
} from '@/features/ai/agentcreator/server';
import type {
  AgentTeachingAgentRecord,
} from '@/shared/contracts/agent-teaching';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
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

function resolveAgentId(ctx: ApiHandlerContext): string | null {
  const agentId = ctx.params?.['agentId'];
  return (typeof agentId === 'string' && agentId.trim().length > 0) ? agentId : null;
}

const resolveUpdatedAgent = (
  existing: AgentTeachingAgentRecord,
  agentId: string,
  data: z.infer<typeof updateAgentSchema>
): AgentTeachingAgentRecord => {
  const result: AgentTeachingAgentRecord = { ...existing, id: agentId };
  const keys = Object.keys(updateAgentSchema.shape) as Array<keyof z.infer<typeof updateAgentSchema>>;
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined) {
      // @ts-expect-error - mapping from schema to record
      result[key] = value ?? null;
    }
  }
  return result;
};

export async function patchHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const agentId = resolveAgentId(ctx);
  if (agentId === null) return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });

  const existing = await getTeachingAgentById(agentId);
  if (existing === null) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  const parsed = await parseJsonBody(req, updateAgentSchema, {
    logPrefix: `agentcreator.teaching.agents.${agentId}.PATCH`,
  });
  if (!parsed.ok) return parsed.response;

  const agent = await upsertTeachingAgent(resolveUpdatedAgent(existing, agentId, parsed.data));
  return NextResponse.json({ agent });
}

export async function getHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const agentId = resolveAgentId(ctx);
  if (agentId === null) return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });

  const agent = await getTeachingAgentById(agentId);
  if (agent === null) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  return NextResponse.json({ agent });
}

export async function deleteHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const agentId = resolveAgentId(ctx);
  if (agentId === null) return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
  
  const success = await deleteTeachingAgent(agentId);
  return NextResponse.json({ success });
}


