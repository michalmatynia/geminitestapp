import { NextResponse } from "next/server";
import { createMongoBackup, createPostgresBackup } from "@/lib/services/database-backup";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "postgresql";

    if (type === "mongodb") {
      const result = await createMongoBackup();
      return NextResponse.json(result);
    }

    const result = await createPostgresBackup();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to create backup:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
