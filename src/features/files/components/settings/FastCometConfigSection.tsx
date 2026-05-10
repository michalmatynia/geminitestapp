'use client';

import React from 'react';
import { FormField, FormSection, Hint, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { Input } from '@/shared/ui/primitives.public';
import {
  DEFAULT_FASTCOMET_STORAGE_PORT,
  DEFAULT_FASTCOMET_STORAGE_SERVER,
  type FastCometStorageConfig,
} from '@/shared/lib/files/constants';

const ConfigField = ({
  label,
  value,
  onChange,
  hint,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (val: string | number) => void;
  hint: string;
  type?: string;
  placeholder?: string;
}): React.JSX.Element => (
  <FormField label={label}>
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      placeholder={placeholder}
      aria-label={label}
      title={label}
    />
    <Hint className='mt-1'>{hint}</Hint>
  </FormField>
);

const updateToken = (
  setConfig: React.Dispatch<React.SetStateAction<FastCometStorageConfig>>,
  value: string
): void => {
  setConfig((previous) => ({ ...previous, authToken: value, token: value }));
};

const ConfigToggleField = ({
  label,
  checked,
  onCheckedChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  hint: string;
}): React.JSX.Element => (
  <FormField label='Keep local mirror copy'>
    <ToggleRow
      label={label}
      checked={checked}
      onCheckedChange={onCheckedChange}
      variant='switch'
      className='border-none bg-muted/20 px-3 py-2 hover:bg-muted/30'
    />
    <Hint className='mt-1'>{hint}</Hint>
  </FormField>
);

type FastCometConfigFieldsProps = {
  config: FastCometStorageConfig;
  setConfig: React.Dispatch<React.SetStateAction<FastCometStorageConfig>>;
};

const FastCometConnectionFields = ({
  config,
  setConfig,
}: FastCometConfigFieldsProps): React.JSX.Element => (
  <div className='grid gap-4 md:grid-cols-2'>
    <ConfigField
      label='SERVER'
      value={config.server ?? ''}
      onChange={(val) => setConfig((p) => ({ ...p, server: val as string }))}
      hint='FastComet host used for the upload connection.'
      placeholder={DEFAULT_FASTCOMET_STORAGE_SERVER}
    />
    <ConfigField
      label='PORT'
      type='number'
      value={config.port ?? DEFAULT_FASTCOMET_STORAGE_PORT}
      onChange={(val) => setConfig((p) => ({ ...p, port: val as number }))}
      hint='Connection port for the FastComet upload channel.'
      placeholder={String(DEFAULT_FASTCOMET_STORAGE_PORT)}
    />
    <ConfigField
      label='USERNAME'
      value={config.username ?? ''}
      onChange={(val) => setConfig((p) => ({ ...p, username: val as string }))}
      hint='FastComet account or endpoint username for the upload channel.'
      placeholder='FastComet username'
    />
    <ConfigField
      label='TOKEN'
      type='password'
      value={config.token ?? config.authToken ?? ''}
      onChange={(val) => updateToken(setConfig, val as string)}
      hint='Required token sent as Authorization: Bearer <token>.'
      placeholder='FastComet API token'
    />
  </div>
);

const FastCometEndpointFields = ({
  config,
  setConfig,
}: FastCometConfigFieldsProps): React.JSX.Element => (
  <>
    <ConfigField
      label='Base URL'
      value={config.baseUrl}
      onChange={(val) => setConfig((p) => ({ ...p, baseUrl: val as string }))}
      hint='Public file base URL. Default: https://sparksofsindri.com.'
      placeholder='https://sparksofsindri.com'
    />
    <ConfigField
      label='Upload endpoint'
      value={config.uploadEndpoint}
      onChange={(val) => setConfig((p) => ({ ...p, uploadEndpoint: val as string }))}
      hint='Optional. When empty, this uses <Base URL>/api/uploads/index.php.'
      placeholder='https://sparksofsindri.com/api/uploads/index.php'
    />
    <ConfigField
      label='Delete endpoint'
      value={config.deleteEndpoint ?? ''}
      onChange={(val) => setConfig((p) => ({ ...p, deleteEndpoint: val as string }))}
      hint='Optional endpoint used to delete remote files when records are removed.'
      placeholder='https://files.example.com/api/uploads/delete'
    />
    <ConfigField
      label='DNS override IP'
      value={config.resolveIp ?? ''}
      onChange={(val) => setConfig((p) => ({ ...p, resolveIp: val as string }))}
      hint='Optional temporary IP override used while the public domain is not resolving.'
      placeholder='209.42.31.54'
    />
  </>
);

const FastCometRuntimeFields = ({
  config,
  setConfig,
}: FastCometConfigFieldsProps): React.JSX.Element => (
  <>
    <ConfigField
      label='Request timeout (ms)'
      type='number'
      value={config.timeoutMs}
      onChange={(val) => setConfig((p) => ({ ...p, timeoutMs: val as number }))}
      hint='Range: 1000 - 120000 ms.'
    />
    <ConfigToggleField
      label='Keep local copy in /public/uploads'
      checked={config.keepLocalCopy}
      onCheckedChange={(checked: boolean) => setConfig((p) => ({ ...p, keepLocalCopy: checked }))}
      hint='Recommended: preserves compatibility with server-side image operations.'
    />
  </>
);

const FastCometConfigFields = (props: FastCometConfigFieldsProps): React.JSX.Element => (
  <div className='space-y-4'>
    <FastCometConnectionFields {...props} />
    <FastCometEndpointFields {...props} />
    <FastCometRuntimeFields {...props} />
  </div>
);

export const FastCometConfigSection = ({
  config,
  setConfig,
}: {
  config: FastCometStorageConfig;
  setConfig: React.Dispatch<React.SetStateAction<FastCometStorageConfig>>;
}): React.JSX.Element => (
  <FormSection
    title='FastComet Configuration'
    description='Used when source is set to FastComet. Enter the connection credentials before enabling remote uploads.'
    className='p-6'
  >
    <FastCometConfigFields config={config} setConfig={setConfig} />
  </FormSection>
);
