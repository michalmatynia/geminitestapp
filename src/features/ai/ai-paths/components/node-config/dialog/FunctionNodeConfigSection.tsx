'use client';

import React from 'react';

import type { FunctionConfig } from '@/shared/lib/ai-paths';
import { Textarea, Label, Input } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function FunctionNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

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

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Script</Label>
        <Textarea
          className='mt-2 min-h-[160px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-gray-100'
          placeholder={'// inputs, context are available\nreturn inputs.value;'}
          value={functionConfig.script}
          onChange={handleScriptChange}
        />
        <p className='mt-2 text-[11px] text-gray-500'>
          The script runs as{' '}
          <span className='font-mono text-gray-300'>fn(inputs, context)</span>. Return either a
          single value (mapped to <span className='font-mono text-gray-300'>value</span>) or an
          object whose keys are mapped to output ports.
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
        />
        <p className='mt-2 text-[11px] text-gray-500'>
          Parsed once and passed as <span className='font-mono text-gray-300'>context</span>. If
          invalid, it is ignored.
        </p>
      </div>
    </div>
  );
}

