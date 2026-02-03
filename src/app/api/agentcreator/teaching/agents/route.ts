export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import type { AgentTeachingAgentRecord } from "@/shared/types/agent-teaching";
import { listTeachingAgents, upsertTeachingAgent } from "@/features/ai/agentcreator/teaching/server/repository";

const createAgentSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  llmModel: z.string().trim().min(1),
  embeddingModel: z.string().trim().min(1),
  systemPrompt: z.string().optional().default(""),
  collectionIds: z.array(z.string().trim().min(1)).optional().default([]),
  retrievalTopK: z.number().int().min(1).max(50).optional().default(6),
  retrievalMinScore: z.number().min(-1).max(1).optional().default(0.15),
});

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const agents = await listTeachingAgents();
    return NextResponse.json({ agents });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "agentcreator.teaching.agents.GET",
      fallbackMessage: "Failed to fetch teaching agents.",
    });
  }
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const parsed = await parseJsonBody(req, createAgentSchema, {
      logPrefix: "agentcreator.teaching.agents.POST",
    });
    if (!parsed.ok) return parsed.response;

    const data = parsed.data;
    const agent: AgentTeachingAgentRecord = await upsertTeachingAgent({
      name: data.name,
      description: data.description ?? null,
      llmModel: data.llmModel,
      embeddingModel: data.embeddingModel,
      systemPrompt: data.systemPrompt,
      collectionIds: data.collectionIds,
      retrievalTopK: data.retrievalTopK,
      retrievalMinScore: data.retrievalMinScore,
    });
    return NextResponse.json({ agent });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "agentcreator.teaching.agents.POST",
      fallbackMessage: "Failed to create teaching agent.",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: "agentcreator.teaching.agents.GET" }
);

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: "agentcreator.teaching.agents.POST" }
);
