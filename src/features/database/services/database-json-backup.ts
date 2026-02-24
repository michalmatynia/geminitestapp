import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';

import {
  backupsDir as pgBackupsDir,
  ensureBackupsDir as ensurePgBackupsDir,
  getDatabaseName,
  getPgConnectionUrl,
} from '@/features/database/utils/postgres';
import { ErrorSystem } from '@/features/observability/server';
import { forbiddenError, operationFailedError } from '@/shared/errors/app-error';
import prisma from '@/shared/lib/db/prisma';


import type { DatabaseBackupResult } from './database-backup';

// ── DMMF types ──

type DmmfField = {
  name: string;
  kind: string;
  type: string;
  isRequired: boolean;
  isList: boolean;
  isId: boolean;
  relationName?: string | undefined;
  relationFromFields?: string[] | undefined;
  relationToFields?: string[] | undefined;
};

type DmmfModel = {
  name: string;
  fields: DmmfField[];
};

type DmmfDatamodel = {
  models: DmmfModel[];
};

// ── Helpers ──

const getPrismaDmmf = (): DmmfDatamodel | null => {
  if (!process.env['DATABASE_URL']) return null;
  try {
    return (prisma as unknown as { _dmmf?: { datamodel?: DmmfDatamodel } })._dmmf?.datamodel ?? null;
  } catch {
    return null;
  }
};

/**
 * Returns Prisma model names in dependency order (models with no FK deps first).
 * Uses Kahn's algorithm for topological sort.
 */
export function getPrismaModelDependencyOrder(): string[] {
  const dmmf = getPrismaDmmf();
  if (!dmmf) return [];

  const models = dmmf.models;
  const modelNames = new Set(models.map((m: DmmfModel) => m.name));

  // Build adjacency: if model A has a FK to model B, then A depends on B
  const dependsOn = new Map<string, Set<string>>();
  const dependedBy = new Map<string, Set<string>>();

  for (const name of modelNames) {
    dependsOn.set(name, new Set());
    dependedBy.set(name, new Set());
  }

  for (const model of models) {
    for (const field of model.fields) {
      if (
        field.kind === 'object' &&
        field.relationFromFields &&
        field.relationFromFields.length > 0 &&
        modelNames.has(field.type)
      ) {
        // model depends on field.type (the related model)
        // Skip self-references
        if (field.type !== model.name) {
          dependsOn.get(model.name)!.add(field.type);
          dependedBy.get(field.type)!.add(model.name);
        }
      }
    }
  }

  // Kahn's algorithm
  const result: string[] = [];
  const queue: string[] = [];

  for (const name of modelNames) {
    if (dependsOn.get(name)!.size === 0) {
      queue.push(name);
    }
  }

  while (queue.length > 0) {
    const name = queue.shift()!;
    result.push(name);

    for (const dependent of dependedBy.get(name)!) {
      dependsOn.get(dependent)!.delete(name);
      if (dependsOn.get(dependent)!.size === 0) {
        queue.push(dependent);
      }
    }
  }

  // Any remaining models (circular deps) are appended at the end
  for (const name of modelNames) {
    if (!result.includes(name)) {
      result.push(name);
    }
  }

  return result;
}

