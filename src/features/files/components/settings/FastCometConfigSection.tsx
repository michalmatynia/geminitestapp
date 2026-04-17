'use client';

import React from 'react';
import { FormField, FormSection, Hint, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { Input } from '@/shared/ui/primitives.public';
import type { FastCometStorageConfig } from '@/shared/lib/files/constants';

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
    <div className='space-y-4'>
      <FormField label='Base URL'>
        <Input
          value={config.baseUrl}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setConfig((prev: FastCometStorageConfig) => ({
              ...prev,
              baseUrl: event.target.value,
            }))
          }
          placeholder='https://files.example.com'
          aria-label='https://files.example.com'
          title='https://files.example.com'
        />
        <Hint className='mt-1'>Optional public base URL, e.g. https://files.your-domain.com.</Hint>
      </FormField>

      <FormField label='Upload endpoint'>
        <Input
          value={config.uploadEndpoint}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setConfig((prev: FastCometStorageConfig) => ({
              ...prev,
              uploadEndpoint: event.target.value,
            }))
          }
          placeholder='https://files.example.com/api/uploads'
          aria-label='https://files.example.com/api/uploads'
          title='https://files.example.com/api/uploads'
        />
        <Hint className='mt-1'>
          Server endpoint that receives multipart upload requests from this app.
        </Hint>
      </FormField>

      <FormField label='Delete endpoint'>
        <Input
          value={config.deleteEndpoint ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setConfig((prev: FastCometStorageConfig) => ({
              ...prev,
              deleteEndpoint: event.target.value,
            }))
          }
          placeholder='https://files.example.com/api/uploads/delete'
          aria-label='https://files.example.com/api/uploads/delete'
          title='https://files.example.com/api/uploads/delete'
        />
        <Hint className='mt-1'>
          Optional endpoint used to delete remote files when records are removed.
        </Hint>
      </FormField>

      <FormField label='Bearer token'>
        <Input
          type='password'
          value={config.authToken ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setConfig((prev: FastCometStorageConfig) => ({
              ...prev,
              authToken: event.target.value,
            }))
          }
          placeholder='Optional API token'
          aria-label='Optional API token'
          title='Optional API token'
        />
        <Hint className='mt-1'>Optional token sent as Authorization: Bearer &lt;token&gt;.</Hint>
      </FormField>

      <FormField label='Request timeout (ms)'>
        <Input
          type='number'
          min={1_000}
          max={120_000}
          value={config.timeoutMs}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setConfig((prev: FastCometStorageConfig) => ({
              ...prev,
              timeoutMs: Number(event.target.value),
            }))
          }
          aria-label='Request timeout (ms)'
          title='Request timeout (ms)'
        />
        <Hint className='mt-1'>Range: 1000 - 120000 ms.</Hint>
      </FormField>

      <FormField label='Keep local mirror copy'>
        <ToggleRow
          label='Keep local copy in /public/uploads'
          checked={config.keepLocalCopy}
          onCheckedChange={(checked: boolean): void =>
            setConfig((prev: FastCometStorageConfig) => ({
              ...prev,
              keepLocalCopy: checked,
            }))
          }
          variant='switch'
          className='border-none bg-muted/20 px-3 py-2 hover:bg-muted/30'
        />
        <Hint className='mt-1'>
          Recommended: preserves compatibility with server-side image operations.
        </Hint>
      </FormField>
    </div>
  </FormSection>
);
