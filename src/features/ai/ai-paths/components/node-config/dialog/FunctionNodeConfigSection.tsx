'use client';

import React from 'react';

import type { FunctionConfig } from '@/shared/lib/ai-paths';
import { Textarea, Label, Input, SelectSimple } from '@/shared/ui';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

type FunctionExpectedType = NonNullable<FunctionConfig['expectedType']>;

const normalizeFunctionExpectedType = (value: string): FunctionExpectedType | undefined => {
  switch (value) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'object':
    case 'array':
      return value;
    default:
      return undefined;
  }
};

export function FunctionNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();

  if (selectedNode?.type !== 'function') return null;

  const functionConfig: FunctionConfig = selectedNode.config?.function ?? {
    script: '',
  };

  const handleScriptChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    updateSelectedNodeConfig({
      function: {
        ...functionConfig,
        script: event.target.value,
      },
    });
  };

  const handleContextJsonChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    updateSelectedNodeConfig({
      function: {
        ...functionConfig,
        contextJson: event.target.value,
      },
    });
  };

  const handleMaxExecutionMsChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const raw = event.target.value.trim();
    const next =
      raw.length === 0
        ? undefined
        : Number.isFinite(Number(raw))
          ? Number(raw)
          : functionConfig.maxExecutionMs;
    updateSelectedNodeConfig({
      function: {
        ...functionConfig,
        maxExecutionMs: next,
      },
    });
  };

  const handleMaxOutputBytesChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const raw = event.target.value.trim();
    const next =
      raw.length === 0
        ? undefined
        : Number.isFinite(Number(raw))
          ? Number(raw)
          : functionConfig.maxOutputBytes;
    updateSelectedNodeConfig({
      function: {
        ...functionConfig,
        maxOutputBytes: next,
      },
    });
  };

  const handleSafeModeToggle = (event: React.ChangeEvent<HTMLInputElement>): void => {
    updateSelectedNodeConfig({
      function: {
        ...functionConfig,
        safeMode: event.target.checked,
      },
    });
  };

  const handleExpectedTypeChange = (value: string): void => {
    updateSelectedNodeConfig({
      function: {
        ...functionConfig,
        expectedType: normalizeFunctionExpectedType(value),
      },
    });
  };

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Script</Label>
        <Textarea
          className='mt-2 min-h-[160px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-gray-100'
          placeholder={'// inputs, context are available\nreturn inputs.value;'}
          value={functionConfig.script}
          onChange={handleScriptChange}
          aria-label='Function script'
        />
        <p className='mt-2 text-[11px] text-gray-500'>
          The script runs as <span className='font-mono text-gray-300'>fn(inputs, context)</span>.
          Return either a single value (mapped to{' '}
          <span className='font-mono text-gray-300'>value</span>) or an object whose keys are mapped
          to output ports.
        </p>
        <p className='mt-1 text-[11px] text-gray-500'>
          Helpers are available on <span className='font-mono text-gray-300'>context.utils</span>:{' '}
          <span className='font-mono text-gray-300'>get(path, from)</span>,{' '}
          <span className='font-mono text-gray-300'>set(target, path, value)</span>,{' '}
          <span className='font-mono text-gray-300'>clone(value)</span>,{' '}
          <span className='font-mono text-gray-300'>ensureNumber(value, fallback)</span>.
        </p>
      </div>
      <div>
        <Label className='text-xs text-gray-400'>Context JSON (optional)</Label>
        <Textarea
          className='mt-2 min-h-[80px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-gray-100'
          placeholder='{"factor": 2, "mode": "debug"}'
          value={functionConfig.contextJson ?? ''}
          onChange={handleContextJsonChange}
          aria-label='Context JSON'
        />
        <p className='mt-2 text-[11px] text-gray-500'>
          Parsed once and passed as <span className='font-mono text-gray-300'>context</span>. If
          invalid, it is ignored.
        </p>
      </div>
      <div className='space-y-1 rounded-md border border-border bg-card/60 px-3 py-2'>
        <div className='flex items-center gap-2'>
          <input
            id='function-safe-mode'
            type='checkbox'
            className='h-3 w-3 accent-emerald-500'
            checked={Boolean(functionConfig.safeMode)}
            onChange={handleSafeModeToggle}
          />
          <Label htmlFor='function-safe-mode' className='text-xs text-gray-200'>
            Safe mode (block risky tokens)
          </Label>
        </div>
        <p className='mt-1 text-[11px] text-gray-500'>
          When enabled, scripts using obvious dangerous patterns like{' '}
          <span className='font-mono text-gray-300'>process.*</span>,{' '}
          <span className='font-mono text-gray-300'>require(...)</span>,{' '}
          <span className='font-mono text-gray-300'>eval(...)</span>, or{' '}
          <span className='font-mono text-gray-300'>window</span> are blocked with{' '}
          <span className='font-mono text-gray-300'>FUNCTION_SAFE_MODE_FORBIDDEN_TOKEN</span>.
        </p>
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Expected output type (optional)</Label>
        <SelectSimple
          size='sm'
          value={functionConfig.expectedType ?? ''}
          onValueChange={handleExpectedTypeChange}
          options={[
            { value: '', label: 'Any type' },
            { value: 'string', label: 'string' },
            { value: 'number', label: 'number' },
            { value: 'boolean', label: 'boolean' },
            { value: 'object', label: 'object' },
            { value: 'array', label: 'array' },
          ]}
          ariaLabel='Expected output type'
          placeholder='Any type'
          variant='subtle'
        />
        <p className='mt-1 text-[11px] text-gray-500'>
          When set, the runtime validates the <span className='font-mono text-gray-300'>value</span>{' '}
          output and fails with{' '}
          <span className='font-mono text-gray-300'>FUNCTION_OUTPUT_TYPE_MISMATCH</span> on
          mismatch.
        </p>
      </div>
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label className='text-xs text-gray-400'>Max execution time (ms, optional)</Label>
          <Input
            type='number'
            min={1}
            max={10000}
            className='h-8 rounded-md border border-border bg-card/70 text-xs text-gray-100'
            placeholder='e.g. 2000'
            value={functionConfig.maxExecutionMs?.toString() ?? ''}
            onChange={handleMaxExecutionMsChange}
            aria-label='Max execution time in milliseconds'
          />
          <p className='mt-1 text-[11px] text-gray-500'>
            Soft limit for this node&apos;s script. If execution exceeds this, the node fails with{' '}
            <span className='font-mono text-gray-300'>FUNCTION_EXECUTION_TIMEOUT</span>.
          </p>
        </div>
        <div className='space-y-2'>
          <Label className='text-xs text-gray-400'>Max output size (bytes, optional)</Label>
          <Input
            type='number'
            min={1024}
            max={512000}
            step={1024}
            className='h-8 rounded-md border border-border bg-card/70 text-xs text-gray-100'
            placeholder='e.g. 32768'
            value={functionConfig.maxOutputBytes?.toString() ?? ''}
            onChange={handleMaxOutputBytesChange}
            aria-label='Max output size in bytes'
          />
          <p className='mt-1 text-[11px] text-gray-500'>
            Soft limit on serialized outputs. If exceeded, the node fails with{' '}
            <span className='font-mono text-gray-300'>FUNCTION_OUTPUT_TOO_LARGE</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
