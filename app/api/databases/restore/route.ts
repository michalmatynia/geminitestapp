import path from "path";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
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
  try {
    const { backupName, truncateBeforeRestore } = (await req.json()) as {
      backupName: string;
      truncateBeforeRestore?: boolean;
    };
    if (!backupName) {
      return NextResponse.json({ error: "Backup name is required" }, { status: 400 });
    }

    assertValidBackupName(backupName);
    await ensureBackupsDir();

    const backupPath = path.join(backupsDir, backupName);
    const databaseUrl = getPgConnectionUrl();

    if (truncateBeforeRestore) {
      const dbUrl = process.env.DATABASE_URL ?? "";
      if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) {
        return NextResponse.json(
          { error: "Truncate before restore is only supported for PostgreSQL." },
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
