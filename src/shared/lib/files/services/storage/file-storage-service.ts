import 'server-only';
import { type FileStorageSettings, readFileStorageSettings } from './storage-settings-service';
import {
  deleteFromFastComet,
  isHttpFilepath as isFastCometHttpFilepath,
  toAbsoluteUrl as toFastCometAbsoluteUrl,
  uploadToFastComet,
} from './fastcomet-storage-client';
import type { FastCometStorageConfig, FileStorageSource } from '@/shared/lib/files/constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const CACHE_TTL_MS = 5_000;
let settingsCache: { expiresAt: number, value: FileStorageSettings } | null = null;

export const isHttpFilepath = isFastCometHttpFilepath;
export const toAbsoluteUrl = toFastCometAbsoluteUrl;

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
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

export const resolveAppBaseUrl = (): string =>
  process.env['NEXT_PUBLIC_APP_URL']?.trim() ??
  process.env['NEXTAUTH_URL']?.trim() ??
  'http://localhost:3000';

export const getFileStorageSettings = async (options?: {
  force?: boolean;
}): Promise<FileStorageSettings> => {
  const now = Date.now();
  if (options?.force !== true && settingsCache && settingsCache.expiresAt > now) {
    return settingsCache.value;
  }

  const value = await readFileStorageSettings();
  settingsCache = { expiresAt: Date.now() + CACHE_TTL_MS, value };
  return value;
};

export const invalidateFileStorageSettingsCache = (): void => {
  settingsCache = null;
};

import { externalServiceError, internalError } from '@/shared/errors/app-error';
// ...
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
    try {
      await params.writeLocalCopy();
    } catch (error) {
      throw internalError('Failed to write local file copy', {
        filepath: params.publicPath,
        cause: error,
      });
    }
    return {
      filepath: params.publicPath,
      source: 'local',
      mirroredLocally: true,
    };
  }

  const shouldMirrorLocal = settings.fastComet.keepLocalCopy;
  if (shouldMirrorLocal) {
    try {
      await params.writeLocalCopy();
    } catch (error) {
      throw internalError('Failed to write local file copy during remote mirror', {
        filepath: params.publicPath,
        cause: error,
      });
    }
  }

  try {
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
  } catch (error) {
    throw externalServiceError('Failed to upload file to remote storage (FastComet)', {
      filename: params.filename,
      publicPath: params.publicPath,
      projectId: params.projectId,
      cause: error,
    });
  }
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
