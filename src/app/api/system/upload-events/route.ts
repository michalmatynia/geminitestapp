export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { listFileUploadEvents } from "@/features/files/server";

const parseDateParam = (value: string | null, endOfDay: boolean = false): Date | null => {
  if (!value) return null;
  const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 50);
    const statusParam = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const projectId = url.searchParams.get("projectId");
    const query = url.searchParams.get("query");
    const from = parseDateParam(url.searchParams.get("from"));
    const to = parseDateParam(url.searchParams.get("to"), true);

    const status =
      statusParam === "success" || statusParam === "error" ? statusParam : null;

    const result = await listFileUploadEvents({
      page,
      pageSize,
      status,
      category: category || null,
      projectId: projectId || null,
      query: query || null,
      from,
      to,
    });

    return NextResponse.json(result);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "system.upload-events.GET",
      fallbackMessage: "Failed to load upload events",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: "system.upload-events.GET" }
);
