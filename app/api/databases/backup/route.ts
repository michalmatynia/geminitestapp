import path from "path";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";

import {
  backupsDir,
  ensureBackupsDir,
  getDatabaseName,
  getPgConnectionUrl,
  getPgDumpCommand,
  execFileAsync,
} from "../_utils";

export async function POST() {
  try {
    const databaseUrl = getPgConnectionUrl();
    const databaseName = getDatabaseName(databaseUrl);
    await ensureBackupsDir();

    const backupName = `${databaseName}-backup-${Date.now()}.dump`;
    const backupPath = path.join(backupsDir, backupName);

    try {
      await execFileAsync(getPgDumpCommand(), [
        "-Fc",
        "--file",
        backupPath,
        "--dbname",
        databaseUrl,
      ]);
      return NextResponse.json({ message: "Backup created", backupName });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const cause = (error as { cause?: { stderr?: string } }).cause;
      const details = cause?.stderr?.trim();

      const stat = await fs.stat(backupPath).catch(() => null);
      if (stat && stat.size > 0) {
        return NextResponse.json({
          message: "Backup created with warnings",
          backupName,
          warning: details || message,
        });
      }

      return NextResponse.json(
        { error: details || message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to create backup:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
