import 'server-only';
import { externalServiceError, internalError } from '@/shared/errors/app-error';
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

const refreshFileStorageSettings = (): Promise<FileStorageSettings> =>
  readFileStorageSettings().then((value) => {
    settingsCache = { expiresAt: Date.now() + CACHE_TTL_MS, value };
    return value;
  });

export const getFileStorageSettings = async (options?: {
  force?: boolean;
}): Promise<FileStorageSettings> => {
  const now = Date.now();
  if (options?.force !== true && settingsCache && settingsCache.expiresAt > now) {
    return settingsCache.value;
  }

  return await refreshFileStorageSettings();
};

export const invalidateFileStorageSettingsCache = (): void => {
  settingsCache = null;
};

type ConfiguredStorageUploadParams = {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  publicPath: string;
  category: string | null;
  projectId: string | null;
  folder: string | null;
  forceSource?: FileStorageSource | null;
  fastCometBaseUrl?: string | null;
  fastCometConfig?: FastCometStorageOverrides | null;
  writeLocalCopy: () => Promise<void>;
};

export type FastCometStorageOverrides = Partial<
  Pick<
    FastCometStorageConfig,
    'baseUrl' | 'uploadEndpoint' | 'deleteEndpoint' | 'server' | 'port' | 'resolveIp'
  >
>;

type ConfiguredStorageUploadResult = {
  filepath: string;
  source: FileStorageSource;
  mirroredLocally: boolean;
};

const writeLocalUpload = async (
  params: ConfiguredStorageUploadParams
): Promise<ConfiguredStorageUploadResult> => {
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
};

const writeFastCometLocalMirror = async (
  params: ConfiguredStorageUploadParams,
  shouldMirrorLocal: boolean
): Promise<void> => {
  if (!shouldMirrorLocal) return;
  try {
    await params.writeLocalCopy();
  } catch (error) {
    throw internalError('Failed to write local file copy during remote mirror', {
      filepath: params.publicPath,
      cause: error,
    });
  }
};

const uploadFastCometConfiguredStorage = async (
  params: ConfiguredStorageUploadParams,
  settings: FileStorageSettings,
  mirroredLocally: boolean
): Promise<ConfiguredStorageUploadResult> => {
  const fastComet = applyFastCometUploadOverrides(settings.fastComet, {
    baseUrl: params.fastCometBaseUrl,
    overrides: params.fastCometConfig,
  });
  try {
    const remotePath = await uploadToFastComet({
      buffer: params.buffer,
      filename: params.filename,
      mimetype: params.mimetype,
      publicPath: params.publicPath,
      category: params.category,
      projectId: params.projectId,
      folder: params.folder,
      fastComet,
    });
    return {
      filepath: remotePath,
      source: 'fastcomet',
      mirroredLocally,
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

const normalizeOverrideUrl = (value: string): string => value.trim().replace(/\/$/, '');

const applyLegacyFastCometBaseUrlOverride = (
  baseConfig: FastCometStorageConfig,
  baseUrl?: string | null
): FastCometStorageConfig => {
  const fastCometBaseUrl = baseUrl?.trim() ?? '';
  if (fastCometBaseUrl.length === 0) return baseConfig;
  return { ...baseConfig, baseUrl: normalizeOverrideUrl(fastCometBaseUrl) };
};

const readFastCometStringUrlOverride = (value: string | undefined): string | undefined =>
  value === undefined ? undefined : normalizeOverrideUrl(value);

const readFastCometDeleteEndpointOverride = (value: string | null | undefined): string | null | undefined =>
  value === undefined || value === null ? value : normalizeOverrideUrl(value);

const buildFastCometUrlOverrides = (
  overrides: FastCometStorageOverrides
): FastCometStorageOverrides => {
  const baseUrl = readFastCometStringUrlOverride(overrides.baseUrl);
  const uploadEndpoint = readFastCometStringUrlOverride(overrides.uploadEndpoint);
  const deleteEndpoint = readFastCometDeleteEndpointOverride(overrides.deleteEndpoint);
  return {
    ...(baseUrl !== undefined ? { baseUrl } : {}),
    ...(uploadEndpoint !== undefined ? { uploadEndpoint } : {}),
    ...(deleteEndpoint !== undefined ? { deleteEndpoint } : {}),
  };
};

const buildFastCometConnectionOverrides = (
  overrides: FastCometStorageOverrides
): FastCometStorageOverrides => ({
  ...(overrides.server !== undefined ? { server: overrides.server } : {}),
  ...(overrides.port !== undefined ? { port: overrides.port } : {}),
  ...(overrides.resolveIp !== undefined ? { resolveIp: overrides.resolveIp } : {}),
});

const applyFastCometUploadOverrides = (
  baseConfig: FastCometStorageConfig,
  input: {
    baseUrl?: string | null;
    overrides?: FastCometStorageOverrides | null;
  }
): FastCometStorageConfig => {
  const next = applyLegacyFastCometBaseUrlOverride(baseConfig, input.baseUrl);

  const overrides = input.overrides ?? null;
  if (overrides === null) return next;

  return {
    ...next,
    ...buildFastCometUrlOverrides(overrides),
    ...buildFastCometConnectionOverrides(overrides),
  };
};

export const uploadToConfiguredStorage = async (
  params: ConfiguredStorageUploadParams
): Promise<ConfiguredStorageUploadResult> => {
  const settings = await getFileStorageSettings();
  const source = params.forceSource ?? settings.source;
  if (source === 'local') return await writeLocalUpload(params);

  const shouldMirrorLocal = settings.fastComet.keepLocalCopy;
  await writeFastCometLocalMirror(params, shouldMirrorLocal);
  return await uploadFastCometConfiguredStorage(params, settings, shouldMirrorLocal);
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
      publicPath,
    });
  }
};
