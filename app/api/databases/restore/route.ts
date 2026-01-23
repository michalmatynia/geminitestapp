import path from "path";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, internalError } from "@/lib/errors/app-error";

import {
  backupsDir as pgBackupsDir,
  ensureBackupsDir as ensurePgBackupsDir,
  assertValidBackupName as assertValidPgBackupName,
  getPgConnectionUrl,
  getPgRestoreCommand,
  execFileAsync as pgExecFileAsync,
} from "../_utils";

import {
  backupsDir as mongoBackupsDir,
  ensureBackupsDir as ensureMongoBackupsDir,
  assertValidBackupName as assertValidMongoBackupName,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoRestoreCommand,
  execFileAsync as mongoExecFileAsync,
} from "../_utils-mongo";

type ExecOutputishError = {
  stdout?: string;
  stderr?: string;
  cause?: {
    stdout?: string;
    stderr?: string;
  };
};

export async function POST(req: Request) {
  let stage = "parse";
  let backupName: string | null = null;
  let truncateBeforeRestore = false;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "postgresql";

    let body: unknown;
    try {
      body = await req.json();
    } catch (_error) {
      return createErrorResponse(badRequestError("Invalid JSON payload"), {
        request: req,
        source: "databases.restore.POST",
      });
    }

    const parsed = body as {
      backupName: string;
      truncateBeforeRestore?: boolean;
    };

    backupName = parsed.backupName;
    truncateBeforeRestore = Boolean(parsed.truncateBeforeRestore);

    if (!backupName) {
      return createErrorResponse(badRequestError("Backup name is required"), {
        request: req,
        source: "databases.restore.POST",
      });
    }

    if (type === "mongodb") {
      // MongoDB restore
      stage = "validate";
      try {
        assertValidMongoBackupName(backupName);
      } catch (error) {
        return createErrorResponse(
          badRequestError(
            error instanceof Error ? error.message : "Invalid backup name."
          ),
          {
            request: req,
            source: "databases.restore.POST",
            extra: { backupName },
          }
        );
      }
      await ensureMongoBackupsDir();

      const backupPath = path.join(mongoBackupsDir, backupName);
      const mongoUri = getMongoConnectionUrl();
      const databaseName = getMongoDatabaseName();

      if (truncateBeforeRestore) {
        stage = "truncate";
        const db = await getMongoDb();
        const collections = await db.listCollections().toArray();

        for (const collection of collections) {
          await db.collection(collection.name).drop();
        }
      }

      stage = "mongorestore";
      const logPath = path.join(mongoBackupsDir, `${backupName}.restore.log`);
      const command = getMongoRestoreCommand();

      const args = [
        "--uri",
        mongoUri,
        "--db",
        databaseName,
        "--archive=" + backupPath,
        "--gzip",
        "--drop",
      ];

      const commandString = `${command} ${args.join(" ")}`;

      let stdout = "";
      let stderr = "";

      try {
        const result = await mongoExecFileAsync(command, args);
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (error) {
        const err = error as ExecOutputishError;

        stdout = err.stdout ?? err.cause?.stdout ?? "";
        stderr = err.stderr ?? err.cause?.stderr ?? "";

        const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`;
        await fs.writeFile(logPath, logContent);
        return createErrorResponse(internalError("Failed to restore backup"), {
          request: req,
          source: "databases.restore.POST",
          extra: { stage, backupName, log: logContent },
        });
      }

      const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`;
      await fs.writeFile(logPath, logContent);

      stage = "log";
      const restoreLogPath = path.join(mongoBackupsDir, "restore-log.json");
      let logData: Record<string, { date: string; logFile: string }> = {};

      try {
        const logFile = await fs.readFile(restoreLogPath, "utf-8");
        logData = JSON.parse(logFile) as Record<
          string,
          { date: string; logFile: string }
        >;
      } catch {
        // No log yet.
      }

      logData[backupName] = {
        date: new Date().toISOString(),
        logFile: `${backupName}.restore.log`,
      };

      await fs.writeFile(restoreLogPath, JSON.stringify(logData, null, 2));

      return NextResponse.json({
        message: "Backup restored",
        log: logContent,
      });
    } else {
      // PostgreSQL restore
      stage = "validate";
      try {
        assertValidPgBackupName(backupName);
      } catch (error) {
        return createErrorResponse(
          badRequestError(
            error instanceof Error ? error.message : "Invalid backup name."
          ),
          {
            request: req,
            source: "databases.restore.POST",
            extra: { backupName },
          }
        );
      }
      await ensurePgBackupsDir();

      const backupPath = path.join(pgBackupsDir, backupName);
      const databaseUrl = getPgConnectionUrl();

    if (truncateBeforeRestore) {
      stage = "truncate";
      const dbUrl = process.env.DATABASE_URL ?? "";
      if (
        !dbUrl.startsWith("postgres://") &&
        !dbUrl.startsWith("postgresql://")
      ) {
        return createErrorResponse(
          badRequestError(
            "Truncate before restore is only supported for PostgreSQL."
          ),
          {
            request: req,
            source: "databases.restore.POST",
            extra: { backupName },
          }
        );
      }

      const tables = (
        await prisma.$queryRaw<{ tablename: string }[]>`
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename != '_prisma_migrations'
        `
      )
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
    const logPath = path.join(pgBackupsDir, `${backupName}.restore.log`);
    const command = getPgRestoreCommand();

    const args = [
      "--data-only",
      "--disable-triggers",
      "--no-owner",
      "--no-privileges",
      "--single-transaction",
      "--dbname",
      databaseUrl,
      backupPath,
    ];

    const commandString = `${command} ${args.join(" ")}`;

    let stdout = "";
    let stderr = "";

    try {
      const result = await pgExecFileAsync(command, args);
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      const err = error as ExecOutputishError;

      // Capture output from either the error itself (common) or its cause (some wrappers)
      stdout = err.stdout ?? err.cause?.stdout ?? "";
      stderr = err.stderr ?? err.cause?.stderr ?? "";

      const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`;
      await fs.writeFile(logPath, logContent);
      return createErrorResponse(internalError("Failed to restore backup"), {
        request: req,
        source: "databases.restore.POST",
        extra: { stage, backupName, log: logContent },
      });
    }

    const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`;
    await fs.writeFile(logPath, logContent);

    stage = "log";
    const restoreLogPath = path.join(pgBackupsDir, "restore-log.json");
    let logData: Record<string, { date: string; logFile: string }> = {};

    try {
      const logFile = await fs.readFile(restoreLogPath, "utf-8");
      logData = JSON.parse(logFile) as Record<
        string,
        { date: string; logFile: string }
      >;
    } catch {
      // No log yet.
    }

    logData[backupName] = {
      date: new Date().toISOString(),
      logFile: `${backupName}.restore.log`,
    };

    await fs.writeFile(restoreLogPath, JSON.stringify(logData, null, 2));

    return NextResponse.json({
      message: "Backup restored",
      log: logContent,
    });
  }
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "databases.restore.POST",
      fallbackMessage: "Failed to restore backup",
      extra: { stage, backupName },
    });
  }
}
