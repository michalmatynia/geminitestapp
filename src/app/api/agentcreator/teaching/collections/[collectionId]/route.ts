export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import { badRequestError } from "@/shared/errors/app-error";
import type { AgentTeachingEmbeddingCollectionRecord } from "@/shared/types/agent-teaching";
import { deleteEmbeddingCollection, getEmbeddingCollectionById, upsertEmbeddingCollection } from "@/features/ai/agentcreator/teaching/server/repository";

const updateCollectionSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  embeddingModel: z.string().trim().min(1).optional(),
});

type Params = { collectionId: string };

async function PATCH_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  try {
    const params = ctx.params as unknown as Params | undefined;
    const collectionId = params?.collectionId;
    if (!collectionId) throw badRequestError("Missing collectionId.");
    const existing = await getEmbeddingCollectionById(collectionId);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const parsed = await parseJsonBody(req, updateCollectionSchema, {
      logPrefix: "agentcreator.teaching.collections.PATCH",
    });
    if (!parsed.ok) return parsed.response;
    const data = parsed.data;
    const collection: AgentTeachingEmbeddingCollectionRecord = await upsertEmbeddingCollection({
      ...existing,
      id: collectionId,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description ?? null } : {}),
      ...(data.embeddingModel !== undefined ? { embeddingModel: data.embeddingModel } : {}),
    });
    return NextResponse.json({ collection });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "agentcreator.teaching.collections.PATCH",
      fallbackMessage: "Failed to update embedding collection.",
    });
  }
}

async function DELETE_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  try {
    const params = ctx.params as unknown as Params | undefined;
    const collectionId = params?.collectionId;
    if (!collectionId) throw badRequestError("Missing collectionId.");
    const result = await deleteEmbeddingCollection(collectionId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "agentcreator.teaching.collections.DELETE",
      fallbackMessage: "Failed to delete embedding collection.",
    });
  }
}

export const PATCH = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => PATCH_handler(req, ctx),
  { source: "agentcreator.teaching.collections.PATCH" }
);

export const DELETE = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => DELETE_handler(req, ctx),
  { source: "agentcreator.teaching.collections.DELETE" }
);

