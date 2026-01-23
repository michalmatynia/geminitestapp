import path from "path";
import { promises as fs } from "fs";

import {
  backupsDir as pgBackupsDir,
  ensureBackupsDir as ensurePgBackupsDir,
  getDatabaseName,
  getPgConnectionUrl,
  getPgDumpCommand,
  execFileAsync as pgExecFileAsync,
} from "@/app/api/databases/_utils";

import {
  backupsDir as mongoBackupsDir,
  ensureBackupsDir as ensureMongoBackupsDir,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoDumpCommand,
  execFileAsync as mongoExecFileAsync,
} from "@/app/api/databases/_utils-mongo";

export type DatabaseBackupResult = {
  message: string;
  backupName: string;
  log: string;
  warning?: string | undefined;
};

export const createMongoBackup = async (): Promise<DatabaseBackupResult> => {
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

    throw new Error(details || message);
  }
};

export const createPostgresBackup = async (): Promise<DatabaseBackupResult> => {
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

    throw new Error(details || message);
  }
};

export const createFullDatabaseBackup = async () => {
  const mongo = await createMongoBackup();
  const postgres = await createPostgresBackup();
  return { mongo, postgres };
};
