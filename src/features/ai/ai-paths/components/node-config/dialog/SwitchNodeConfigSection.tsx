'use client';

import React from 'react';

import type { SwitchConfig, SwitchCaseConfig } from '@/shared/lib/ai-paths';
import { Button, FormField, Input, Label } from '@/shared/ui';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

function createCaseId(): string {
  return `case-${Math.random().toString(36).slice(2, 9)}`;
}

export function SwitchNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();

  if (selectedNode?.type !== 'switch') return null;

  const config: SwitchConfig = selectedNode.config?.switch ?? {
    inputPort: 'value',
    cases: [],
  };

  const updateConfig = (patch: Partial<SwitchConfig>): void => {
    updateSelectedNodeConfig({ switch: { ...config, ...patch } });
  };

  const updateCase = (index: number, patch: Partial<SwitchCaseConfig>): void => {
    const next = (config.cases ?? []).map((c, i) => (i === index ? { ...c, ...patch } : c));
    updateConfig({ cases: next });
  };

  const removeCase = (index: number): void => {
    updateConfig({ cases: (config.cases ?? []).filter((_, i) => i !== index) });
  };

  const addCase = (): void => {
    const next: SwitchCaseConfig = {
      id: createCaseId(),
      matchValue: '',
    };
    updateConfig({ cases: [...(config.cases ?? []), next] });
  };

  return (
    <div className='space-y-4'>
      <FormField label='Input port'>
        <Input
          variant='subtle'
          size='sm'
          placeholder='value'
          value={config.inputPort ?? 'value'}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateConfig({ inputPort: event.target.value || 'value' })
          }
        />
        <p className='mt-1 text-[11px] text-gray-500'>
          Port whose value will be compared against each case&apos;s match value (string compare).
        </p>
      </FormField>

      <div className='space-y-3'>
        <Label className='text-xs text-gray-400'>Cases</Label>
        {(config.cases ?? []).length === 0 && (
          <div className='rounded-md border border-border bg-card/30 px-3 py-2 text-xs text-gray-500'>
            No cases defined — the node will always output the input value with{' '}
            <span className='font-mono text-gray-300'>caseId = null</span>.
          </div>
        )}
        {(config.cases ?? []).map((c, index) => (
          <div
            key={c.id ?? index}
            className='space-y-2 rounded-md border border-border bg-card/40 p-3'
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='text-xs font-semibold text-white'>Case {index + 1}</span>
              <Button
                type='button'
                variant='ghost'
                size='xs'
                className='h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10'
                onClick={(): void => removeCase(index)}
              >
                Remove
              </Button>
            </div>
            <FormField label='Case ID'>
              <Input
                variant='subtle'
                size='sm'
                placeholder='e.g. equals_foo'
                value={c.id}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  updateCase(index, { id: event.target.value || createCaseId() })
                }
              />
            </FormField>
            <FormField label='Match value'>
              <Input
                variant='subtle'
                size='sm'
                placeholder='e.g. foo'
                value={c.matchValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  updateCase(index, { matchValue: event.target.value })
                }
              />
            </FormField>
          </div>
        ))}

        <Button
          type='button'
          variant='outline'
          size='sm'
          className='w-full border-dashed'
          onClick={addCase}
        >
          + Add Case
        </Button>
      </div>
    </div>
  );
}
