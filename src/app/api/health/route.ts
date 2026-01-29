import { MongoClient } from "mongodb";
import error from "next/error";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest): Promise<NextResponse | Response> {
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
    console.error("DB ping failed:", e);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "DB error" },
      { status: 500 },
    );
  } finally {
    await client.close().catch(() => {});
  }
}
