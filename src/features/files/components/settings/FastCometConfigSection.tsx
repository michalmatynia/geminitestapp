'use client';

import React from 'react';
import { FormField, FormSection, Hint, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { Input } from '@/shared/ui/primitives.public';
import type { FastCometStorageConfig } from '@/shared/lib/files/constants';

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

const FastCometConfigFields = ({
  config,
  setConfig,
}: {
  config: FastCometStorageConfig;
  setConfig: React.Dispatch<React.SetStateAction<FastCometStorageConfig>>;
}): React.JSX.Element => (
  <div className='space-y-4'>
    <ConfigField
      label='Base URL'
      value={config.baseUrl}
      onChange={(val) => setConfig((p) => ({ ...p, baseUrl: val as string }))}
      hint='Optional public base URL, e.g. https://files.your-domain.com.'
      placeholder='https://files.example.com'
    />
    <ConfigField
      label='Upload endpoint'
      value={config.uploadEndpoint}
      onChange={(val) => setConfig((p) => ({ ...p, uploadEndpoint: val as string }))}
      hint='Server endpoint that receives multipart upload requests from this app.'
      placeholder='https://files.example.com/api/uploads'
    />
    <ConfigField
      label='Delete endpoint'
      value={config.deleteEndpoint ?? ''}
      onChange={(val) => setConfig((p) => ({ ...p, deleteEndpoint: val as string }))}
      hint='Optional endpoint used to delete remote files when records are removed.'
      placeholder='https://files.example.com/api/uploads/delete'
    />
    <ConfigField
      label='Bearer token'
      type='password'
      value={config.authToken ?? ''}
      onChange={(val) => setConfig((p) => ({ ...p, authToken: val as string }))}
      hint='Optional token sent as Authorization: Bearer <token>.'
      placeholder='Optional API token'
    />
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
    description='Used when source is set to FastComet. Upload endpoint is required.'
    className='p-6'
  >
    <FastCometConfigFields config={config} setConfig={setConfig} />
  </FormSection>
);
