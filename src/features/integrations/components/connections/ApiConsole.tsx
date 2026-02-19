'use client';

import React from 'react';

import { Button, Input, Textarea, Alert, SelectSimple, StatusBadge, FormField } from '@/shared/ui';

export interface ApiPreset {
  label: string;
  method: string;
  path?: string;
  params?: Record<string, unknown> | string;
  body?: string;
}

interface ApiConsoleProps {
  title: string;
  description: string;
  presets: ApiPreset[];
  method: string;
  setMethod: (value: string) => void;
  path?: string;
  setPath?: (value: string) => void;
  bodyOrParams: string;
  setBodyOrParams: (value: string) => void;
  bodyOrParamsLabel: string;
  loading: boolean;
  error: string | null;
  response: {
    status?: number;
    statusText?: string;
    data: unknown;
    refreshed?: boolean;
  } | null;
  onRequest: () => void;
  isConnected?: boolean;
  connectionWarning?: string;
  baseUrl?: string;
  methodType?: 'select' | 'input';
}

export function ApiConsole({
  title,
  description,
  presets,
  method,
  setMethod,
  path,
  setPath,
  bodyOrParams,
  setBodyOrParams,
  bodyOrParamsLabel,
  loading,
  error,
  response,
  onRequest,
  isConnected = true,
  connectionWarning,
  baseUrl,
  methodType = 'select',
}: ApiConsoleProps): React.JSX.Element {
  const methodOptions = [
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'PATCH', label: 'PATCH' },
    { value: 'DELETE', label: 'DELETE' },
  ];
  return (
    <div className='rounded-lg border border-border bg-card/60 p-4'>
      <div className='mb-3'>
        <h3 className='text-sm font-semibold text-white'>{title}</h3>
        <p className='text-xs text-gray-400'>{description}</p>
      </div>
      <div className='mb-3 flex flex-wrap gap-2'>
        {presets.map((preset: ApiPreset) => (
          <Button
            key={preset.label}
            type='button'
            variant='outline'
            size='xs'
            className='rounded-full border px-3 py-1'
            onClick={() => {
              setMethod(preset.method);
              if (setPath && preset.path) setPath(preset.path);
              const val = preset.body || (typeof preset.params === 'object' ? JSON.stringify(preset.params, null, 2) : preset.params);
              if (val) setBodyOrParams(val);
              else setBodyOrParams('{}');
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      {(!isConnected && connectionWarning) && (
        <Alert variant='warning' className='mb-3 text-xs'>
          {connectionWarning}
        </Alert>
      )}
      <div className={setPath ? 'grid gap-3 md:grid-cols-[120px_1fr]' : ''}>
        <FormField label='Method'>
          {methodType === 'select' ? (
            <SelectSimple
              options={methodOptions}
              value={method}
              onValueChange={setMethod}
              placeholder='Method'
              size='sm'
            />
          ) : (
            <Input
              size='sm'
              value={method}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMethod(e.target.value)}
            />
          )}
        </FormField>
        {setPath && (
          <FormField label='Endpoint path'>
            <Input
              size='sm'
              value={path || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPath(e.target.value)}
            />
          </FormField>
        )}
      </div>
      <div className='mt-3'>
        <FormField label={bodyOrParamsLabel}>
          <Textarea
            className='h-32 font-mono'
            size='sm'
            value={bodyOrParams}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBodyOrParams(e.target.value)}
          />
        </FormField>
      </div>      <div className='mt-3 flex items-center gap-3'>
        <Button
          variant='default'
          type='button'
          disabled={!isConnected}
          loading={loading}
          loadingText='Sending...'
          onClick={onRequest}
        >
          Send request
        </Button>
        {baseUrl && (
          <span className='text-xs text-gray-500'>
            Base URL: {baseUrl}
          </span>
        )}
      </div>
      {error && (
        <Alert variant='error' className='mt-3 text-xs'>
          {error}
        </Alert>
      )}
      {response && (
        <div className='mt-3 rounded-md border border-border bg-card p-3'>
          {(response.status || response.statusText) && (
            <div className='text-xs text-gray-400 mb-2'>
              Status:{' '}
              <span className='text-gray-200'>
                {response.status} {response.statusText}
              </span>
              {response.refreshed ? (
                <StatusBadge
                  status='Token refreshed'
                  variant='success'
                  size='sm'
                  className='ml-2 font-semibold'
                />
              ) : null}
            </div>
          )}
          <pre className='mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-gray-200'>
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
