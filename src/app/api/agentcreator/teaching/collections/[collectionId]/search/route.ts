export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import { badRequestError } from "@/shared/errors/app-error";
import type { AgentTeachingChatSource } from "@/shared/types/agent-teaching";
import { getEmbeddingCollectionById } from "@/features/ai/agentcreator/teaching/server/repository";
import { generateOllamaEmbedding } from "@/features/ai/agentcreator/teaching/server/embeddings";
import { retrieveTopContext } from "@/features/ai/agentcreator/teaching/server/retrieval";

const searchSchema = z.object({
  queryText: z.string().trim().min(1),
  topK: z.number().int().min(1).max(50).optional().default(8),
  minScore: z.number().min(-1).max(1).optional().default(0.15),
  maxDocsPerCollection: z.number().int().min(10).max(2000).optional().default(400),
});

type Params = { collectionId: string };

async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  try {
    const params = ctx.params as unknown as Params | undefined;
    const collectionId = params?.collectionId;
    if (!collectionId) throw badRequestError("Missing collectionId.");

    const collection = await getEmbeddingCollectionById(collectionId);
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const parsed = await parseJsonBody(req, searchSchema, {
      logPrefix: "agentcreator.teaching.collections.search.POST",
    });
    if (!parsed.ok) return parsed.response;

    const queryEmbedding = await generateOllamaEmbedding({
      model: collection.embeddingModel,
      text: parsed.data.queryText,
    });

    const sources: AgentTeachingChatSource[] = await retrieveTopContext({
      queryEmbedding,
      collectionIds: [collectionId],
      topK: parsed.data.topK,
      minScore: parsed.data.minScore,
      embeddingModel: collection.embeddingModel,
      maxDocsPerCollection: parsed.data.maxDocsPerCollection,
    });

    return NextResponse.json({ sources });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "agentcreator.teaching.collections.search.POST",
      fallbackMessage: "Failed to search collection.",
    });
  }
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: "agentcreator.teaching.collections.search.POST" }
);

