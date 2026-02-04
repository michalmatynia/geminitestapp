import "server-only";

import path from "path";
import { promises as fs } from "fs";

import {
  backupsDir as pgBackupsDir,
  ensureBackupsDir as ensurePgBackupsDir,
  getDatabaseName,
  getPgConnectionUrl,
  getPgDumpCommand,
  execFileAsync as pgExecFileAsync,
} from "@/features/database/utils/postgres";

import {
  backupsDir as mongoBackupsDir,
  ensureBackupsDir as ensureMongoBackupsDir,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoDumpCommand,
  execFileAsync as mongoExecFileAsync,
} from "@/features/database/utils/mongo";
import { forbiddenError, operationFailedError } from "@/shared/errors/app-error";

export type DatabaseBackupResult = {
  message: string;
  backupName: string;
  log: string;
  warning?: string | undefined;
};

const assertBackupsAllowed = (): void => {
  if (process.env.NODE_ENV === "production") {
    throw forbiddenError("Database backups are disabled in production.");
  }
};

export const createMongoBackup = async (): Promise<DatabaseBackupResult> => {
  assertBackupsAllowed();
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

    return {
      message: "Backup created",
      backupName,
      log: logContent,
    };
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
      return {
        message: "Backup created with warnings",
        backupName,
        warning: details || message,
        log: logContent,
      };
    }

    throw operationFailedError(
      "Failed to create MongoDB backup",
      error,
      details ? { details } : undefined
    );
  }
};

export const createPostgresBackup = async (): Promise<DatabaseBackupResult> => {
  assertBackupsAllowed();
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

    return {
      message: "Backup created",
      backupName,
      log: logContent,
    };
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
      return {
        message: "Backup created with warnings",
        backupName,
        warning: details || message,
        log: logContent,
      };
    }

    throw operationFailedError(
      "Failed to create Postgres backup",
      error,
      details ? { details } : undefined
    );
  }
};

export const createFullDatabaseBackup = async (): Promise<{ mongo: DatabaseBackupResult; postgres: DatabaseBackupResult }> => {
  assertBackupsAllowed();
  const mongo = await createMongoBackup();
  const postgres = await createPostgresBackup();
  return { mongo, postgres };
};
