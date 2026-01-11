import path from "path";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

import {
  backupsDir,
  ensureBackupsDir,
  assertValidBackupName,
  getPgConnectionUrl,
  getPgRestoreCommand,
  execFileAsync,
} from "../_utils";

export async function POST(req: Request) {
  const errorId = randomUUID();
  let stage = "parse";
  let backupName: string | null = null;
  let truncateBeforeRestore = false;
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      console.error("[databases][restore] Failed to parse JSON body", {
        errorId,
        error,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId },
        { status: 400 }
      );
    }
    const parsed = body as {
      backupName: string;
      truncateBeforeRestore?: boolean;
    };
    backupName = parsed.backupName;
    truncateBeforeRestore = Boolean(parsed.truncateBeforeRestore);
    if (!backupName) {
      return NextResponse.json(
        { error: "Backup name is required", errorId },
        { status: 400 }
      );
    }

    stage = "validate";
    assertValidBackupName(backupName);
    await ensureBackupsDir();

    const backupPath = path.join(backupsDir, backupName);
    const databaseUrl = getPgConnectionUrl();

    if (truncateBeforeRestore) {
      stage = "truncate";
      const dbUrl = process.env.DATABASE_URL ?? "";
      if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) {
        return NextResponse.json(
          {
            error: "Truncate before restore is only supported for PostgreSQL.",
            errorId,
            backupName,
          },
          { status: 400 }
        );
      }
      const tables = (await prisma.$queryRaw<
        { tablename: string }[]
      >`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'`)
        .map((row) => row.tablename)
        .filter(Boolean);
      if (tables.length > 0) {
        const quotedTables = tables
          .map((name) => `"${name.replace(/"/g, '""')}"`)
          .join(", ");
        await prisma.$executeRawUnsafe(
          `TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`
        );
      }
    }

    stage = "pg_restore";
    await execFileAsync(getPgRestoreCommand(), [
      "--data-only",
      "--disable-triggers",
      "--no-owner",
      "--no-privileges",
      "--single-transaction",
      "--dbname",
      databaseUrl,
      backupPath,
    ]);

    stage = "log";
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
    console.error("[databases][restore] Failed to restore backup", {
      errorId,
      stage,
      backupName,
      truncateBeforeRestore,
      error,
    });
    return NextResponse.json(
      {
        error: "Failed to restore backup",
        errorId,
        stage,
        backupName,
      },
      { status: 500 }
    );
  }
}
