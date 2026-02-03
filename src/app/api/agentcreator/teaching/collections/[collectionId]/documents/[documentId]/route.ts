export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";
import { deleteEmbeddingDocument } from "@/features/ai/agentcreator/teaching/server/repository";

type Params = { collectionId: string; documentId: string };

async function DELETE_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  try {
    const params = ctx.params as unknown as Params | undefined;
    const documentId = params?.documentId;
    if (!documentId) throw badRequestError("Missing documentId.");
    const deleted = await deleteEmbeddingDocument(documentId);
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "agentcreator.teaching.documents.DELETE",
      fallbackMessage: "Failed to delete document.",
    });
  }
}

export const DELETE = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => DELETE_handler(req, ctx),
  { source: "agentcreator.teaching.documents.DELETE" }
);

