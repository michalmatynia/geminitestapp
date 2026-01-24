import { NextResponse } from "next/server";
import { z } from "zod";
import { getSystemLogMetrics } from "@/lib/services/system-log-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { apiHandler } from "@/lib/api/api-handler";

const levelSchema = z.enum(["info", "warn", "error"]);

const metricsSchema = z.object({
  level: levelSchema.optional(),
  source: z.string().trim().optional(),
  query: z.string().trim().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

async function GET_handler(req: Request) {
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

export const GET = apiHandler(GET_handler, { source: "system.logs.metrics.GET" });
