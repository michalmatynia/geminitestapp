'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  FASTCOMET_STORAGE_CONFIG_SETTING_KEY,
  FILE_STORAGE_SOURCE_SETTING_KEY,
  fileStorageSourceValues,
} from '@/shared/lib/files/constants';
import type { FastCometStorageConfig, FileStorageSource } from '@/shared/lib/files/constants';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import {
  FormField,
  FormSection,
  Input,
  SectionHeader,
  SelectSimple,
  useToast,
  FormActions,
  ToggleRow,
  Breadcrumbs,
  Hint,
  Card,
  Alert,
} from '@/shared/ui';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

const normalizeSource = (value: string | null | undefined): FileStorageSource =>
  value === 'fastcomet' ? 'fastcomet' : 'local';

const normalizeFastCometConfig = (raw: string | null | undefined): FastCometStorageConfig => {
  const parsed = parseJsonSetting<Partial<FastCometStorageConfig> | null>(raw, null) ?? {};

  const timeoutRaw = Number(parsed.timeoutMs);
  const timeoutMs = Number.isFinite(timeoutRaw)
    ? Math.min(Math.max(Math.floor(timeoutRaw), 1_000), 120_000)
    : 20_000;

  return {
    baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
    uploadEndpoint: typeof parsed.uploadEndpoint === 'string' ? parsed.uploadEndpoint : '',
    deleteEndpoint:
      typeof parsed.deleteEndpoint === 'string' && parsed.deleteEndpoint.trim().length > 0
        ? parsed.deleteEndpoint
        : null,
    authToken:
      typeof parsed.authToken === 'string' && parsed.authToken.trim().length > 0
        ? parsed.authToken
        : null,
    keepLocalCopy: typeof parsed.keepLocalCopy === 'boolean' ? parsed.keepLocalCopy : true,
    timeoutMs,
  };
};

const normalizeConfigForSave = (config: FastCometStorageConfig): FastCometStorageConfig => ({
  baseUrl: config.baseUrl.trim(),
  uploadEndpoint: config.uploadEndpoint.trim(),
  deleteEndpoint: config.deleteEndpoint?.trim() || null,
  authToken: config.authToken?.trim() || null,
  keepLocalCopy: config.keepLocalCopy,
  timeoutMs: Math.min(Math.max(Math.floor(config.timeoutMs), 1_000), 120_000),
});

const areConfigsEqual = (left: FastCometStorageConfig, right: FastCometStorageConfig): boolean =>
  JSON.stringify(normalizeConfigForSave(left)) === JSON.stringify(normalizeConfigForSave(right));

