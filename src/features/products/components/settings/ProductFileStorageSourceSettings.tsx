'use client';

import React from 'react';

import type { FileStorageSource } from '@/shared/lib/files/constants';
import {
  FormActions,
  FormField,
  FormSection,
  Hint,
  SelectSimple,
} from '@/shared/ui/forms-and-actions.public';
import { Alert } from '@/shared/ui/primitives.public';

import {
  normalizeSource,
  useProductFileStorageSourceController,
  type FastCometStorageStatus,
  type ProductFileStorageSourceController,
} from './ProductFileStorageSourceSettings.controller';

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

const getConnectionLabel = (
  source: FileStorageSource,
  fastCometStatus: FastCometStorageStatus
): string => {
  if (source === 'local') return 'Local app';
  if (
    fastCometStatus.server === null ||
    fastCometStatus.server === undefined ||
    fastCometStatus.port === null ||
    fastCometStatus.port === undefined
  ) {
    return 'Not configured';
  }
  return `${fastCometStatus.server}:${fastCometStatus.port}`;
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
  const connection = getConnectionLabel(source, fastCometStatus);

  return (
    <div className='grid gap-3 rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-gray-300 sm:grid-cols-4'>
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
          Connection
        </span>
        <span className='block truncate font-medium text-gray-100' title={connection}>
          {connection}
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

      {controller.isFastCometMisconfigured && (
        <Alert variant='warning'>
          FastComet needs SERVER, PORT, USERNAME, TOKEN, a public base URL, and an upload endpoint before product uploads can use it.
        </Alert>
      )}

      <ProductFileSourceActions controller={controller} />
    </FormSection>
  );
}
