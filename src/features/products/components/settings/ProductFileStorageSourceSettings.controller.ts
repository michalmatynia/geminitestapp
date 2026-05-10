'use client';

import { useEffect, useMemo, useState } from 'react';

import { useLiteSettingsMap, useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  DEFAULT_FASTCOMET_STORAGE_BASE_URL,
  DEFAULT_FASTCOMET_STORAGE_UPLOAD_PATH,
  FASTCOMET_STORAGE_CONFIG_SETTING_KEY,
  FILE_STORAGE_SOURCE_SETTING_KEY,
  type FastCometStorageConfig,
  type FileStorageSource,
} from '@/shared/lib/files/constants';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export type FastCometStorageStatus = Pick<
  FastCometStorageConfig,
  'baseUrl' | 'uploadEndpoint' | 'keepLocalCopy' | 'port' | 'server' | 'username'
> & {
  tokenConfigured: boolean;
};

export type ProductFileStorageSourceController = {
  controlsDisabled: boolean;
  fastCometStatus: FastCometStorageStatus;
  handleReset: () => void;
  handleSave: () => Promise<void>;
  isFastCometMisconfigured: boolean;
  isSaving: boolean;
  saveDisabled: boolean;
  setSource: (source: FileStorageSource) => void;
  source: FileStorageSource;
};

type ProductFileStorageSettingsState = {
  fastCometStatus: FastCometStorageStatus;
  refetchSettings: () => void;
  settingsLoading: boolean;
  storedSource: FileStorageSource;
};

export const normalizeSource = (value: string | null | undefined): FileStorageSource =>
  value === 'fastcomet' ? 'fastcomet' : 'local';

const LEGACY_FASTCOMET_HOSTS = new Set(['qubrick.io', 'www.qubrick.io']);

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeFastCometUrl = (value: unknown): string => {
  const raw = normalizeString(value);
  if (raw.length === 0) return '';
  try {
    const url = new URL(raw);
    if (LEGACY_FASTCOMET_HOSTS.has(url.hostname.toLowerCase())) {
      const currentUrl = new URL(DEFAULT_FASTCOMET_STORAGE_BASE_URL);
      url.protocol = currentUrl.protocol;
      url.hostname = currentUrl.hostname;
      url.port = currentUrl.port;
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return raw;
  }
};

const resolveDefaultUploadEndpoint = (baseUrl: string): string => {
  if (baseUrl.trim().length === 0) return '';
  try {
    return new URL(DEFAULT_FASTCOMET_STORAGE_UPLOAD_PATH, `${baseUrl}/`)
      .toString()
      .replace(/\/$/, '');
  } catch {
    return '';
  }
};

const normalizeOptionalString = (value: unknown): string | null => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
};

const normalizePort = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const port = Math.floor(parsed);
  return port >= 1 && port <= 65_535 ? port : null;
};

const resolveUrlPort = (value: string): number | null => {
  try {
    const url = new URL(value);
    if (url.port.trim().length > 0) return normalizePort(url.port);
    return url.protocol === 'http:' ? 80 : 443;
  } catch {
    return null;
  }
};

const resolveUrlHostname = (value: string): string | null => {
  try {
    const hostname = new URL(value).hostname.trim();
    return hostname.length > 0 ? hostname : null;
  } catch {
    return null;
  }
};

const resolveFastCometStatusServer = (
  parsed: Partial<FastCometStorageConfig>,
  baseUrl: string,
  uploadEndpoint: string
): string | null =>
  normalizeOptionalString(parsed.server) ??
  resolveUrlHostname(uploadEndpoint) ??
  resolveUrlHostname(baseUrl);

const resolveFastCometStatusPort = (
  parsed: Partial<FastCometStorageConfig>,
  baseUrl: string,
  uploadEndpoint: string
): number | null =>
  normalizePort(parsed.port) ?? resolveUrlPort(uploadEndpoint) ?? resolveUrlPort(baseUrl);

const hasFastCometStatusToken = (parsed: Partial<FastCometStorageConfig>): boolean =>
  normalizeOptionalString(parsed.token) !== null ||
  normalizeOptionalString(parsed.authToken) !== null;

const readFastCometStorageStatus = (
  raw: string | null | undefined
): FastCometStorageStatus => {
  const parsed = parseJsonSetting<Partial<FastCometStorageConfig> | null>(raw, null) ?? {};
  const parsedBaseUrl = normalizeFastCometUrl(parsed.baseUrl);
  const baseUrl =
    parsedBaseUrl.length > 0 ? parsedBaseUrl : DEFAULT_FASTCOMET_STORAGE_BASE_URL;
  const parsedUploadEndpoint = normalizeFastCometUrl(parsed.uploadEndpoint);
  const uploadEndpoint =
    parsedUploadEndpoint.length > 0 ? parsedUploadEndpoint : resolveDefaultUploadEndpoint(baseUrl);

  return {
    baseUrl,
    uploadEndpoint,
    server: resolveFastCometStatusServer(parsed, baseUrl, uploadEndpoint),
    port: resolveFastCometStatusPort(parsed, baseUrl, uploadEndpoint),
    username: normalizeOptionalString(parsed.username),
    tokenConfigured: hasFastCometStatusToken(parsed),
    keepLocalCopy: typeof parsed.keepLocalCopy === 'boolean' ? parsed.keepLocalCopy : true,
  };
};