const sourceOptions = fileStorageSourceValues.map((value) => ({
  value,
  label: value === 'local' ? 'Local folder' : 'FastComet',
  description:
    value === 'local'
      ? 'Store files in /public/uploads.'
      : 'Upload files to your FastComet server.',
}));

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

  const isDirty = source !== storedSource || !areConfigsEqual(normalizedDraft, normalizedStored);

  const isFastCometMisconfigured =
    source === 'fastcomet' && normalizedDraft.uploadEndpoint.trim().length === 0;

  const saveSettings = (): void => {
    const payloads = [
      {
        key: FILE_STORAGE_SOURCE_SETTING_KEY,
        value: source,
      },
      {
        key: FASTCOMET_STORAGE_CONFIG_SETTING_KEY,
        value: serializeSetting(normalizedDraft),
      },
    ];

    updateSettingsBulk.mutate(payloads, {
      onSuccess: (): void => {
        toast('File storage settings saved.', { variant: 'success' });
      },
      onError: (error: Error): void => {
        logClientError(error, {
          context: {
            source: 'AdminFileStorageSettingsPage',
            action: 'saveSettings',
          },
        });
        toast(error.message || 'Failed to save file storage settings.', {
          variant: 'error',
        });
      },
    });
  };

  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='File Storage'
        description='Choose whether files are served from local uploads or FastComet storage.'
        eyebrow={
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Settings', href: '/admin/settings' },
              { label: 'File Storage' },
            ]}
            className='mb-2'
          />
        }
        className='mb-8'
      />

      <div className='grid gap-6 lg:grid-cols-2'>
        <FormSection
          title='Storage Source'
          description='Switch where new uploads are written and where file URLs point.'
          className='p-6'
        >
          <FormField label='Active provider'>
            <SelectSimple
              size='sm'
              value={source}
              onValueChange={(value: string): void => setSource(normalizeSource(value))}
              options={sourceOptions}
              placeholder='Select file source'
            />
            <Hint className='mt-1'>
              Local keeps uploads in this app. FastComet writes new uploads to your external server.
            </Hint>
          </FormField>

          <Card
            variant='subtle-compact'
            padding='md'
            className='border-border bg-muted/20 space-y-1'
          >
            <div className='flex justify-between text-sm text-gray-300'>
              <span>Current mode</span>
              <span className='font-medium text-gray-100'>
                {source === 'local' ? 'Local folder' : 'FastComet'}
              </span>
            </div>
            <Hint variant='muted'>
              Existing file records are not auto-migrated. This setting affects new uploads.
            </Hint>
          </Card>
        </FormSection>

        <FormSection
          title='FastComet Configuration'
          description='Used when source is set to FastComet. Upload endpoint is required.'
          className='p-6'
        >
          <div className='space-y-4'>
            <FormField label='Base URL'>
              <Input
                value={fastCometConfig.baseUrl}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFastCometConfig((prev: FastCometStorageConfig) => ({
                    ...prev,
                    baseUrl: event.target.value,
                  }))
                }
                placeholder='https://files.example.com'
              />
              <Hint className='mt-1'>
                Optional public base URL, e.g. https://files.your-domain.com.
              </Hint>
            </FormField>

            <FormField label='Upload endpoint'>
              <Input
                value={fastCometConfig.uploadEndpoint}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFastCometConfig((prev: FastCometStorageConfig) => ({
                    ...prev,
                    uploadEndpoint: event.target.value,
                  }))
                }
                placeholder='https://files.example.com/api/uploads'
              />
              <Hint className='mt-1'>
                Server endpoint that receives multipart upload requests from this app.
              </Hint>
            </FormField>

            <FormField label='Delete endpoint'>
              <Input
                value={fastCometConfig.deleteEndpoint ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFastCometConfig((prev: FastCometStorageConfig) => ({
                    ...prev,
                    deleteEndpoint: event.target.value,
                  }))
                }
                placeholder='https://files.example.com/api/uploads/delete'
              />
              <Hint className='mt-1'>
                Optional endpoint used to delete remote files when records are removed.
              </Hint>
            </FormField>

            <FormField label='Bearer token'>
              <Input
                type='password'
                value={fastCometConfig.authToken ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFastCometConfig((prev: FastCometStorageConfig) => ({
                    ...prev,
                    authToken: event.target.value,
                  }))
                }
                placeholder='Optional API token'
              />
              <Hint className='mt-1'>
                Optional token sent as Authorization: Bearer &lt;token&gt;.
              </Hint>
            </FormField>

            <FormField label='Request timeout (ms)'>
              <Input
                type='number'
                min={1_000}
                max={120_000}
                value={fastCometConfig.timeoutMs}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFastCometConfig((prev: FastCometStorageConfig) => ({
                    ...prev,
                    timeoutMs: Number(event.target.value),
                  }))
                }
              />
              <Hint className='mt-1'>Range: 1000 - 120000 ms.</Hint>
            </FormField>

            <FormField label='Keep local mirror copy'>
              <ToggleRow
                label='Keep local copy in /public/uploads'
                checked={fastCometConfig.keepLocalCopy}
                onCheckedChange={(checked: boolean): void =>
                  setFastCometConfig((prev: FastCometStorageConfig) => ({
                    ...prev,
                    keepLocalCopy: checked,
                  }))
                }
                type='switch'
                className='border-none bg-muted/20 px-3 py-2 hover:bg-muted/30'
              />
              <Hint className='mt-1'>
                Recommended: preserves compatibility with server-side image operations.
              </Hint>
            </FormField>
          </div>
        </FormSection>
      </div>

      {isFastCometMisconfigured ? (
        <Alert variant='warning' className='mt-6'>
          FastComet mode requires an upload endpoint. Add it before saving.
        </Alert>
      ) : null}

      <FormActions
        onCancel={(): void => {
          setSource(storedSource);
          setFastCometConfig(storedFastCometConfig);
        }}
        onSave={saveSettings}
        saveText='Save Settings'
        cancelText='Reset'
        isDisabled={
          !isDirty ||
          updateSettingsBulk.isPending ||
          isFastCometMisconfigured ||
          settingsQuery.isLoading
        }
        isSaving={updateSettingsBulk.isPending}
        className='mt-8'
      />
    </div>
  );
}
