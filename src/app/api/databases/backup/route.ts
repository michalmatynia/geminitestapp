import { NextRequest, NextResponse } from "next/server";
import { createMongoBackup, createPostgresBackup } from "@/features/database/services/database-backup";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

export const runtime = "nodejs";

async function POST_handler(req: NextRequest) {
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
      source: "databases.backup.POST",
      fallbackMessage: "Failed to create database backup",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "databases.backup.POST" });