const hasFastCometStatusTarget = (status: FastCometStorageStatus): boolean =>
  status.baseUrl.length > 0 &&
  status.uploadEndpoint.length > 0 &&
  status.server !== null &&
  status.server !== undefined &&
  status.port !== null &&
  status.port !== undefined;

const hasFastCometStatusCredentials = (status: FastCometStorageStatus): boolean =>
  status.username !== null &&
  status.username !== undefined &&
  status.tokenConfigured;

const isFastCometStatusConfigured = (status: FastCometStorageStatus): boolean =>
  hasFastCometStatusTarget(status) && hasFastCometStatusCredentials(status);

const isFastCometSourceMisconfigured = (
  source: FileStorageSource,
  status: FastCometStorageStatus
): boolean => source === 'fastcomet' && isFastCometStatusConfigured(status) === false;

const saveProductFileStorageSource = async (input: {
  nextSource: FileStorageSource;
  refetchSettings: () => void;
  setLastSavedSource: (source: FileStorageSource) => void;
  toast: ReturnType<typeof useToast>['toast'];
  updateSetting: ReturnType<typeof useUpdateSetting>;
}): Promise<void> => {
  try {
    await input.updateSetting.mutateAsync({
      key: FILE_STORAGE_SOURCE_SETTING_KEY,
      value: input.nextSource,
    });
    input.setLastSavedSource(input.nextSource);
    input.refetchSettings();
    input.toast('Product file source saved.', { variant: 'success' });
  } catch (error) {
    logClientCatch(error, {
      source: 'ProductFileStorageSourceSettings',
      action: 'handleSave',
    });
    const message = error instanceof Error ? error.message : 'Failed to save product file source.';
    input.toast(message, { variant: 'error' });
  }
};

function useProductFileStorageSettingsState(): ProductFileStorageSettingsState {
  const liteSettingsQuery = useLiteSettingsMap();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const storedSource = useMemo(
    () =>
      normalizeSource(
        liteSettingsQuery.data?.get(FILE_STORAGE_SOURCE_SETTING_KEY) ??
          settingsQuery.data?.get(FILE_STORAGE_SOURCE_SETTING_KEY)
      ),
    [liteSettingsQuery.data, settingsQuery.data]
  );

  const fastCometStatus = useMemo(
    () => readFastCometStorageStatus(settingsQuery.data?.get(FASTCOMET_STORAGE_CONFIG_SETTING_KEY)),
    [settingsQuery.data]
  );
  const refetchSettings = (): void => {
    void liteSettingsQuery.refetch();
    void settingsQuery.refetch();
  };

  return {
    fastCometStatus,
    refetchSettings,
    settingsLoading: liteSettingsQuery.isLoading || settingsQuery.isLoading,
    storedSource,
  };
}

export function useProductFileStorageSourceController(): ProductFileStorageSourceController {
  const { toast } = useToast();
  const { fastCometStatus, refetchSettings, settingsLoading, storedSource } =
    useProductFileStorageSettingsState();
  const updateSetting = useUpdateSetting();

  const [source, setSource] = useState<FileStorageSource>(storedSource);
  const [lastSavedSource, setLastSavedSource] = useState<FileStorageSource | null>(null);

  useEffect(() => {
    setSource(storedSource);
    setLastSavedSource(null);
  }, [storedSource]);

  const persistedSource = lastSavedSource ?? storedSource;
  const isDirty = source !== persistedSource;
  const isFastCometMisconfigured = isFastCometSourceMisconfigured(source, fastCometStatus);
  const controlsDisabled = settingsLoading || updateSetting.isPending;
  const saveDisabled = isDirty === false || controlsDisabled || isFastCometMisconfigured;

  const handleSave = async (): Promise<void> => {
    await saveProductFileStorageSource({
      nextSource: source,
      refetchSettings,
      setLastSavedSource,
      toast,
      updateSetting,
    });
  };

  const handleReset = (): void => {
    setSource(storedSource);
    setLastSavedSource(null);
  };

  return {
    controlsDisabled,
    fastCometStatus,
    handleReset,
    handleSave,
    isFastCometMisconfigured,
    isSaving: updateSetting.isPending,
    saveDisabled,
    setSource,
    source,
  };
}
