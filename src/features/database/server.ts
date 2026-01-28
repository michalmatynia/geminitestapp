import "server-only";

export * from "./services/database-backup";
export * from "./types";

export {
  backupsDir as pgBackupsDir,
  ensureBackupsDir as ensurePgBackupsDir,
  getDatabaseUrl,
  getPgConnectionUrl,
  getDatabaseName,
  getPgDumpCommand,
  getPgRestoreCommand,
  execFileAsync as pgExecFileAsync,
  assertValidBackupName as assertValidPgBackupName,
} from "./utils/postgres";

export {
  backupsDir as mongoBackupsDir,
  ensureBackupsDir as ensureMongoBackupsDir,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoDumpCommand,
  getMongoRestoreCommand,
  execFileAsync as mongoExecFileAsync,
  assertValidBackupName as assertValidMongoBackupName,
} from "./utils/mongo";
