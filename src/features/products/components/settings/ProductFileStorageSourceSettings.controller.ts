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
  'baseUrl' | 'uploadEndpoint' | 'keepLocalCopy'
>;

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
    keepLocalCopy: typeof parsed.keepLocalCopy === 'boolean' ? parsed.keepLocalCopy : true,
  };
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
  const isFastCometMisconfigured =
    source === 'fastcomet' && fastCometStatus.baseUrl.length === 0;
  const controlsDisabled = settingsLoading || updateSetting.isPending;
  const saveDisabled = isDirty === false || controlsDisabled || isFastCometMisconfigured;

  const handleSave = async (): Promise<void> => {
    try {
      const nextSource = source;
      await updateSetting.mutateAsync({
        key: FILE_STORAGE_SOURCE_SETTING_KEY,
        value: nextSource,
      });
      setLastSavedSource(nextSource);
      refetchSettings();
      toast('Product file source saved.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'ProductFileStorageSourceSettings',
        action: 'handleSave',
      });
      const message =
        error instanceof Error ? error.message : 'Failed to save product file source.';
      toast(message, { variant: 'error' });
    }
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
