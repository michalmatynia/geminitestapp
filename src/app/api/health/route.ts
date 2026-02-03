import { MongoClient } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse | Response> {
  const uri = process.env.MONGODB_URI;
  if (!uri)
    return Response.json(
      { ok: false, error: "MONGODB_URI missing" },
      { status: 500 },
    );

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    await client.db().command({ ping: 1 });
    return Response.json({ ok: true });
  } catch (e: unknown) {
    return createErrorResponse(e, {
      request: req,
      source: "api.health",
      fallbackMessage: "Database ping failed",
    });
  } finally {
    await client.close().catch(() => {});
  }
}
