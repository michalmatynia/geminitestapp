import path from "path";
import { promises as fs } from "fs";
import { NextRequest, NextResponse } from "next/server";

import {
  backupsDir as pgBackupsDir,
  assertValidBackupName as assertValidPgBackupName,
} from "../_utils";
import {
  backupsDir as mongoBackupsDir,
  assertValidBackupName as assertValidMongoBackupName,
} from "../_utils-mongo";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError } from "@/lib/errors/app-error";

export async function POST(req: NextRequest) {
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
      source: "databases/delete.POST",
      fallbackMessage: "Failed to delete backup",
    });
  }
}
