import path from "path";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";

import {
  backupsDir,
  ensureBackupsDir,
  assertValidBackupName,
  getPgConnectionUrl,
  getPgRestoreCommand,
  execFileAsync,
} from "../_utils";

export async function POST(req: Request) {
  try {
    const { backupName } = (await req.json()) as { backupName: string };
    if (!backupName) {
      return NextResponse.json({ error: "Backup name is required" }, { status: 400 });
    }

    assertValidBackupName(backupName);
    await ensureBackupsDir();

    const backupPath = path.join(backupsDir, backupName);
    const databaseUrl = getPgConnectionUrl();

    await execFileAsync(getPgRestoreCommand(), [
      "--clean",
      "--if-exists",
      "--dbname",
      databaseUrl,
      backupPath,
    ]);

    const logPath = path.join(backupsDir, "restore-log.json");
    let logData: Record<string, string> = {};
    try {
      const logFile = await fs.readFile(logPath, "utf-8");
      logData = JSON.parse(logFile) as Record<string, string>;
    } catch (error) {
      // No log yet.
    }

    logData[backupName] = new Date().toISOString();
    await fs.writeFile(logPath, JSON.stringify(logData, null, 2));

    return NextResponse.json({ message: "Backup restored" });
  } catch (error) {
    console.error("Failed to restore backup:", error);
    return NextResponse.json(
      { error: "Failed to restore backup" },
      { status: 500 }
    );
  }
}
