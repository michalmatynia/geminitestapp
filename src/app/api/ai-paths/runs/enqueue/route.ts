import { NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/shared/lib/api/api-handler";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";
import { enqueuePathRun } from "@/features/ai-paths/services/path-run-service";
import { startAiPathRunQueue } from "@/features/jobs/server";

const enqueueSchema = z.object({
  pathId: z.string().trim().min(1),
  pathName: z.string().trim().optional(),
  nodes: z.array(z.unknown()).optional(),
  edges: z.array(z.unknown()).optional(),
  triggerEvent: z.string().trim().optional(),
  triggerNodeId: z.string().trim().optional(),
  triggerContext: z.record(z.string(), z.unknown()).optional().nullable(),
  entityId: z.string().trim().optional().nullable(),
  entityType: z.string().trim().optional().nullable(),
  maxAttempts: z.number().int().min(1).max(50).optional(),
  backoffMs: z.number().int().min(0).max(60_000).optional(),
  backoffMaxMs: z.number().int().min(0).max(10 * 60_000).optional(),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});

async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, enqueueSchema, {
      logPrefix: "ai-paths.runs.enqueue",
    });
    if (!parsed.ok) return parsed.response;

    const { nodes, edges, ...rest } = parsed.data;
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      throw badRequestError("Nodes and edges are required to enqueue a run.");
    }

    const run = await enqueuePathRun({
      ...rest,
      nodes: nodes as any,
      edges: edges as any,
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

export const POST = apiHandler(POST_handler, { source: "ai-paths.runs.enqueue" });
