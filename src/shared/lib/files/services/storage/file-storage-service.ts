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
import { parseJsonSetting } from '@/shared/utils/settings-json';

const SETTINGS_COLLECTION = 'settings';
const DEFAULT_TIMEOUT_MS = 20_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;
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

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeNullableString = (value: unknown): string | null => {
  const trimmed = normalizeString(value);
  return trimmed.length > 0 ? trimmed : null;
};

const clampTimeout = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS;
  const int = Math.floor(parsed);
  return Math.min(Math.max(int, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
};

const normalizeUrl = (value: unknown): string => {
  const trimmed = normalizeString(value);
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    return url.toString().replace(/\/$/, '');
  } catch (error) {
    void ErrorSystem.captureException(error);
    return '';
  }
};

const normalizeOptionalUrl = (value: unknown): string | null => {
  const normalized = normalizeUrl(value);
  return normalized || null;
};

const parseBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const isFileStorageSource = (value: string): value is FileStorageSource =>
  (fileStorageSourceValues as readonly string[]).includes(value);

const parseFileStorageSource = (raw: string | null): FileStorageSource | null => {
  const normalized = normalizeString(raw);
  if (!normalized) return null;
  return isFileStorageSource(normalized) ? normalized : null;
};

const readMongoSettingValue = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
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

const resolveFastCometConfig = (raw: string | null): FastCometStorageConfig => {
  const stored = parseJsonSetting<Partial<FastCometStorageConfig> | null>(raw, null) ?? {};

  return {
    baseUrl: normalizeUrl(stored.baseUrl ?? process.env['FASTCOMET_STORAGE_BASE_URL']),
    uploadEndpoint: normalizeUrl(
      stored.uploadEndpoint ?? process.env['FASTCOMET_STORAGE_UPLOAD_URL']
    ),
    deleteEndpoint: normalizeOptionalUrl(
      stored.deleteEndpoint ?? process.env['FASTCOMET_STORAGE_DELETE_URL']
    ),
    authToken: normalizeNullableString(
      stored.authToken ?? process.env['FASTCOMET_STORAGE_AUTH_TOKEN']
    ),
    keepLocalCopy: parseBoolean(
      stored.keepLocalCopy ?? process.env['FASTCOMET_STORAGE_KEEP_LOCAL_COPY'],
      true
    ),
    timeoutMs: clampTimeout(stored.timeoutMs ?? process.env['FASTCOMET_STORAGE_TIMEOUT_MS']),
  };
};

export const isHttpFilepath = (filepath: string): boolean => /^https?:\/\//i.test(filepath.trim());

export const getPublicPathFromStoredPath = (filepath: string): string | null => {
  const trimmed = filepath.trim();
  if (!trimmed) return null;

  if (isHttpFilepath(trimmed)) {
    try {
      const url = new URL(trimmed);
      const pathname = decodeURIComponent(url.pathname || '/').trim();
      return pathname.startsWith('/') ? pathname : `/${pathname}`;
    } catch (error) {
      void ErrorSystem.captureException(error);
      return null;
    }
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return normalized;
};

const toAbsoluteUrl = (value: string, baseUrl: string): string => {
  if (isHttpFilepath(value)) return value;
  if (!baseUrl) return value;
  try {
    return new URL(value.startsWith('/') ? value : `/${value}`, `${baseUrl}/`).toString();
  } catch (error) {
    void ErrorSystem.captureException(error);
    return value;
  }
};

const withTimeout = async <T>(
  timeoutMs: number,
  task: (signal: AbortSignal) => Promise<T>
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
};

const resolveUploadResponsePath = (
  responseBody: unknown,
  fastComet: FastCometStorageConfig,
  publicPath: string
): string => {
  if (responseBody && typeof responseBody === 'object') {
    const payload = responseBody as Record<string, unknown>;
    const candidates = [
      payload['url'],
      payload['publicUrl'],
      payload['filepath'],
      payload['fileUrl'],
      payload['path'],
      payload['location'],
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return toAbsoluteUrl(candidate.trim(), fastComet.baseUrl);
      }
    }
  }

  if (fastComet.baseUrl) {
    return toAbsoluteUrl(publicPath, fastComet.baseUrl);
  }

  throw new Error(
    'FastComet upload succeeded but no file URL was returned. Provide baseUrl or return url/filepath in the response.'
  );
};

const uploadToFastComet = async (params: {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  publicPath: string;
  category: string | null;
  projectId: string | null;
  folder: string | null;
  fastComet: FastCometStorageConfig;
}): Promise<string> => {
  const { fastComet } = params;
  if (!fastComet.uploadEndpoint) {
    throw new Error(
      'FastComet storage is enabled but uploadEndpoint is empty. Configure fastcomet_storage_config_v1.'
    );
  }

  const form = new FormData();
  form.append(
    'file',
    new Blob([new Uint8Array(params.buffer)], {
      type: params.mimetype || 'application/octet-stream',
    }),
    params.filename
  );
  form.append('filename', params.filename);
  form.append('publicPath', params.publicPath);
  if (params.category) form.append('category', params.category);
  if (params.projectId) form.append('projectId', params.projectId);
  if (params.folder) form.append('folder', params.folder);

  const headers = new Headers();
  if (fastComet.authToken) {
    headers.set('Authorization', `Bearer ${fastComet.authToken}`);
  }

  const response = await withTimeout(fastComet.timeoutMs, async (signal: AbortSignal) =>
    fetch(fastComet.uploadEndpoint, {
      method: 'POST',
      headers,
      body: form,
      signal,
      cache: 'no-store',
    })
  );

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(
      `FastComet upload failed (${response.status}). ${bodyText.slice(0, 200)}`.trim()
    );
  }

  const responseBody: unknown = await response.json().catch(() => null);

  return resolveUploadResponsePath(responseBody, fastComet, params.publicPath);
};

const deleteFromFastComet = async (params: {
  filepath: string;
  publicPath: string | null;
  fastComet: FastCometStorageConfig;
}): Promise<void> => {
  const endpoint = params.fastComet.deleteEndpoint;
  if (!endpoint) return;

  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  if (params.fastComet.authToken) {
    headers.set('Authorization', `Bearer ${params.fastComet.authToken}`);
  }

  const response = await withTimeout(params.fastComet.timeoutMs, async (signal: AbortSignal) =>
    fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filepath: params.filepath,
        publicPath: params.publicPath,
      }),
      signal,
      cache: 'no-store',
    })
  );

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(
      `FastComet delete failed (${response.status}). ${bodyText.slice(0, 200)}`.trim()
    );
  }
};

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
  if (!options?.force && settingsCache && settingsCache.expiresAt > now) {
    return settingsCache.value;
  }

  const settings = await readFileStorageSettings();
  settingsCache = {
    value: settings,
    expiresAt: now + CACHE_TTL_MS,
  };
  return settings;
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
