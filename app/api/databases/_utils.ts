import path from "path";
import { promises as fs } from "fs";
import { execFile } from "child_process";

export const backupsDir = path.join(process.cwd(), "prisma", "backups");

export const ensureBackupsDir = async () => {
  await fs.mkdir(backupsDir, { recursive: true });
};

export const getDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }
  return databaseUrl;
};

export const getPgConnectionUrl = () => {
  const databaseUrl = getDatabaseUrl();
  try {
    const url = new URL(databaseUrl);
    url.searchParams.delete("schema");
    return url.toString();
  } catch {
    return databaseUrl;
  }
};

export const getDatabaseName = (databaseUrl: string) => {
  try {
    const url = new URL(databaseUrl);
    return url.pathname.replace(/^\//, "") || "database";
  } catch {
    return "database";
  }
};

export const getPgDumpCommand = () =>
  process.env.PG_DUMP_PATH ?? "pg_dump";

export const getPgRestoreCommand = () =>
  process.env.PG_RESTORE_PATH ?? "pg_restore";

export const execFileAsync = (
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    execFile(command, args, (error, stdout, stderr) => {
      if (error) {
        const wrapped = new Error(error.message);
        (wrapped as { cause?: { stdout: string; stderr: string } }).cause = {
          stdout,
          stderr,
        };
        reject(wrapped);
        return;
      }
      resolve({ stdout, stderr });
    });
  });

export const assertValidBackupName = (backupName: string) =>
  {
    const basename = path.basename(backupName);
    if (basename !== backupName) {
      throw new Error("Invalid backup name.");
    }
    if (path.extname(backupName) !== ".dump") {
      throw new Error("Invalid backup file type.");
    }
  };
