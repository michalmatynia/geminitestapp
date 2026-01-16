import path from "path";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";

import {
  backupsDir as pgBackupsDir,
  ensureBackupsDir as ensurePgBackupsDir,
  getDatabaseName,
  getPgConnectionUrl,
  getPgDumpCommand,
  execFileAsync as pgExecFileAsync,
} from "../_utils";

import {
  backupsDir as mongoBackupsDir,
  ensureBackupsDir as ensureMongoBackupsDir,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoDumpCommand,
  execFileAsync as mongoExecFileAsync,
} from "../_utils-mongo";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "postgresql";

    if (type === "mongodb") {
      // MongoDB backup
      const mongoUri = getMongoConnectionUrl();
      const databaseName = getMongoDatabaseName();
      await ensureMongoBackupsDir();

      const backupName = `${databaseName}-backup-${Date.now()}.archive`;
      const backupPath = path.join(mongoBackupsDir, backupName);
      const logPath = path.join(mongoBackupsDir, `${backupName}.log`);

      const command = getMongoDumpCommand();
      const args = [
        "--uri",
        mongoUri,
        "--db",
        databaseName,
        "--archive=" + backupPath,
        "--gzip",
      ];
      const commandString = `${command} ${args.join(" ")}`;

      let stdout = "";
      let stderr = "";
      try {
        const result = await mongoExecFileAsync(command, args);
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

        const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}\n\nerror:\n${message}`;
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
    } else {
      // PostgreSQL backup
      const databaseUrl = getPgConnectionUrl();
      const databaseName = getDatabaseName(databaseUrl);
      await ensurePgBackupsDir();

      const backupName = `${databaseName}-backup-${Date.now()}.dump`;
      const backupPath = path.join(pgBackupsDir, backupName);
      const logPath = path.join(pgBackupsDir, `${backupName}.log`);

      const command = getPgDumpCommand();
      const args = ["-Fc", "--file", backupPath, "--dbname", databaseUrl];
      const commandString = `${command} ${args.join(" ")}`;

      let stdout = "";
      let stderr = "";
      try {
        const result = await pgExecFileAsync(command, args);
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

        const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}\n\nerror:\n${message}`;
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
    }
  } catch (error) {
    console.error("Failed to create backup:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
