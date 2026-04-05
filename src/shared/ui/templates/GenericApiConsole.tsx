'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  ApiPreset,
  GenericApiConsoleConfig,
  GenericApiConsoleState,
  GenericApiConsoleProps,
} from '@/shared/contracts/ui';
import { Button, Input, Textarea, Alert, Badge, Card } from '@/shared/ui/primitives.public';
import { SelectSimple, FormField } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

export type {
  ApiPreset,
  GenericApiConsoleConfig,
  GenericApiConsoleState,
  GenericApiConsoleProps,
};

const METHOD_OPTIONS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

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
export function GenericApiConsole(props: GenericApiConsoleProps): React.JSX.Element {
  const {
    config,
    state,
    presets,
    isConnected = true,
    onSetMethod,
    onSetPath,
    onSetBodyOrParams,
    onRequest,
  } = props;

  const {
    title,
    description,
    baseUrl,
    methodType = 'select',
    bodyOrParamsLabel = 'Body or Parameters',
    connectionWarning,
  } = config;

  const { method, path, bodyOrParams, loading, error, response } = state;

  const handlePresetClick = (preset: ApiPreset) => {
    onSetMethod(preset.method);
    if (onSetPath && preset.path) {
      onSetPath(preset.path);
    }
    const val =
      preset.body ||
      (typeof preset.params === 'object' ? JSON.stringify(preset.params, null, 2) : preset.params);
    onSetBodyOrParams(val || '{}');
  };

  return (
    <Card variant='subtle' padding='md' className='bg-card/60'>
      {/* Header */}
      <div className='mb-3'>
        <h3 className='text-sm font-semibold text-white'>{title}</h3>
        <p className='text-xs text-gray-400'>{description}</p>
      </div>

      {/* Presets */}
      <div className='mb-3 flex flex-wrap gap-2'>
        {presets.map((preset: ApiPreset) => (
          <Badge
            key={preset.label}
            variant='neutral'
            className='h-7 rounded-full px-3 text-[11px] cursor-pointer hover:bg-muted/80 hover:text-white'
            onClick={() => handlePresetClick(preset)}
          >
            {preset.label}
          </Badge>
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
        <FormField label='Method'>
          {methodType === 'select' ? (
            <SelectSimple
              options={METHOD_OPTIONS}
              value={method}
              onValueChange={onSetMethod}
              placeholder='Method'
              variant='subtle'
              size='sm'
              triggerClassName='w-full'
             ariaLabel='Method' title='Method'/>
          ) : (
            <Input
              variant='subtle'
              size='sm'
              value={method}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSetMethod(e.target.value)}
             aria-label='Method' title='Method'/>
          )}
        </FormField>
        {onSetPath && (
          <FormField label='Endpoint path'>
            <Input
              variant='subtle'
              size='sm'
              value={path || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSetPath(e.target.value)}
             aria-label='Endpoint path' title='Endpoint path'/>
          </FormField>
        )}
      </div>

      {/* Body/Params Textarea */}
      <div className='mt-3'>
        <FormField label={bodyOrParamsLabel}>
          <Textarea
            variant='subtle'
            size='sm'
            className='h-32 font-mono'
            value={bodyOrParams}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              onSetBodyOrParams(e.target.value)
            }
           aria-label={bodyOrParamsLabel} title={bodyOrParamsLabel}/>
        </FormField>
      </div>

      {/* Send Button & Base URL */}
      <div className={`${UI_CENTER_ROW_SPACED_CLASSNAME} mt-3`}>
        <Button type='button' disabled={loading || !isConnected} onClick={onRequest} size='sm'>
          {loading ? 'Sending...' : 'Send request'}
        </Button>
        {baseUrl && <span className='text-xs text-gray-500'>Base URL: {baseUrl}</span>}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant='error' className='mt-3 text-xs'>
          {error}
        </Alert>
      )}

      {/* Response Display */}
      {response && (
        <Card variant='subtle-compact' padding='sm' className='mt-3 bg-card'>
          {(response.status || response.statusText) && (
            <div className='mb-2 text-xs text-gray-400'>
              Status:{' '}
              <span className='text-gray-200'>
                {response.status} {response.statusText}
              </span>
              {response.refreshed ? (
                <StatusBadge
                  status='Token refreshed'
                  variant='success'
                  size='sm'
                  className='ml-2 font-bold'
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
