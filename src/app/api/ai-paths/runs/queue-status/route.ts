export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { requireAiPathsAccess } from "@/features/ai/ai-paths/server";
import { getAiPathRunQueueStatus, startAiInsightsQueue, startAiPathRunQueue } from "@/features/jobs/server";

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();
  startAiPathRunQueue();
  startAiInsightsQueue();
  const status = await getAiPathRunQueueStatus();
  return NextResponse.json({ status });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: "ai-paths.runs.queue-status" }
);
