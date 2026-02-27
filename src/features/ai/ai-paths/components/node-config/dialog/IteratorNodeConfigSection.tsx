'use client';

import React from 'react';


import type { IteratorConfig } from '@/shared/lib/ai-paths';
import { formatRuntimeValue } from '@/shared/lib/ai-paths';
import { Input, Textarea, ToggleRow, FormField, Card, Badge, StatusBadge } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function IteratorNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, runtimeState, updateSelectedNodeConfig } = useAiPathConfig();

  if (selectedNode?.type !== 'iterator') return null;

  const iteratorConfig: IteratorConfig = selectedNode.config?.iterator ?? {
    autoContinue: true,
    maxSteps: 50,
  };

  const output = runtimeState.outputs?.[selectedNode.id] ?? {};
  const index = typeof output['index'] === 'number' ? output['index'] : 0;
  const total = typeof output['total'] === 'number' ? output['total'] : 0;
  const status = typeof output['status'] === 'string' ? output['status'] : 'idle';
  const done = typeof output['done'] === 'boolean' ? output['done'] : false;
  const value = output['value'];
  const callbackValue =
    runtimeState.inputs?.[selectedNode.id]?.['callback'] ?? output['callback'] ?? null;

  return (
    <div className='space-y-4'>
      <Card variant='subtle-compact' padding='sm' className='border-border bg-card/50'>
        <div className='flex items-center justify-between'>
          <div className='text-[11px] text-gray-400'>Runtime</div>
          <div className='flex items-center gap-2 text-[11px]'>
            <Badge variant='outline' className='bg-card/70 font-normal'>
              {total > 0 ? `${Math.min(index + 1, total)}/${total}` : '0/0'}
            </Badge>
            <StatusBadge
              status={status}
              variant={
                status === 'completed'
                  ? 'success'
                  : status === 'advance_pending'
                    ? 'warning'
                    : status === 'waiting_callback'
                      ? 'info'
                      : 'neutral'
              }
              size='sm'
              className='font-bold'
            />
            {done ? (
              <Badge variant='success' className='font-bold'>
                done
              </Badge>
            ) : null}
          </div>
        </div>

        <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-2'>
          <FormField label='Current Item (value)'>
            <Textarea
              variant='subtle'
              size='sm'
              className='min-h-[110px] font-mono'
              value={value !== undefined ? formatRuntimeValue(value) : ''}
              readOnly
              placeholder='No item emitted yet.'
            />
          </FormField>
          <FormField label='Callback Input'>
            <Textarea
              variant='subtle'
              size='sm'
              className='min-h-[110px] font-mono'
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
      </Card>

      <Card variant='subtle-compact' padding='sm' className='border-border bg-card/50'>
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
              variant='subtle'
              size='sm'
              className='w-[140px]'
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
      </Card>
    </div>
  );
}
