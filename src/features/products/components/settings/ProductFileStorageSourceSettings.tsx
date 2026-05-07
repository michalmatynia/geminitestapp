'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  FASTCOMET_STORAGE_CONFIG_SETTING_KEY,
  FILE_STORAGE_SOURCE_SETTING_KEY,
  type FastCometStorageConfig,
  type FileStorageSource,
} from '@/shared/lib/files/constants';
import {
  FormActions,
  FormField,
  FormSection,
  Hint,
  SelectSimple,
} from '@/shared/ui/forms-and-actions.public';
import { Alert, useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { parseJsonSetting } from '@/shared/utils/settings-json';

type FastCometStorageStatus = Pick<
  FastCometStorageConfig,
  'baseUrl' | 'uploadEndpoint' | 'keepLocalCopy'
>;

type ProductFileStorageSourceController = {
  controlsDisabled: boolean;
  fastCometStatus: FastCometStorageStatus;
  handleReset: () => void;
  handleSave: () => Promise<void>;
  isFastCometMissingEndpoint: boolean;
  isSaving: boolean;
  saveDisabled: boolean;
  setSource: (source: FileStorageSource) => void;
  source: FileStorageSource;
};

const STORAGE_SOURCE_OPTIONS = [
  {
    value: 'local',
    label: 'Local public folder',
    description: 'Write new uploads only into this Products app public/uploads folder.',
  },
  {
    value: 'fastcomet',
    label: 'FastComet public_html',
    description: 'Write new uploads to FastComet public_html, with local mirror when enabled.',
  },
] as const;

const normalizeSource = (value: string | null | undefined): FileStorageSource =>
  value === 'fastcomet' ? 'fastcomet' : 'local';

const CURRENT_FASTCOMET_BASE_URL = 'https://sparksofsindri.com';
const LEGACY_FASTCOMET_HOSTS = new Set(['qubrick.io', 'www.qubrick.io']);

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeFastCometUrl = (value: unknown): string => {
  const raw = normalizeString(value);
  if (raw.length === 0) return '';
  try {
    const url = new URL(raw);
    if (LEGACY_FASTCOMET_HOSTS.has(url.hostname.toLowerCase())) {
      const currentUrl = new URL(CURRENT_FASTCOMET_BASE_URL);
      url.protocol = currentUrl.protocol;
      url.hostname = currentUrl.hostname;
      url.port = currentUrl.port;
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return raw;
  }
};

const readFastCometStorageStatus = (
  raw: string | null | undefined
): FastCometStorageStatus => {
  const parsed = parseJsonSetting<Partial<FastCometStorageConfig> | null>(raw, null) ?? {};

  return {
    baseUrl: normalizeFastCometUrl(parsed.baseUrl),
    uploadEndpoint: normalizeFastCometUrl(parsed.uploadEndpoint),
    keepLocalCopy: typeof parsed.keepLocalCopy === 'boolean' ? parsed.keepLocalCopy : true,
  };
};

const getSourceLabel = (source: FileStorageSource): string =>
  source === 'fastcomet' ? 'FastComet public_html' : 'Local public folder';

const formatStatusValue = (value: string): string => (value.length > 0 ? value : 'Not configured');

const getLocalBackupLabel = (
  source: FileStorageSource,
  fastCometStatus: FastCometStorageStatus
): string => {
  if (source === 'local') return 'Primary storage';
  return fastCometStatus.keepLocalCopy ? 'On' : 'Off';
};

function ProductFileSourceField({
  disabled,
  source,
  setSource,
}: {
  disabled: boolean;
  source: FileStorageSource;
  setSource: (source: FileStorageSource) => void;
}): React.JSX.Element {
  return (
    <FormField
      label='Upload product files to'
      description='FastComet with local backup writes each new product upload to both locations.'
    >
      <SelectSimple
        size='sm'
        value={source}
        onValueChange={(value: string): void => {
          setSource(normalizeSource(value));
        }}
        options={STORAGE_SOURCE_OPTIONS}
        placeholder='Select product file source'
        disabled={disabled}
        triggerClassName='h-9'
        ariaLabel='Product file source'
        title='Product file source'
      />
      <Hint className='mt-1'>
        Existing product records keep their current file paths until they are migrated.
      </Hint>
    </FormField>
  );
}

function ProductFileSourceStatus({
  fastCometStatus,
  source,
}: {
  fastCometStatus: FastCometStorageStatus;
  source: FileStorageSource;
}): React.JSX.Element {
  const publicBase =
    source === 'fastcomet' ? formatStatusValue(fastCometStatus.baseUrl) : '/public/uploads';
  const localBackup = getLocalBackupLabel(source, fastCometStatus);

  return (
    <div className='grid gap-3 rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-gray-300 sm:grid-cols-3'>
      <div className='min-w-0 space-y-1'>
        <span className='block text-[10px] font-medium uppercase tracking-wider text-gray-500'>
          Selected source
        </span>
        <span className='block truncate font-medium text-gray-100'>{getSourceLabel(source)}</span>
      </div>
      <div className='min-w-0 space-y-1'>
        <span className='block text-[10px] font-medium uppercase tracking-wider text-gray-500'>
          Public base
        </span>
        <span className='block truncate font-medium text-gray-100' title={publicBase}>
          {publicBase}
        </span>
      </div>
      <div className='min-w-0 space-y-1'>
        <span className='block text-[10px] font-medium uppercase tracking-wider text-gray-500'>
          Local backup
        </span>
        <span className='block truncate font-medium text-gray-100'>{localBackup}</span>
      </div>
    </div>
  );
}

function ProductFileMirrorStatus({
  fastCometStatus,
  source,
}: {
  fastCometStatus: FastCometStorageStatus;
  source: FileStorageSource;
}): React.JSX.Element | null {
  if (source !== 'fastcomet') return null;

  if (fastCometStatus.keepLocalCopy) {
    return (
      <Alert variant='success'>
        New product uploads are sent to FastComet and mirrored into local public/uploads.
      </Alert>
    );
  }

  return (
    <Alert variant='warning'>
      FastComet is selected, but local mirroring is off in file storage settings.
    </Alert>
  );
}

function ProductFileSourceActions({
  controller,
}: {
  controller: ProductFileStorageSourceController;
}): React.JSX.Element {
  return (
    <FormActions
      onCancel={controller.handleReset}
      onSave={(): void => {
        void controller.handleSave();
      }}
      saveText='Save File Source'
      cancelText='Reset'
      isDisabled={controller.saveDisabled}
      isSaving={controller.isSaving}
      className='justify-start'
    />
  );
}

function useProductFileStorageSourceController(): ProductFileStorageSourceController {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const updateSetting = useUpdateSetting();

  const storedSource = useMemo(
    () => normalizeSource(settingsQuery.data?.get(FILE_STORAGE_SOURCE_SETTING_KEY)),
    [settingsQuery.data]
  );

  const fastCometStatus = useMemo(
    () => readFastCometStorageStatus(settingsQuery.data?.get(FASTCOMET_STORAGE_CONFIG_SETTING_KEY)),
    [settingsQuery.data]
  );

  const [source, setSource] = useState<FileStorageSource>(storedSource);
  const [lastSavedSource, setLastSavedSource] = useState<FileStorageSource | null>(null);

  useEffect(() => {
    setSource(storedSource);
    setLastSavedSource(null);
  }, [storedSource]);

  const persistedSource = lastSavedSource ?? storedSource;
  const isDirty = source !== persistedSource;
  const isFastCometMissingEndpoint =
    source === 'fastcomet' && fastCometStatus.uploadEndpoint.length === 0;
  const controlsDisabled = settingsQuery.isLoading || updateSetting.isPending;
  const saveDisabled = isDirty === false || controlsDisabled || isFastCometMissingEndpoint;

  const handleSave = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: FILE_STORAGE_SOURCE_SETTING_KEY,
        value: source,
      });
      setLastSavedSource(source);
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
    isFastCometMissingEndpoint,
    isSaving: updateSetting.isPending,
    saveDisabled,
    setSource,
    source,
  };
}

export function ProductFileStorageSourceSettings(): React.JSX.Element {
  const controller = useProductFileStorageSourceController();

  return (
    <FormSection
      title='Product Upload Storage'
      description='Choose where new product image uploads are written.'
    >
      <ProductFileSourceField
        disabled={controller.controlsDisabled}
        source={controller.source}
        setSource={controller.setSource}
      />
      <ProductFileSourceStatus
        fastCometStatus={controller.fastCometStatus}
        source={controller.source}
      />
      <ProductFileMirrorStatus
        fastCometStatus={controller.fastCometStatus}
        source={controller.source}
      />

      {controller.isFastCometMissingEndpoint && (
        <Alert variant='warning'>
          FastComet needs an upload endpoint before it can be selected for product uploads.
        </Alert>
      )}

      <ProductFileSourceActions controller={controller} />
    </FormSection>
  );
}
