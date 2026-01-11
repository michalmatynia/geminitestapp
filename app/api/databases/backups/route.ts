import path from "path";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { DatabaseInfo } from "@/components/database-columns";

import { backupsDir, ensureBackupsDir } from "../_utils";

async function getBackups(): Promise<DatabaseInfo[]> {
  await ensureBackupsDir();
  const logPath = path.join(backupsDir, "restore-log.json");

  let logData: Record<string, string> = {};
  try {
    const logFile = await fs.readFile(logPath, "utf-8");
    logData = JSON.parse(logFile) as Record<string, string>;
  } catch (error) {
    // No log yet.
  }

  const files = await fs.readdir(backupsDir);
  const backupFiles = files.filter((file) => file.endsWith(".dump"));

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

export async function GET() {
  try {
    const backups = await getBackups();
    return NextResponse.json(backups);
  } catch (error) {
    console.error("Failed to list backups:", error);
    return NextResponse.json(
      { error: "Failed to list backups" },
      { status: 500 }
    );
  }
}
