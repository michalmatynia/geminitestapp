import { MongoClient } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

export const runtime = "nodejs";

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI missing");
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    await client.db().command({ ping: 1 });
    return Response.json({ ok: true });
  } finally {
    await client.close().catch(() => {});
  }
}

export const GET = apiHandler(GET_handler, {
  source: "api.health",
  fallbackMessage: "Database ping failed",
});
