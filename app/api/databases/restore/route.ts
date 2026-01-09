import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

import { resolveDatabasePath } from "@/lib/utils/database-path";

export async function POST(req: Request) {
  try {
    const { dbName } = await req.json() as { dbName: string };
    const prismaDir = path.join(process.cwd(), "prisma");
    const dbPath = resolveDatabasePath();
    const backupDir = path.join(prismaDir, "backups");
    const backupPath = path.join(backupDir, dbName);
    const logPath = path.join(backupDir, "restore-log.json");

    await fs.copyFile(backupPath, dbPath);

    let logData: Record<string, string> = {};
    try {
      const logFile = await fs.readFile(logPath, "utf-8");
      logData = JSON.parse(logFile) as Record<string, string>;
    } catch (error) {
      // Log file doesn't exist, create it
    }

    logData[dbName] = new Date().toISOString();
    await fs.writeFile(logPath, JSON.stringify(logData, null, 2));

    console.log(`Database restored from ${backupPath} to ${dbPath}`);
    return NextResponse.json({ message: "Database restored successfully" });
  } catch (error) {
    console.error("Failed to restore database:", error);
    return NextResponse.json(
      { error: "Failed to restore database" },
      { status: 500 }
    );
  }
}
