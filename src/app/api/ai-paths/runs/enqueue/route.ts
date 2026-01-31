import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";
import { enqueuePathRun } from "@/features/ai-paths/services/path-run-service";
import { startAiPathRunQueue } from "@/features/jobs/server";
import type { AiNode, Edge } from "@/shared/types/ai-paths";
import { enforceAiPathsRunRateLimit, requireAiPathsAccess } from "@/features/ai-paths/server";

const enqueueSchema = z.object({
  pathId: z.string().trim().min(1),
  pathName: z.string().trim().optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
  triggerEvent: z.string().trim().optional(),
  triggerNodeId: z.string().trim().optional(),
  triggerContext: z.record(z.string(), z.any()).optional().nullable(),
  entityId: z.string().trim().optional().nullable(),
  entityType: z.string().trim().optional().nullable(),
  maxAttempts: z.number().int().min(1).max(50).optional(),
  backoffMs: z.number().int().min(0).max(60_000).optional(),
  backoffMaxMs: z.number().int().min(0).max(10 * 60_000).optional(),
  meta: z.record(z.string(), z.any()).optional().nullable(),
});

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const access = await requireAiPathsAccess();
    await enforceAiPathsRunRateLimit(access);
    const parsed = await parseJsonBody(req, enqueueSchema, {
      logPrefix: "ai-paths.runs.enqueue",
    });
    if (!parsed.ok) return parsed.response;

    const { nodes, edges, ...rest } = parsed.data;
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      throw badRequestError("Nodes and edges are required to enqueue a run.");
    }

    const run = await enqueuePathRun({
      userId: access.userId,
      pathId: rest.pathId,
      pathName: rest.pathName ?? null,
      nodes: nodes as AiNode[],
      edges: edges as Edge[],
      ...(rest.triggerEvent ? { triggerEvent: rest.triggerEvent } : {}),
      ...(rest.triggerNodeId ? { triggerNodeId: rest.triggerNodeId } : {}),
      triggerContext: rest.triggerContext ?? null,
      entityId: rest.entityId ?? null,
      entityType: rest.entityType ?? null,
      ...(rest.maxAttempts !== undefined ? { maxAttempts: rest.maxAttempts } : {}),
      ...(rest.backoffMs !== undefined ? { backoffMs: rest.backoffMs } : {}),
      ...(rest.backoffMaxMs !== undefined ? { backoffMaxMs: rest.backoffMaxMs } : {}),
      meta: rest.meta ?? null,
    });
    startAiPathRunQueue();
    return NextResponse.json({ run });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.runs.enqueue",
      fallbackMessage: "Failed to enqueue AI Path run",
    });
  }
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "ai-paths.runs.enqueue" });
