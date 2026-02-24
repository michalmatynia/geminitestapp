'use client';

import React from 'react';

import { Button, Input, Textarea, Alert, SelectSimple, StatusBadge, FormField, Card } from '@/shared/ui';

import { useApiConsoleContext, type ApiPreset } from './ApiConsoleContext';

interface ApiConsoleProps {
  title: string;
  description: string;
  presets: ApiPreset[];
  bodyOrParamsLabel: string;
  baseUrl?: string;
  methodType?: 'select' | 'input';
  connectionWarning?: string;
}

export function ApiConsole({
  title,
  description,
  presets,
  bodyOrParamsLabel,
  baseUrl,
  methodType = 'select',
  connectionWarning,
}: ApiConsoleProps): React.JSX.Element {
  const {
    method,
    setMethod,
    path,
    setPath,
    bodyOrParams,
    setBodyOrParams,
    loading,
    error,
    response,
    onRequest,
    isConnected,
  } = useApiConsoleContext();

  const methodOptions = [
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'PATCH', label: 'PATCH' },
    { value: 'DELETE', label: 'DELETE' },
  ];
  return (
    <Card variant='subtle' padding='md' className='bg-card/60'>
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
            className='rounded-full px-3'
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
              variant='subtle'
              size='sm'
            />
          ) : (
            <Input
              variant='subtle'
              size='sm'
              value={method}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMethod(e.target.value)}
            />
          )}
        </FormField>
        {setPath && (
          <FormField label='Endpoint path'>
            <Input
              variant='subtle'
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
            variant='subtle'
            size='sm'
            className='h-32 font-mono'
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
        <Card variant='subtle-compact' padding='sm' className='mt-3 bg-card'>
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
        </Card>
      )}
    </Card>
  );
}
