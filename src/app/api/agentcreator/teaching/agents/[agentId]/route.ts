export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import type { AgentTeachingAgentRecord } from "@/shared/types/agent-teaching";
import { deleteTeachingAgent, getTeachingAgentById, upsertTeachingAgent } from "@/features/ai/agentcreator/teaching/server/repository";

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
});

type Params = { agentId: string };

async function PATCH_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const params = ctx.params as unknown as Params | undefined;
  const agentId = params?.agentId;
  if (!agentId) {
    throw badRequestError("Missing agentId.");
  }
  const existing = await getTeachingAgentById(agentId);
  if (!existing) {
    throw notFoundError("Not found");
  }
  const parsed = await parseJsonBody(req, updateAgentSchema, {
    logPrefix: "agentcreator.teaching.agents.PATCH",
  });
  if (!parsed.ok) return parsed.response;

  const data = parsed.data;
  const agent: AgentTeachingAgentRecord = await upsertTeachingAgent({
    ...existing,
    id: agentId,
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description ?? null } : {}),
    ...(data.llmModel !== undefined ? { llmModel: data.llmModel } : {}),
    ...(data.embeddingModel !== undefined ? { embeddingModel: data.embeddingModel } : {}),
    ...(data.systemPrompt !== undefined ? { systemPrompt: data.systemPrompt } : {}),
    ...(data.collectionIds !== undefined ? { collectionIds: data.collectionIds } : {}),
    ...(data.temperature !== undefined ? { temperature: data.temperature } : {}),
    ...(data.maxTokens !== undefined ? { maxTokens: data.maxTokens } : {}),
    ...(data.retrievalTopK !== undefined ? { retrievalTopK: data.retrievalTopK } : {}),
    ...(data.retrievalMinScore !== undefined ? { retrievalMinScore: data.retrievalMinScore } : {}),
    ...(data.maxDocsPerCollection !== undefined ? { maxDocsPerCollection: data.maxDocsPerCollection } : {}),
  });
  return NextResponse.json({ agent });
}

async function DELETE_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const params = ctx.params as unknown as Params | undefined;
  const agentId = params?.agentId;
  if (!agentId) {
    throw badRequestError("Missing agentId.");
  }
  const deleted = await deleteTeachingAgent(agentId);
  return NextResponse.json({ ok: true, deleted });
}

export const PATCH = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => PATCH_handler(req, ctx),
  { source: "agentcreator.teaching.agents.PATCH" }
);

export const DELETE = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => DELETE_handler(req, ctx),
  { source: "agentcreator.teaching.agents.DELETE" }
);
