'use client';

import React from 'react';

import type { StateConfig } from '@/shared/lib/ai-paths';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Input,
} from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function StateNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (selectedNode?.type !== 'state') return null;

  const stateConfig: StateConfig = selectedNode.config?.state ?? {
    key: '',
    mode: 'read',
  };

  const handleKeyChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    updateSelectedNodeConfig({
      state: {
        ...stateConfig,
        key: event.target.value,
      },
    });
  };

  const handleModeChange = (value: string): void => {
    updateSelectedNodeConfig({
      state: {
        ...stateConfig,
        mode: value as StateConfig['mode'],
      },
    });
  };

  const handleInitialJsonChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    updateSelectedNodeConfig({
      state: {
        ...stateConfig,
        initialJson: event.target.value,
      },
    });
  };

  const handleMaxValueBytesChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const raw = event.target.value.trim();
    const next =
      raw.length === 0 ? undefined : Number.isFinite(Number(raw)) ? Number(raw) : stateConfig.maxValueBytes;
    updateSelectedNodeConfig({
      state: {
        ...stateConfig,
        maxValueBytes: next,
      },
    });
  };

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Variable key</Label>
        <Input
          className='h-8 rounded-md border border-border bg-card/70 text-xs text-gray-100'
          placeholder='e.g. totalCount'
          value={stateConfig.key ?? ''}
          onChange={handleKeyChange}
        />
        <p className='mt-1 text-[11px] text-gray-500'>
          Shared variable name in <span className='font-mono text-gray-300'>RuntimeState.variables</span>.
        </p>
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Mode</Label>
        <Select value={stateConfig.mode ?? 'read'} onValueChange={handleModeChange}>
          <SelectTrigger className='h-8 w-full rounded-md border border-border bg-card/70 text-xs text-gray-100'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='read'>Read (with optional default)</SelectItem>
            <SelectItem value='write'>Write from value input</SelectItem>
            <SelectItem value='increment'>Increment numeric value</SelectItem>
          </SelectContent>
        </Select>
        <p className='mt-1 text-[11px] text-gray-500'>
          In <span className='font-mono text-gray-300'>read</span> mode, the node outputs the current
          variable value (or default). In <span className='font-mono text-gray-300'>write</span> mode it
          stores <span className='font-mono text-gray-300'>inputs.value</span>. In{' '}
          <span className='font-mono text-gray-300'>increment</span> mode it adds{' '}
          <span className='font-mono text-gray-300'>inputs.delta</span> (default 1).
        </p>
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Initial value JSON (optional)</Label>
        <Textarea
          className='mt-1 min-h-[80px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-gray-100'
          placeholder='{"count": 0}'
          value={stateConfig.initialJson ?? ''}
          onChange={handleInitialJsonChange}
        />
        <p className='mt-1 text-[11px] text-gray-500'>
          Used only when the variable does not yet exist. If empty or invalid, the node will fall back to
          <span className='font-mono text-gray-300'> inputs.value</span> (for read) or numeric defaults
          (for increment).
        </p>
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Max stored size (bytes, optional)</Label>
        <Input
          type='number'
          min={1024}
          max={512000}
          step={1024}
          className='h-8 rounded-md border border-border bg-card/70 text-xs text-gray-100'
          placeholder='e.g. 32768'
          value={stateConfig.maxValueBytes?.toString() ?? ''}
          onChange={handleMaxValueBytesChange}
        />
        <p className='mt-1 text-[11px] text-gray-500'>
          Soft limit on serialized variable size. If exceeded, the node fails with{' '}
          <span className='font-mono text-gray-300'>STATE_VALUE_TOO_LARGE</span> instead of updating
          the shared variable.
        </p>
      </div>
    </div>
  );
}

