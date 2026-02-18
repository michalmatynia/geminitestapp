'use client';

import React from 'react';


import type { IteratorConfig } from '@/features/ai/ai-paths/lib';
import { formatRuntimeValue } from '@/features/ai/ai-paths/lib';
import { Input, Textarea, ToggleRow, FormField } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function IteratorNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, runtimeState, updateSelectedNodeConfig } = useAiPathConfig();

  if (selectedNode?.type !== 'iterator') return null;

  const iteratorConfig: IteratorConfig = selectedNode.config?.iterator ?? {
    autoContinue: true,
    maxSteps: 50,
  };

  const output = runtimeState.outputs[selectedNode.id] ?? {};
  const index = typeof output['index'] === 'number' ? output['index'] : 0;
  const total = typeof output['total'] === 'number' ? output['total'] : 0;
  const status = typeof output['status'] === 'string' ? output['status'] : 'idle';
  const done = typeof output['done'] === 'boolean' ? output['done'] : false;
  const value = output['value'];
  const callbackValue =
    runtimeState.inputs[selectedNode.id]?.['callback'] ?? output['callback'] ?? null;

  return (
    <div className='space-y-4'>
      <div className='rounded-md border border-border bg-card/50 p-3'>
        <div className='flex items-center justify-between'>
          <div className='text-[11px] text-gray-400'>Runtime</div>
          <div className='flex items-center gap-2 text-[11px]'>
            <span className='rounded-full border border-border bg-card/70 px-2 py-0.5 text-gray-200'>
              {total > 0 ? `${Math.min(index + 1, total)}/${total}` : '0/0'}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 ${
                status === 'completed'
                  ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                  : status === 'advance_pending'
                    ? 'border-amber-400/50 bg-amber-500/10 text-amber-200'
                    : status === 'waiting_callback'
                      ? 'border-sky-400/50 bg-sky-500/10 text-sky-200'
                      : 'border-border bg-card/70 text-gray-200'
              }`}
            >
              {status}
            </span>
            {done ? (
              <span className='rounded-full border border-emerald-400/50 bg-emerald-500/10 px-2 py-0.5 text-emerald-200'>
                done
              </span>
            ) : null}
          </div>
        </div>

        <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-2'>
          <FormField label='Current Item (value)'>
            <Textarea
              className='mt-2 min-h-[110px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-white'
              value={value !== undefined ? formatRuntimeValue(value) : ''}
              readOnly
              placeholder='No item emitted yet.'
            />
          </FormField>
          <FormField label='Callback Input'>
            <Textarea
              className='mt-2 min-h-[110px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-white'
              value={callbackValue !== undefined ? formatRuntimeValue(callbackValue) : ''}
              readOnly
              placeholder='Connect a downstream output to the callback input to advance.'
            />
          </FormField>
        </div>

        <p className='mt-2 text-[11px] text-gray-500'>
          The iterator emits one item on <span className='text-gray-300'>value</span> and waits.
          When <span className='text-gray-300'>callback</span> receives a new (changed) value, it advances.
          Best callback tokens: <span className='text-gray-300'>jobId</span> or{' '}
          <span className='text-gray-300'>result</span> from the processing node.
        </p>
      </div>

      <div className='rounded-md border border-border bg-card/50 p-3'>
        <div className='text-[11px] text-gray-400'>Behavior</div>
        
        <ToggleRow
          label='Auto-continue'
          description='When enabled, the UI/runtime will try to kick off the next item automatically.'
          checked={iteratorConfig.autoContinue ?? true}
          onCheckedChange={(checked: boolean) =>
            updateSelectedNodeConfig({
              iterator: { ...iteratorConfig, autoContinue: checked },
            })
          }
          className='mt-3 bg-transparent border-none p-0 hover:bg-transparent'
        />

        <div className='mt-3'>
          <FormField
            label='Max steps'
            description='Safety cap for automatic continuation loops.'
          >
            <Input
              className='mt-2 h-8 w-[140px] border-border bg-card/70 text-xs text-white'
              value={String(iteratorConfig.maxSteps ?? 50)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const next = Number.parseInt(event.target.value || '0', 10);
                updateSelectedNodeConfig({
                  iterator: {
                    ...iteratorConfig,
                    maxSteps: Number.isFinite(next) ? Math.max(1, next) : 50,
                  },
                });
              }}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}
