export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import { getSystemLogById } from "@/features/observability/server";
import { generateLogInterpretation } from "@/features/ai/insights/generator";
import { startAiInsightsQueue } from "@/features/jobs/server";

const schema = z.object({
  logId: z.string().trim().min(1),
});

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    startAiInsightsQueue();
    const parsed = await parseJsonBody(req, schema, {
      logPrefix: "system.logs.interpret.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const log = await getSystemLogById(parsed.data.logId);
    if (!log) {
      throw notFoundError("Log not found.");
    }
    const insight = await generateLogInterpretation({
      source: "manual",
      log: {
        id: log.id,
        level: log.level,
        message: log.message,
        source: log.source ?? null,
        context: log.context ?? null,
        stack: log.stack ?? null,
        path: log.path ?? null,
        method: log.method ?? null,
        statusCode: log.statusCode ?? null,
        ...(log.createdAt ? { createdAt: new Date(log.createdAt).toISOString() } : {}),
      },
    });
    return NextResponse.json({ insight });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "system.logs.interpret.POST",
      fallbackMessage: "Failed to interpret log",
    });
  }
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: "system.logs.interpret.POST" }
);
