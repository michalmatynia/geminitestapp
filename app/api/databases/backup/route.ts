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

    const command = getPgDumpCommand();
    const args = ["-Fc", "--file", backupPath, "--dbname", databaseUrl];
    const commandString = `${command} ${args.join(" ")}`;

    let stdout = "";
    let stderr = "";
    try {
      const result = await execFileAsync(command, args);
      stdout = result.stdout;
      stderr = result.stderr;

      const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`;
      await fs.writeFile(logPath, logContent);

      return NextResponse.json({
        message: "Backup created",
        backupName,
        log: logContent,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const cause = (error as { cause?: { stdout?: string; stderr?: string } })
        .cause;
      stdout = cause?.stdout || "";
      stderr = cause?.stderr || "";

      const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`;
      await fs.writeFile(logPath, logContent);

      const details = stderr.trim();
      const stat = await fs.stat(backupPath).catch(() => null);
      if (stat && stat.size > 0) {
        return NextResponse.json({
          message: "Backup created with warnings",
          backupName,
          warning: details || message,
          log: logContent,
        });
      }

      return NextResponse.json(
        {
          error: details || message,
          log: logContent,
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
