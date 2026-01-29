import path from "path";
import { promises as fs } from "fs";
import { NextRequest, NextResponse } from "next/server";

import {
  pgBackupsDir,
  assertValidPgBackupName,
  mongoBackupsDir,
  assertValidMongoBackupName,
} from "@/features/database/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

async function POST_handler(req: NextRequest): Promise<Response> {
  try {
    const { backupName, type } = (await req.json()) as {
      backupName: string;
      type?: "postgresql" | "mongodb";
    };
    if (!backupName) {
      throw badRequestError("Backup name is required");
    }

    const dbType = type === "mongodb" ? "mongodb" : "postgresql";
    if (dbType === "mongodb") {
      assertValidMongoBackupName(backupName);
    } else {
      assertValidPgBackupName(backupName);
    }

    const backupsDir = dbType === "mongodb" ? mongoBackupsDir : pgBackupsDir;
    const backupPath = path.join(backupsDir, backupName);
    await fs.unlink(backupPath);

    return NextResponse.json({ message: "Backup deleted" });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "databases.delete.POST",
      fallbackMessage: "Failed to delete backup",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "databases.delete.POST" });
