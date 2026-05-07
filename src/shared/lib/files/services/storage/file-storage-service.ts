import 'server-only';

import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { FastCometStorageConfig, FileStorageSource } from '@/shared/lib/files/constants';
import {
  FILE_STORAGE_SOURCE_SETTING_KEY,
  FASTCOMET_STORAGE_CONFIG_SETTING_KEY,
  fileStorageSourceValues,
} from '@/shared/lib/files/constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  deleteFromFastComet,
  isHttpFilepath as isFastCometHttpFilepath,
  resolveFastCometConfig,
  toAbsoluteUrl as toFastCometAbsoluteUrl,
  uploadToFastComet,
} from './fastcomet-storage-client';

const SETTINGS_COLLECTION = 'settings';
const CACHE_TTL_MS = 5_000;

type FileStorageSettings = {
  source: FileStorageSource;
  fastComet: FastCometStorageConfig;
};

type CacheState = {
  expiresAt: number;
  value: FileStorageSettings;
};

let settingsCache: CacheState | null = null;

export const isHttpFilepath = isFastCometHttpFilepath;
export const toAbsoluteUrl = toFastCometAbsoluteUrl;

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

const readSettingValue = async (key: string): Promise<string | null> => readMongoSettingValue(key);

export const getPublicPathFromStoredPath = (filepath: string): string | null => {
  const trimmed = filepath.trim();
  if (trimmed.length === 0) return null;

  if (isHttpFilepath(trimmed)) {
    try {
      const url = new URL(trimmed);
      const pathname = decodeURIComponent(url.pathname.length > 0 ? url.pathname : '/').trim();
      return pathname.startsWith('/') ? pathname : `/${pathname}`;
    } catch (error) {
      void ErrorSystem.captureException(error);
      return null;
    }
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return normalized;
};

export const resolveAppBaseUrl = (): string =>
  process.env['NEXT_PUBLIC_APP_URL']?.trim() ??
  process.env['NEXTAUTH_URL']?.trim() ??
  'http://localhost:3000';

const readFileStorageSettings = async (): Promise<FileStorageSettings> => {
  const sourceRaw = await readSettingValue(FILE_STORAGE_SOURCE_SETTING_KEY);
  const source =
    parseFileStorageSource(sourceRaw) ??
    parseFileStorageSource(process.env['FILE_STORAGE_SOURCE'] ?? null) ??
    'local';

  const fastCometRaw = await readSettingValue(FASTCOMET_STORAGE_CONFIG_SETTING_KEY);
  const fastComet = resolveFastCometConfig(fastCometRaw);

  return {
    source,
    fastComet,
  };
};

export const getFileStorageSettings = async (options?: {
  force?: boolean;
}): Promise<FileStorageSettings> => {
  const now = Date.now();
  const cached = settingsCache;
  if (options?.force !== true && cached !== null && cached.expiresAt > now) {
    return cached.value;
  }

  return readFileStorageSettings().then((settings) => {
    settingsCache = {
      value: settings,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return settings;
  });
};

export const invalidateFileStorageSettingsCache = (): void => {
  settingsCache = null;
};

export const uploadToConfiguredStorage = async (params: {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  publicPath: string;
  category: string | null;
  projectId: string | null;
  folder: string | null;
  writeLocalCopy: () => Promise<void>;
}): Promise<{ filepath: string; source: FileStorageSource; mirroredLocally: boolean }> => {
  const settings = await getFileStorageSettings();

  if (settings.source === 'local') {
    await params.writeLocalCopy();
    return {
      filepath: params.publicPath,
      source: 'local',
      mirroredLocally: true,
    };
  }

  const shouldMirrorLocal = settings.fastComet.keepLocalCopy;
  if (shouldMirrorLocal) {
    await params.writeLocalCopy();
  }

  const remotePath = await uploadToFastComet({
    buffer: params.buffer,
    filename: params.filename,
    mimetype: params.mimetype,
    publicPath: params.publicPath,
    category: params.category,
    projectId: params.projectId,
    folder: params.folder,
    fastComet: settings.fastComet,
  });

  return {
    filepath: remotePath,
    source: 'fastcomet',
    mirroredLocally: shouldMirrorLocal,
  };
};

export const uploadBufferToFastComet = async (params: {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  publicPath: string;
  category?: string | null;
  projectId?: string | null;
  folder?: string | null;
  fastComet?: FastCometStorageConfig;
}): Promise<string> => {
  const config = params.fastComet ?? (await getFileStorageSettings()).fastComet;
  return await uploadToFastComet({
    buffer: params.buffer,
    filename: params.filename,
    mimetype: params.mimetype,
    publicPath: params.publicPath,
    category: params.category ?? null,
    projectId: params.projectId ?? null,
    folder: params.folder ?? null,
    fastComet: config,
  });
};

export const deleteFromConfiguredStorage = async (params: {
  filepath: string;
  deleteLocalCopy: (publicPath: string | null) => Promise<void>;
}): Promise<void> => {
  const settings = await getFileStorageSettings();
  const publicPath = getPublicPathFromStoredPath(params.filepath);

  // Local cleanup should always run first to keep disk usage under control.
  await params.deleteLocalCopy(publicPath);

  const shouldDeleteRemote = settings.source === 'fastcomet' || isHttpFilepath(params.filepath);

  if (!shouldDeleteRemote) return;

  try {
    await deleteFromFastComet({
      filepath: params.filepath,
      publicPath,
      fastComet: settings.fastComet,
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.logWarning('FastComet delete failed; continuing.', {
      service: 'file-storage-service',
      filepath: params.filepath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
