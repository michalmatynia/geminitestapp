export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import type { AgentTeachingEmbeddingDocumentListItem } from "@/shared/types/agent-teaching";
import { createEmbeddingDocument, getEmbeddingCollectionById, listEmbeddingDocuments } from "@/features/ai/agentcreator/teaching/server/repository";
import { generateOllamaEmbedding } from "@/features/ai/agentcreator/teaching/server/embeddings";

const createDocumentSchema = z.object({
  text: z.string().trim().min(1),
  title: z.string().trim().optional().nullable(),
  source: z.string().trim().optional().nullable(),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
});

type Params = { collectionId: string };

async function GET_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const params = ctx.params as unknown as Params | undefined;
  const collectionId = params?.collectionId;
  if (!collectionId) throw badRequestError("Missing collectionId.");
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const skip = Number(url.searchParams.get("skip") ?? "0");
  const result = await listEmbeddingDocuments(collectionId, { limit, skip });
  return NextResponse.json(result);
}

async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const params = ctx.params as unknown as Params | undefined;
  const collectionId = params?.collectionId;
  if (!collectionId) throw badRequestError("Missing collectionId.");
  const collection = await getEmbeddingCollectionById(collectionId);
  if (!collection) {
    throw notFoundError("Collection not found");
  }
  const parsed = await parseJsonBody(req, createDocumentSchema, {
    logPrefix: "agentcreator.teaching.documents.POST",
  });
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const embedding = await generateOllamaEmbedding({
    model: collection.embeddingModel,
    text: data.text,
  });

  const item: AgentTeachingEmbeddingDocumentListItem = await createEmbeddingDocument({
    collectionId,
    text: data.text,
    embedding,
    embeddingModel: collection.embeddingModel,
    metadata: {
      title: data.title ?? null,
      source: data.source ?? null,
      tags: data.tags ?? [],
    },
  });

  return NextResponse.json({ item });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: "agentcreator.teaching.documents.GET" }
);

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: "agentcreator.teaching.documents.POST" }
);

