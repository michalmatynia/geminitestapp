export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { listAiInsights } from "@/features/ai/insights/repository";
import { generateAnalyticsInsight } from "@/features/ai/insights/generator";
import { startAiInsightsQueue } from "@/features/jobs/server";

const listSchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  startAiInsightsQueue();
  const url = new URL(req.url);
  const parsed = listSchema.parse(Object.fromEntries(url.searchParams.entries()));
  const insights = await listAiInsights("analytics", parsed.limit ?? 10);
  return NextResponse.json({ insights });
}

async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  startAiInsightsQueue();
  const insight = await generateAnalyticsInsight({ source: "manual" });
  return NextResponse.json({ insight });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: "analytics.insights.GET" }
);
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: "analytics.insights.POST" }
);
