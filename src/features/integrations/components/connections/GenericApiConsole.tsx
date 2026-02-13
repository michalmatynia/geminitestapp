'use client';

import React from 'react';

import { Button, Input, Textarea, Label, Alert, UnifiedSelect } from '@/shared/ui';

export interface ApiPreset {
  label: string;
  method: string;
  path?: string;
  params?: Record<string, unknown> | string;
  body?: string;
}

export interface GenericApiConsoleConfig {
  title: string;
  description: string;
  baseUrl: string;
  methodType?: 'select' | 'input';
  bodyOrParamsLabel?: string;
  connectionWarning?: string;
}

export interface GenericApiConsoleState {
  method: string;
  path?: string;
  bodyOrParams: string;
  loading: boolean;
  error: string | null;
  response: {
    status?: number;
    statusText?: string;
    data: unknown;
    refreshed?: boolean;
  } | null;
}

export interface GenericApiConsoleProps {
  config: GenericApiConsoleConfig;
  state: GenericApiConsoleState;
  presets: ApiPreset[];
  isConnected?: boolean;
  onSetMethod: (value: string) => void;
  onSetPath?: (value: string) => void;
  onSetBodyOrParams: (value: string) => void;
  onRequest: () => void;
}

/**
 * Generic API console component for testing API endpoints.
 * Consolidates BaseApiConsole and AllegroApiConsole patterns.
 *
 * @example
 * <GenericApiConsole
 *   config={{
 *     title: 'Base.com API Console',
 *     description: 'Send Base.com API requests',
 *     baseUrl: 'https://api.baselinker.com/connector.php',
 *     methodType: 'input',
 *     bodyOrParamsLabel: 'Parameters (JSON)',
 *   }}
 *   state={apiState}
 *   presets={baseApiPresets}
 *   isConnected={true}
 *   onSetMethod={setMethod}
 *   onSetBodyOrParams={setParams}
 *   onRequest={sendRequest}
 * />
 */
export function GenericApiConsole({
  config,
  state,
  presets,
  isConnected = true,
  onSetMethod,
  onSetPath,
  onSetBodyOrParams,
  onRequest,
}: GenericApiConsoleProps): React.JSX.Element {
  const {
    title,
    description,
    baseUrl,
    methodType = 'select',
    bodyOrParamsLabel = 'Body or Parameters',
    connectionWarning,
  } = config;

  const {
    method,
    path,
    bodyOrParams,
    loading,
    error,
    response,
  } = state;

  const methodOptions = [
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'PATCH', label: 'PATCH' },
    { value: 'DELETE', label: 'DELETE' },
  ];

  const handlePresetClick = (preset: ApiPreset) => {
    onSetMethod(preset.method);
    if (onSetPath && preset.path) {
      onSetPath(preset.path);
    }
    const val = preset.body || (typeof preset.params === 'object' ? JSON.stringify(preset.params, null, 2) : preset.params);
    onSetBodyOrParams(val || '{}');
  };

  return (
    <div className='rounded-lg border border-border bg-card/60 p-4'>
      {/* Header */}
      <div className='mb-3'>
        <h3 className='text-sm font-semibold text-white'>{title}</h3>
        <p className='text-xs text-gray-400'>{description}</p>
      </div>

      {/* Presets */}
      <div className='mb-3 flex flex-wrap gap-2'>
        {presets.map((preset: ApiPreset) => (
          <Button
            key={preset.label}
            type='button'
            className='rounded-full border px-3 py-1 text-[11px] text-gray-300 hover:border-gray-500'
            onClick={() => handlePresetClick(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Connection Warning */}
      {!isConnected && connectionWarning && (
        <Alert variant='warning' className='mb-3 text-xs'>
          {connectionWarning}
        </Alert>
      )}

      {/* Method & Path Inputs */}
      <div className={onSetPath ? 'grid gap-3 md:grid-cols-[120px_1fr]' : ''}>
        <div>
          <Label className='text-xs text-gray-400'>Method</Label>
          {methodType === 'select' ? (
            <div className='mt-2'>
              <UnifiedSelect
                options={methodOptions}
                value={method}
                onValueChange={onSetMethod}
                placeholder='Method'
                className='w-full border border-border bg-card px-3 py-2 text-sm text-white'
              />
            </div>
          ) : (
            <Input
              className='mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white'
              value={method}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSetMethod(e.target.value)}
            />
          )}
        </div>
        {onSetPath && (
          <div>
            <Label className='text-xs text-gray-400'>Endpoint path</Label>
            <Input
              className='mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white'
              value={path || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSetPath(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Body/Params Textarea */}
      <div className='mt-3'>
        <Label className='text-xs text-gray-400'>{bodyOrParamsLabel}</Label>
        <Textarea
          className='mt-2 h-32 w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-white'
          value={bodyOrParams}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onSetBodyOrParams(e.target.value)}
        />
      </div>

      {/* Send Button & Base URL */}
      <div className='mt-3 flex items-center gap-3'>
        <Button
          className='rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70'
          type='button'
          disabled={loading || !isConnected}
          onClick={onRequest}
        >
          {loading ? 'Sending...' : 'Send request'}
        </Button>
        {baseUrl && (
          <span className='text-xs text-gray-500'>
            Base URL: {baseUrl}
          </span>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant='error' className='mt-3 text-xs'>
          {error}
        </Alert>
      )}

      {/* Response Display */}
      {response && (
        <div className='mt-3 rounded-md border border-border bg-card p-3'>
          {(response.status || response.statusText) && (
            <div className='mb-2 text-xs text-gray-400'>
              Status:{' '}
              <span className='text-gray-200'>
                {response.status} {response.statusText}
              </span>
              {response.refreshed ? (
                <span className='ml-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200'>
                  Token refreshed
                </span>
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
