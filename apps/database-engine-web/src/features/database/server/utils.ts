import 'server-only';

import type { Collection, Db } from 'mongodb';

import { createManagedMongoClient } from '@/shared/lib/db/services/managed-mongo-databases';
import {
  getMongoConnectionUrl,
  getMongoDatabaseName,
} from '@/shared/lib/db/utils/mongo';

export { createManagedMongoClient };

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const getDatabaseSizeFormatted = async (db: Db): Promise<string> => {
  const stats = (await db.command({ dbStats: 1 })) as { totalSize: number };
  return formatSize(stats.totalSize);
};

export const getCollectionSizeFormatted = async (db: Db, name: string): Promise<string> => {
  const stats = (await db.command({ collStats: name })) as { totalSize: number };
  return formatSize(stats.totalSize);
};

export const getCollectionIndexes = async (
  coll: Collection
): Promise<Record<string, unknown>[]> => {
  return coll.indexes() as Promise<Record<string, unknown>[]>;
};

export const resolvePreviewTarget = (
  _previewMode: 'backup' | 'current',
  _backupName: string
): { mongoUri: string; sourceDbName: string } => ({
  mongoUri: getMongoConnectionUrl(),
  sourceDbName: getMongoDatabaseName(),
});