interface PrismaModel {
  findMany: (args?: unknown) => Promise<unknown[]>;
  count: (args?: unknown) => Promise<number>;
  createMany: (args: { data: unknown[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
  deleteMany: (args?: unknown) => Promise<{ count: number }>;
}

const getPrismaModel = (modelName: string): PrismaModel | null => {
  const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const model = (prisma as unknown as Record<string, PrismaModel>)[key];
  if (!model || typeof model.findMany !== 'function') return null;
  return model;
};

const resetSequences = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    DO $$ DECLARE r RECORD; BEGIN
      FOR r IN (
        SELECT c.oid::regclass AS seq_name,
               t.relname AS table_name,
               a.attname AS column_name
        FROM pg_class c
        JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'a'
        JOIN pg_class t ON t.oid = d.refobjid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
        WHERE c.relkind = 'S'
      ) LOOP
        EXECUTE format(
          'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 1))',
          r.seq_name, r.column_name, r.table_name
        );
      END LOOP;
    END $$;
  `);
};

// ── Backup ──

export async function createPrismaJsonBackup(): Promise<DatabaseBackupResult> {
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('Database backups are disabled in production.');
  }

  const databaseUrl = getPgConnectionUrl();
  const databaseName = getDatabaseName(databaseUrl);
  await ensurePgBackupsDir();

  const backupName = `${databaseName}-json-${Date.now()}.json.gz`;
  const backupPath = path.join(pgBackupsDir, backupName);
  const logPath = path.join(pgBackupsDir, `${backupName}.log`);

  const modelOrder = getPrismaModelDependencyOrder();
  if (modelOrder.length === 0) {
    throw operationFailedError('No Prisma models found. Cannot create backup.');
  }

  const logLines: string[] = [`JSON Backup started at ${new Date().toISOString()}`];
  const data: Record<string, unknown[]> = {};

  for (const modelName of modelOrder) {
    const model = getPrismaModel(modelName);
    if (!model) {
      logLines.push(`[SKIP] ${modelName}: model not accessible via Prisma client`);
      continue;
    }

    try {
      const rows = await model.findMany();
      data[modelName] = rows;
      logLines.push(`[OK] ${modelName}: ${rows.length} rows`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logLines.push(`[ERROR] ${modelName}: ${msg}`);
      void ErrorSystem.logWarning(`[database-json-backup] Failed to backup model ${modelName}`, {
        service: 'database-json-backup',
        model: modelName,
        error,
      });
    }
  }

  // Write gzipped JSON
  const jsonString = JSON.stringify(data, null, 0);
  const source = Readable.from([jsonString]);
  const gzip = createGzip();
  const destination = Writable.toWeb(
    await fs.open(backupPath, 'w').then((fh) => fh.createWriteStream())
  ) as unknown as NodeJS.WritableStream;

  await pipeline(source, gzip, destination);

  const totalRows = Object.values(data).reduce((sum, rows) => sum + rows.length, 0);
  logLines.push(`\nCompleted: ${Object.keys(data).length} models, ${totalRows} total rows`);

  const logContent = logLines.join('\n');
  await fs.writeFile(logPath, logContent);

  return {
    message: 'JSON backup created',
    backupName,
    log: logContent,
  };
}

// ── Restore ──

export const assertValidJsonBackupName = (backupName: string): void => {
  const basename = path.basename(backupName);
  if (basename !== backupName) {
    throw operationFailedError('Invalid backup name.');
  }
  if (!backupName.endsWith('.json.gz')) {
    throw operationFailedError('Invalid backup file type. Expected .json.gz');
  }
};

export async function restorePrismaJsonBackup(
  backupName: string
): Promise<{ message: string; log: string }> {
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('Database restores are disabled in production.');
  }

  assertValidJsonBackupName(backupName);
  await ensurePgBackupsDir();

  const backupPath = path.join(pgBackupsDir, backupName);
  const logPath = path.join(pgBackupsDir, `${backupName}.restore.log`);

  // Read and decompress
  const compressed = await fs.readFile(backupPath);
  const jsonString = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const gunzip = createGunzip();
    gunzip.on('data', (chunk: Buffer) => chunks.push(chunk));
    gunzip.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    gunzip.on('error', reject);
    gunzip.end(compressed);
  });

  const data = JSON.parse(jsonString) as Record<string, unknown[]>;
  const modelOrder = getPrismaModelDependencyOrder();
  const logLines: string[] = [`JSON Restore started at ${new Date().toISOString()}`];

  // Truncate in reverse dependency order (leaf tables first)
  logLines.push('\n--- Truncating tables ---');
  const reverseOrder = [...modelOrder].reverse();
  for (const modelName of reverseOrder) {
    const model = getPrismaModel(modelName);
    if (!model) continue;
    try {
      const result = await model.deleteMany();
      logLines.push(`[TRUNCATE] ${modelName}: ${result.count} rows deleted`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logLines.push(`[TRUNCATE ERROR] ${modelName}: ${msg}`);
      void ErrorSystem.logWarning(`[database-json-backup] Failed to truncate model ${modelName}`, {
        service: 'database-json-backup',
        model: modelName,
        error,
      });
    }
  }

  // Insert in dependency order (parent tables first)
  logLines.push('\n--- Inserting data ---');
  let totalInserted = 0;

  for (const modelName of modelOrder) {
    const rows = data[modelName];
    if (!rows || rows.length === 0) {
      logLines.push(`[SKIP] ${modelName}: no data in backup`);
      continue;
    }

    const model = getPrismaModel(modelName);
    if (!model) {
      logLines.push(`[SKIP] ${modelName}: model not accessible via Prisma client`);
      continue;
    }

    try {
      // Insert in batches to avoid memory issues
      const BATCH_SIZE = 500;
      let inserted = 0;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const result = await model.createMany({
          data: batch,
          skipDuplicates: true,
        });
        inserted += result.count;
      }

      totalInserted += inserted;
      logLines.push(`[OK] ${modelName}: ${inserted}/${rows.length} rows inserted`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logLines.push(`[ERROR] ${modelName}: ${msg}`);
      void ErrorSystem.logWarning(`[database-json-backup] Failed to insert data for model ${modelName}`, {
        service: 'database-json-backup',
        model: modelName,
        error,
      });
    }
  }

  // Reset sequences
  logLines.push('\n--- Resetting sequences ---');
  try {
    await resetSequences();
    logLines.push('[OK] Sequences reset successfully');
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logLines.push(`[WARNING] Sequence reset failed: ${msg}`);
    void ErrorSystem.logWarning('[database-json-backup] Sequence reset failed', {
      service: 'database-json-backup',
      error,
    });
  }

  logLines.push(`\nCompleted: ${totalInserted} total rows inserted`);

  // Write restore log
  const logContent = logLines.join('\n');
  await fs.writeFile(logPath, logContent);

  // Update restore-log.json
  const restoreLogPath = path.join(pgBackupsDir, 'restore-log.json');
  let logData: Record<string, { date: string; logFile: string }> = {};
  try {
    const existingLog = await fs.readFile(restoreLogPath, 'utf-8');
    logData = JSON.parse(existingLog) as Record<string, { date: string; logFile: string }>;
  } catch (error) {
    void ErrorSystem.logWarning('[database-json-backup] Failed to load restore-log.json', {
      service: 'database-json-backup',
      error,
    });
  }
  logData[backupName] = {
    date: new Date().toISOString(),
    logFile: `${backupName}.restore.log`,
  };
  await fs.writeFile(restoreLogPath, JSON.stringify(logData, null, 2));

  return {
    message: 'JSON backup restored',
    log: logContent,
  };
}

/** Lists all JSON backup files in the PostgreSQL backups directory. */
export async function listJsonBackups(): Promise<string[]> {
  await ensurePgBackupsDir();
  const files = await fs.readdir(pgBackupsDir);
  return files
    .filter((f: string) => f.endsWith('.json.gz'))
    .sort()
    .reverse();
}
