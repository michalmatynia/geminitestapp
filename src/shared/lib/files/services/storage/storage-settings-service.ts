/**
 * File Storage Settings Service
 * 
 * Logic for resolving and caching file storage configurations.
 */

import 'server-only';
import { type MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { FastCometStorageConfig, FileStorageSource } from '@/shared/lib/files/constants';
import {
  FILE_STORAGE_SOURCE_SETTING_KEY,
  FASTCOMET_STORAGE_CONFIG_SETTING_KEY,
  fileStorageSourceValues,
} from '@/shared/lib/files/constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { resolveFastCometConfig } from './fastcomet-storage-config';

export type FileStorageSettings = {
  source: FileStorageSource;
  fastComet: FastCometStorageConfig;
};

const SETTINGS_COLLECTION = 'settings';

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const isFileStorageSource = (value: string): value is FileStorageSource =>
  (fileStorageSourceValues as readonly string[]).includes(value);

const parseFileStorageSource = (raw: string | null): FileStorageSource | null => {
  const normalized = normalizeString(raw);
  if (normalized.length === 0) return null;
  return isFileStorageSource(normalized) ? normalized : null;
};

const readMongoSettingValue = async (key: string): Promise<string | null> => {
  try {
    const mongo = await getMongoDb();
    const record = await mongo.collection<MongoStringSettingRecord>(SETTINGS_COLLECTION).findOne({
      $or: [{ key }, { _id: key }],
    });
    return typeof record?.value === 'string' ? record.value : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

/**
 * Reads file storage settings from the database or environment variables.
 */
export const readFileStorageSettings = async (): Promise<FileStorageSettings> => {
  const sourceRaw = await readMongoSettingValue(FILE_STORAGE_SOURCE_SETTING_KEY);
  const source =
    parseFileStorageSource(sourceRaw) ??
    parseFileStorageSource(process.env['FILE_STORAGE_SOURCE'] ?? null) ??
    'local';

  const fastCometRaw = await readMongoSettingValue(FASTCOMET_STORAGE_CONFIG_SETTING_KEY);
  const fastComet = resolveFastCometConfig(fastCometRaw);

  return { source, fastComet };
};
