import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { DatabaseInfo } from "@/components/database-columns";

async function getBackups(): Promise<DatabaseInfo[]> {
  const backupDir = path.join(process.cwd(), "prisma", "backups");
  const logPath = path.join(backupDir, "restore-log.json");

  let logData: Record<string, string> = {};
  try {
    const logFile = await fs.readFile(logPath, "utf-8");
    logData = JSON.parse(logFile) as Record<string, string>;
  } catch (error) {
    // Log file doesn't exist, no problem
  }

  try {
    const files = await fs.readdir(backupDir);
    const dbFiles = files.filter((file) => file.endsWith(".db"));

    const databases = await Promise.all(
      dbFiles.map(async (file) => {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: `${(stats.size / 1024).toFixed(2)} KB`,
          created: stats.birthtime.toLocaleString(),
          lastModified: stats.mtime.toLocaleString(),
          lastRestored: logData[file]
            ? new Date(logData[file]).toLocaleString()
            : undefined,
        };
      })
    );
    return databases;
  } catch (error) {
    // If the backups directory doesn't exist, return an empty array.
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function GET() {
  try {
    const backups = await getBackups();
    return NextResponse.json(backups);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch backups" },
      { status: 500 }
    );
  }
}