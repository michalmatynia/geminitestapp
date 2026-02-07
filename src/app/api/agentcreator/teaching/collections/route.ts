export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import type { AgentTeachingEmbeddingCollectionRecord } from "@/shared/types/agent-teaching";
import { listEmbeddingCollections, upsertEmbeddingCollection } from "@/features/ai/agentcreator/teaching/server/repository";

const createCollectionSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  embeddingModel: z.string().trim().min(1),
});

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const collections = await listEmbeddingCollections();
  return NextResponse.json({ collections });
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, createCollectionSchema, {
    logPrefix: "agentcreator.teaching.collections.POST",
  });
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  const collection: AgentTeachingEmbeddingCollectionRecord = await upsertEmbeddingCollection({
    name: data.name,
    description: data.description ?? null,
    embeddingModel: data.embeddingModel,
  });
  return NextResponse.json({ collection });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: "agentcreator.teaching.collections.GET" }
);

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: "agentcreator.teaching.collections.POST" }
);

