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
    const logPath = path.join(backupsDir, `${backupName}.log`);

    let stdout = "";
    let stderr = "";
    try {
      const result = await execFileAsync(getPgDumpCommand(), [
        "-Fc",
        "--file",
        backupPath,
        "--dbname",
        databaseUrl,
      ]);
      stdout = result.stdout;
      stderr = result.stderr;

      await fs.writeFile(logPath, `stdout:\n${stdout}\n\nstderr:\n${stderr}`);

      return NextResponse.json({
        message: "Backup created",
        backupName,
        log: `stdout:\n${stdout}\n\nstderr:\n${stderr}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const cause = (error as { cause?: { stdout?: string; stderr?: string } })
        .cause;
      stdout = cause?.stdout || "";
      stderr = cause?.stderr || "";

      await fs.writeFile(logPath, `stdout:\n${stdout}\n\nstderr:\n${stderr}`);

      const details = stderr.trim();
      const stat = await fs.stat(backupPath).catch(() => null);
      if (stat && stat.size > 0) {
        return NextResponse.json({
          message: "Backup created with warnings",
          backupName,
          warning: details || message,
          log: `stdout:\n${stdout}\n\nstderr:\n${stderr}`,
        });
      }

      return NextResponse.json(
        {
          error: details || message,
          log: `stdout:\n${stdout}\n\nstderr:\n${stderr}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to create backup:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
