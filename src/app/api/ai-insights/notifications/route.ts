export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { listAiInsightNotifications, clearAiInsightNotifications } from "@/features/ai/insights/repository";
import { startAiInsightsQueue } from "@/features/jobs/server";

const listSchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    startAiInsightsQueue();
    const url = new URL(req.url);
    const parsed = listSchema.parse(Object.fromEntries(url.searchParams.entries()));
    const notifications = await listAiInsightNotifications(parsed.limit ?? 20);
    return NextResponse.json({ notifications });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-insights.notifications.GET",
      fallbackMessage: "Failed to load AI notifications",
    });
  }
}

async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    startAiInsightsQueue();
    await clearAiInsightNotifications();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-insights.notifications.DELETE",
      fallbackMessage: "Failed to clear AI notifications",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: "ai-insights.notifications.GET" }
);
export const DELETE = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => DELETE_handler(req, ctx),
  { source: "ai-insights.notifications.DELETE" }
);
