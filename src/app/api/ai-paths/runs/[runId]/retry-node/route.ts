import { NextResponse } from "next/server";
import { z } from "zod";

import { apiHandlerWithParams, ApiHandlerContext } from "@/shared/lib/api/api-handler";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { retryPathRunNode } from "@/features/ai-paths/services/path-run-service";
import { startAiPathRunQueue } from "@/features/jobs/server";

const retrySchema = z.object({
  nodeId: z.string().trim().min(1),
});

async function POST_handler(
  req: Request,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<NextResponse | Response> {
  try {
    const parsed = await parseJsonBody(req, retrySchema, {
      logPrefix: "ai-paths.runs.retry-node",
    });
    if (!parsed.ok) return parsed.response;

    const runId = params.runId;
    const nodeId = parsed.data.nodeId;
    const run = await retryPathRunNode(runId, nodeId);
    startAiPathRunQueue();
    return NextResponse.json({ run });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.runs.retry-node",
      fallbackMessage: "Failed to retry node",
    });
  }
}

export const POST = apiHandlerWithParams(POST_handler, { source: "ai-paths.runs.retry-node" });
