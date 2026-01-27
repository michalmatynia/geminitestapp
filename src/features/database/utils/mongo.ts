import path from "path";
import { promises as fs } from "fs";
import { execFile } from "child_process";

export const backupsDir = path.join(process.cwd(), "mongo", "backups");

export const ensureBackupsDir = async () => {
  await fs.mkdir(backupsDir, { recursive: true });
};

export const getMongoConnectionUrl = () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set.");
  }
  return mongoUri;
};

export const getMongoDatabaseName = () => {
  const dbName = process.env.MONGODB_DB;
  if (!dbName) {
    throw new Error("MONGODB_DB is not set.");
  }
  return dbName;
};

export const getMongoDumpCommand = () =>
  process.env.MONGODUMP_PATH ?? "mongodump";

export const getMongoRestoreCommand = () =>
  process.env.MONGORESTORE_PATH ?? "mongorestore";

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

export const assertValidBackupName = (backupName: string) => {
  const basename = path.basename(backupName);
  if (basename !== backupName) {
    throw new Error("Invalid backup name.");
  }
  if (path.extname(backupName) !== ".archive") {
    throw new Error("Invalid backup file type.");
  }
};
