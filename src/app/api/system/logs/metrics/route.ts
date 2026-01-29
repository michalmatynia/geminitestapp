import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSystemLogMetrics } from "@/features/observability/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const levelSchema = z.enum(["info", "warn", "error"]);

const metricsSchema = z.object({
  level: levelSchema.optional(),
  source: z.string().trim().optional(),
  query: z.string().trim().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const parsed = metricsSchema.parse(Object.fromEntries(url.searchParams.entries()));
    const metrics = await getSystemLogMetrics({
      level: parsed.level ?? undefined,
      source: parsed.source ?? undefined,
      query: parsed.query ?? undefined,
      from: parsed.from ? new Date(parsed.from) : null,
      to: parsed.to ? new Date(parsed.to) : null,
    });
    return NextResponse.json({ metrics });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "system.logs.metrics.GET",
      fallbackMessage: "Failed to load system log metrics",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "system.logs.metrics.GET" });
