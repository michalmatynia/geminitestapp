'use client';

import { useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import {
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

const normalizeSource = (value: string | null | undefined): FileStorageSource =>
  value === 'fastcomet' ? 'fastcomet' : 'local';

const normalizeFastCometConfig = (raw: string | null | undefined): FastCometStorageConfig => {
  const parsed = parseJsonSetting<Partial<FastCometStorageConfig> | null>(raw, null) ?? {};

  const timeoutRaw = Number(parsed.timeoutMs);
  const timeoutMs = Number.isFinite(timeoutRaw)
    ? Math.min(Math.max(Math.floor(timeoutRaw), 1_000), 120_000)
    : 20_000;

  const baseUrl = typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '';
  const uploadEndpoint = typeof parsed.uploadEndpoint === 'string' ? parsed.uploadEndpoint : '';
  
  const deleteEndpoint =
    typeof parsed.deleteEndpoint === 'string' && parsed.deleteEndpoint.trim() !== ''
      ? parsed.deleteEndpoint
      : null;

  const authToken =
    typeof parsed.authToken === 'string' && parsed.authToken.trim() !== ''
      ? parsed.authToken
      : null;

  const keepLocalCopy = typeof parsed.keepLocalCopy === 'boolean' ? parsed.keepLocalCopy : true;

  return {
    baseUrl,
    uploadEndpoint,
    deleteEndpoint,
    authToken,
    keepLocalCopy,
    timeoutMs,
  };
};

const normalizeConfigForSave = (config: FastCometStorageConfig): FastCometStorageConfig => {
  const deleteEndpoint = config.deleteEndpoint?.trim();
  const authToken = config.authToken?.trim();
  
  return {
    baseUrl: config.baseUrl.trim(),
    uploadEndpoint: config.uploadEndpoint.trim(),
    deleteEndpoint: deleteEndpoint !== undefined && deleteEndpoint !== '' ? deleteEndpoint : null,
    authToken: authToken !== undefined && authToken !== '' ? authToken : null,
    keepLocalCopy: config.keepLocalCopy,
    timeoutMs: Math.min(Math.max(Math.floor(config.timeoutMs), 1_000), 120_000),
  };
};

const areConfigsEqual = (left: FastCometStorageConfig, right: FastCometStorageConfig): boolean =>
  JSON.stringify(normalizeConfigForSave(left)) === JSON.stringify(normalizeConfigForSave(right));

export function AdminFileStorageSettingsPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSettingsBulk = useUpdateSettingsBulk();

  const storedSource = useMemo(
    () => normalizeSource(settingsQuery.data?.get(FILE_STORAGE_SOURCE_SETTING_KEY)),
    [settingsQuery.data]
  );

  const storedFastCometConfig = useMemo(
    () => normalizeFastCometConfig(settingsQuery.data?.get(FASTCOMET_STORAGE_CONFIG_SETTING_KEY)),
    [settingsQuery.data]
  );

  const [source, setSource] = useState<FileStorageSource>(storedSource);
  const [fastCometConfig, setFastCometConfig] =
    useState<FastCometStorageConfig>(storedFastCometConfig);

  useEffect(() => {
    setSource(storedSource);
  }, [storedSource]);

  useEffect(() => {
    setFastCometConfig(storedFastCometConfig);
  }, [storedFastCometConfig]);

  const normalizedDraft = normalizeConfigForSave(fastCometConfig);
  const normalizedStored = normalizeConfigForSave(storedFastCometConfig);

  const isDirty = source !== storedSource || areConfigsEqual(normalizedDraft, normalizedStored) === false;

  const isFastCometMisconfigured =
    source === 'fastcomet' && normalizedDraft.uploadEndpoint.trim() === '';

  const saveSettings = (): void => {
    const payloads = [
      { key: FILE_STORAGE_SOURCE_SETTING_KEY, value: source },
      { key: FASTCOMET_STORAGE_CONFIG_SETTING_KEY, value: serializeSetting(normalizedDraft) },
    ];

    updateSettingsBulk.mutate(payloads, {
      onSuccess: (): void => {
        toast('File storage settings saved.', { variant: 'success' });
      },
      onError: (error: Error): void => {
        logClientError(error, {
          context: { source: 'AdminFileStorageSettingsPage', action: 'saveSettings' },
        });
        toast(error.message !== '' ? error.message : 'Failed to save file storage settings.', {
          variant: 'error',
        });
      },
    });
  };

  return (
    <AdminSettingsPageLayout
      title='File Storage'
      current='File Storage'
      description='Choose whether files are served from local uploads or FastComet storage.'
    >
      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
        <StorageSourceSection source={source} setSource={setSource} />
        <FastCometConfigSection config={fastCometConfig} setConfig={setFastCometConfig} />
      </div>

      {isFastCometMisconfigured && (
        <Alert variant='warning' className='mt-6'>
          FastComet mode requires an upload endpoint. Add it before saving.
        </Alert>
      )}

      <FormActions
        onCancel={(): void => {
          setSource(storedSource);
          setFastCometConfig(storedFastCometConfig);
        }}
        onSave={saveSettings}
        saveText='Save Settings'
        cancelText='Reset'
        isDisabled={
          isDirty === false ||
          updateSettingsBulk.isPending ||
          isFastCometMisconfigured ||
          settingsQuery.isLoading
        }
        isSaving={updateSettingsBulk.isPending}
        className='mt-8'
      />
    </AdminSettingsPageLayout>
  );
}
