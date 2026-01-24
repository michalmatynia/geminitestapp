import { NextRequest, NextResponse } from "next/server";
import { createMongoBackup, createPostgresBackup } from "@/lib/services/database-backup";
import { createErrorResponse } from "@/lib/api/handle-api-error";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
    return createErrorResponse(error, {
      request: req,
      source: "databases/backup.POST",
      fallbackMessage: "Failed to create database backup",
    });
  }
}
