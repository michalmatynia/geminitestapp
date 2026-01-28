import path from "path";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import type { DatabaseInfo } from "@/features/database";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";

import {
  pgBackupsDir,
  ensurePgBackupsDir,
  mongoBackupsDir,
  ensureMongoBackupsDir,
} from "@/features/database/server";
import { apiHandler } from "@/shared/lib/api/api-handler";

async function getBackups(type: "postgresql" | "mongodb"): Promise<DatabaseInfo[]> {
  const backupsDir = type === "mongodb" ? mongoBackupsDir : pgBackupsDir;
  const ensureDir =
    type === "mongodb" ? ensureMongoBackupsDir : ensurePgBackupsDir;
  const extension = type === "mongodb" ? ".archive" : ".dump";

  await ensureDir();
  const logPath = path.join(backupsDir, "restore-log.json");

  let logData: Record<string, string> = {};
  try {
    const logFile = await fs.readFile(logPath, "utf-8");
    logData = JSON.parse(logFile) as Record<string, string>;
  } catch (_error) {
    // No log yet.
  }

  const files = await fs.readdir(backupsDir);
  const backupFiles = files.filter((file) => file.endsWith(extension));

  const backups = await Promise.all(
    backupFiles.map(async (file) => {
      const filePath = path.join(backupsDir, file);
      const stats = await fs.stat(filePath);
      return {
        name: file,
        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        created: stats.birthtime.toLocaleString(),
        createdAt: stats.birthtime.toISOString(),
        lastModified: stats.mtime.toLocaleString(),
        lastModifiedAt: stats.mtime.toISOString(),
        lastRestored: logData[file]
          ? new Date(logData[file]).toLocaleString()
          : undefined,
      };
    })
  );

  return backups;
}

async function GET_handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") as "postgresql" | "mongodb") || "postgresql";

    const backups = await getBackups(type);
    return NextResponse.json(backups);
  } catch (error) {
    console.error("Failed to list backups:", error);
    return createErrorResponse(error, {
      request: req,
      source: "databases.backups.GET",
      fallbackMessage: "Failed to list backups",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "databases.backups.GET" });
