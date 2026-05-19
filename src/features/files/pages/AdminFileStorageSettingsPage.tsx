'use client';

import { useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import {
  ASSETS3D_STORAGE_SOURCE_SETTING_KEY,
  DEFAULT_FASTCOMET_STORAGE_BASE_URL,
  DEFAULT_FASTCOMET_STORAGE_PORT,
  DEFAULT_FASTCOMET_STORAGE_RESOLVE_IP,
  DEFAULT_FASTCOMET_STORAGE_SERVER,
  DEFAULT_FASTCOMET_STORAGE_UPLOAD_PATH,
  FASTCOMET_STORAGE_CONFIG_SETTING_KEY,
  FILE_STORAGE_SOURCE_SETTING_KEY,
} from '@/shared/lib/files/constants';
import type { FastCometStorageConfig, FileStorageSource } from '@/shared/lib/files/constants';
import { AdminSettingsPageLayout } from '@/shared/ui/admin.public';
import { Alert, useToast } from '@/shared/ui/primitives.public';
import { FormActions } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import { StorageSourceSection } from '../components/settings/StorageSourceSection';
import { FastCometConfigSection } from '../components/settings/FastCometConfigSection';

const LEGACY_FASTCOMET_HOSTS = new Set(['qubrick.io', 'www.qubrick.io']);

const normalizeSource = (value: string | null | undefined): FileStorageSource =>
  value === 'fastcomet' ? 'fastcomet' : 'local';

const normalizeConfigString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const normalizeFastCometUrl = (value: unknown): string => {
  const raw = normalizeConfigString(value).trim();
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

const isDefaultFastCometBaseUrl = (baseUrl: string): boolean => {
  try {
    return new URL(baseUrl).hostname === new URL(DEFAULT_FASTCOMET_STORAGE_BASE_URL).hostname;
  } catch {
    return false;
  }
};

const normalizeOptionalConfigString = (value: unknown): string | null => {
  const normalized = normalizeConfigString(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizePort = (value: unknown, fallback: number | null): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const port = Math.floor(parsed);
  return port >= 1 && port <= 65_535 ? port : fallback;
};

const resolveUrlHostname = (value: string): string | null => {
  try {
    const hostname = new URL(value).hostname.trim();
    return hostname.length > 0 ? hostname : null;
  } catch {
    return null;
  }
};

const resolveUrlPort = (value: string): number | null => {
  try {
    const url = new URL(value);
    if (url.port.trim().length > 0) return normalizePort(url.port, null);
    return url.protocol === 'http:' ? 80 : DEFAULT_FASTCOMET_STORAGE_PORT;
  } catch {
    return null;
  }
};

const normalizeFastCometToken = (config: Partial<FastCometStorageConfig>): string | null =>
  normalizeOptionalConfigString(config.token) ?? normalizeOptionalConfigString(config.authToken);

const resolveFastCometServer = (
  value: unknown,
  baseUrl: string,
  uploadEndpoint: string
): string | null =>
  normalizeOptionalConfigString(value) ??
  resolveUrlHostname(uploadEndpoint) ??
  resolveUrlHostname(baseUrl) ??
  DEFAULT_FASTCOMET_STORAGE_SERVER;

const resolveFastCometPort = (
  value: unknown,
  baseUrl: string,
  uploadEndpoint: string
): number | null =>
  normalizePort(
    value,
    resolveUrlPort(uploadEndpoint) ?? resolveUrlPort(baseUrl) ?? DEFAULT_FASTCOMET_STORAGE_PORT
  );

const normalizeResolveIp = (value: unknown, baseUrl: string): string | null =>
  normalizeOptionalConfigString(value) ??
  (isDefaultFastCometBaseUrl(baseUrl) ? DEFAULT_FASTCOMET_STORAGE_RESOLVE_IP : null);

const normalizeTimeoutMs = (value: unknown): number => {
  const timeoutRaw = Number(value);
  return Number.isFinite(timeoutRaw)
    ? Math.min(Math.max(Math.floor(timeoutRaw), 1_000), 120_000)
    : 20_000;
};

const normalizeFastCometConfig = (raw: string | null | undefined): FastCometStorageConfig => {
  const parsed = parseJsonSetting<Partial<FastCometStorageConfig> | null>(raw, null) ?? {};
  const parsedBaseUrl = normalizeFastCometUrl(parsed.baseUrl);
  const baseUrl =
    parsedBaseUrl.length > 0 ? parsedBaseUrl : DEFAULT_FASTCOMET_STORAGE_BASE_URL;
  const parsedUploadEndpoint = normalizeFastCometUrl(parsed.uploadEndpoint);
  const uploadEndpoint =
    parsedUploadEndpoint.length > 0 ? parsedUploadEndpoint : resolveDefaultUploadEndpoint(baseUrl);
  const token = normalizeFastCometToken(parsed);

  return {
    baseUrl,
    uploadEndpoint,
    deleteEndpoint: normalizeOptionalConfigString(normalizeFastCometUrl(parsed.deleteEndpoint)),
    server: resolveFastCometServer(parsed.server, baseUrl, uploadEndpoint),
    port: resolveFastCometPort(parsed.port, baseUrl, uploadEndpoint),
    username: normalizeOptionalConfigString(parsed.username),
    token,
    authToken: token,
    keepLocalCopy: typeof parsed.keepLocalCopy === 'boolean' ? parsed.keepLocalCopy : true,
    timeoutMs: normalizeTimeoutMs(parsed.timeoutMs),
    resolveIp: normalizeResolveIp(parsed.resolveIp, baseUrl),
  };
};

const normalizeConfigForSave = (config: FastCometStorageConfig): FastCometStorageConfig => {
  const parsedBaseUrl = normalizeFastCometUrl(config.baseUrl);
  const baseUrl =
    parsedBaseUrl.length > 0 ? parsedBaseUrl : DEFAULT_FASTCOMET_STORAGE_BASE_URL;
  const parsedUploadEndpoint = normalizeFastCometUrl(config.uploadEndpoint);
  const uploadEndpoint =
    parsedUploadEndpoint.length > 0 ? parsedUploadEndpoint : resolveDefaultUploadEndpoint(baseUrl);
  const token = normalizeFastCometToken(config);

  return {
    baseUrl,
    uploadEndpoint,
    deleteEndpoint: normalizeOptionalConfigString(normalizeFastCometUrl(config.deleteEndpoint)),
    server: resolveFastCometServer(config.server, baseUrl, uploadEndpoint),
    port: resolveFastCometPort(config.port, baseUrl, uploadEndpoint),
    username: normalizeOptionalConfigString(config.username),
    token,
    authToken: token,
    keepLocalCopy: config.keepLocalCopy,
    timeoutMs: normalizeTimeoutMs(config.timeoutMs),
    resolveIp: normalizeResolveIp(config.resolveIp, baseUrl),
  };
};

const hasConfigText = (value: string | null | undefined): boolean =>
  (value?.trim() ?? '').length > 0;

const hasFastCometConnectionCredentials = (config: FastCometStorageConfig): boolean =>
  hasConfigText(config.server) &&
  config.port !== null &&
  config.port !== undefined &&
  hasConfigText(config.username) &&
  hasConfigText(config.token ?? config.authToken);

const areConfigsEqual = (left: FastCometStorageConfig, right: FastCometStorageConfig): boolean =>
  JSON.stringify(normalizeConfigForSave(left)) === JSON.stringify(normalizeConfigForSave(right));

type ToastFn = ReturnType<typeof useToast>['toast'];

const toastSaveError = (toast: ToastFn, error: Error): void => {
  logClientError(error, {
    context: { source: 'AdminFileStorageSettingsPage', action: 'saveSettings' },
  });
  toast(error.message !== '' ? error.message : 'Failed to save file storage settings.', {
    variant: 'error',
  });
};

type FileStorageSettingsViewModel = {
  assets3dSource: FileStorageSource;
  fastCometConfig: FastCometStorageConfig;
  isDirty: boolean;
  isFastCometMisconfigured: boolean;
  isLoading: boolean;
  isSaving: boolean;
  resetSettings: () => void;
  saveSettings: () => void;
  setAssets3dSource: React.Dispatch<React.SetStateAction<FileStorageSource>>;
  setFastCometConfig: React.Dispatch<React.SetStateAction<FastCometStorageConfig>>;
  setSource: React.Dispatch<React.SetStateAction<FileStorageSource>>;
  source: FileStorageSource;
};

const useFileStorageSettingsViewModel = (): FileStorageSettingsViewModel => {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSettingsBulk = useUpdateSettingsBulk();

  const storedSource = useMemo(
    () => normalizeSource(settingsQuery.data?.get(FILE_STORAGE_SOURCE_SETTING_KEY)),
    [settingsQuery.data]
  );

  const storedAssets3dSource = useMemo(
    () => normalizeSource(settingsQuery.data?.get(ASSETS3D_STORAGE_SOURCE_SETTING_KEY)),
    [settingsQuery.data]
  );

  const storedFastCometConfig = useMemo(
    () => normalizeFastCometConfig(settingsQuery.data?.get(FASTCOMET_STORAGE_CONFIG_SETTING_KEY)),
    [settingsQuery.data]
  );

  const [source, setSource] = useState<FileStorageSource>(storedSource);
  const [assets3dSource, setAssets3dSource] = useState<FileStorageSource>(storedAssets3dSource);
  const [fastCometConfig, setFastCometConfig] =
    useState<FastCometStorageConfig>(storedFastCometConfig);

  useEffect(() => {
    setSource(storedSource);
  }, [storedSource]);

  useEffect(() => {
    setAssets3dSource(storedAssets3dSource);
  }, [storedAssets3dSource]);

  useEffect(() => {
    setFastCometConfig(storedFastCometConfig);
  }, [storedFastCometConfig]);

  const normalizedDraft = normalizeConfigForSave(fastCometConfig);
  const normalizedStored = normalizeConfigForSave(storedFastCometConfig);

  const isDirty =
    source !== storedSource ||
    assets3dSource !== storedAssets3dSource ||
    areConfigsEqual(normalizedDraft, normalizedStored) === false;

  const isFastCometMisconfigured =
    source === 'fastcomet' &&
    (normalizedDraft.baseUrl.trim() === '' ||
      normalizedDraft.uploadEndpoint.trim() === '' ||
      hasFastCometConnectionCredentials(normalizedDraft) === false);

  const resetSettings = (): void => {
    setSource(storedSource);
    setAssets3dSource(storedAssets3dSource);
    setFastCometConfig(storedFastCometConfig);
  };

  const saveSettings = (): void => {
    const payloads = [
      { key: FILE_STORAGE_SOURCE_SETTING_KEY, value: source },
      { key: ASSETS3D_STORAGE_SOURCE_SETTING_KEY, value: assets3dSource },
      { key: FASTCOMET_STORAGE_CONFIG_SETTING_KEY, value: serializeSetting(normalizedDraft) },
    ];

    updateSettingsBulk.mutate(payloads, {
      onSuccess: (): void => {
        toast('File storage settings saved.', { variant: 'success' });
      },
      onError: (error: Error): void => {
        toastSaveError(toast, error);
      },
    });
  };

  return {
    assets3dSource,
    fastCometConfig,
    isDirty,
    isFastCometMisconfigured,
    isLoading: settingsQuery.isLoading,
    isSaving: updateSettingsBulk.isPending,
    resetSettings,
    saveSettings,
    setAssets3dSource,
    setFastCometConfig,
    setSource,
    source,
  };
};

const FileStorageSettingsView = ({
  assets3dSource,
  fastCometConfig,
  isDirty,
  isFastCometMisconfigured,
  isLoading,
  isSaving,
  resetSettings,
  saveSettings,
  setAssets3dSource,
  setFastCometConfig,
  setSource,
  source,
}: FileStorageSettingsViewModel): React.JSX.Element => {
  return (
    <AdminSettingsPageLayout
      title='File Storage'
      current='File Storage'
      description='Choose whether files are served from local uploads or FastComet storage.'
    >
      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
        <StorageSourceSection
          source={source}
          setSource={setSource}
          title='General File Storage'
          description='Where images, documents, and other media uploads are stored.'
        />
        <FastCometConfigSection config={fastCometConfig} setConfig={setFastCometConfig} />
      </div>
      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2 mt-6`}>
        <StorageSourceSection
          source={assets3dSource}
          setSource={setAssets3dSource}
          title='3D Assets Storage'
          description='Where generic .glb/.gltf uploads are stored. Milkbar CMS models use their own separate FastComet config.'
        />
      </div>

      {isFastCometMisconfigured && (
        <Alert variant='warning' className='mt-6'>
          FastComet mode requires SERVER, PORT, USERNAME, TOKEN, a public base URL, and an upload endpoint.
        </Alert>
      )}

      <FormActions
        onCancel={resetSettings}
        onSave={saveSettings}
        saveText='Save Settings'
        cancelText='Reset'
        isDisabled={isDirty === false || isSaving || isFastCometMisconfigured || isLoading}
        isSaving={isSaving}
        className='mt-8'
      />
    </AdminSettingsPageLayout>
  );
};

export function AdminFileStorageSettingsPage(): React.JSX.Element {
  return <FileStorageSettingsView {...useFileStorageSettingsViewModel()} />;
}
