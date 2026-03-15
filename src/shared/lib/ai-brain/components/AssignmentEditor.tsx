'use client';

import React from 'react';

import { Checkbox, Input, Label, SelectSimple, Textarea } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useBrain } from '../context/BrainContext';
import { type AiBrainAssignment, type AiBrainProvider } from '../settings';

const providerOptions: Array<{ value: AiBrainProvider; label: string }> = [
  { value: 'model', label: 'Model' },
  { value: 'agent', label: 'Agent' },
];

export function AssignmentEditor(props: {
  assignment: AiBrainAssignment;
  onChange: (next: AiBrainAssignment) => void;
  readOnly?: boolean;
  allowedProviders?: AiBrainProvider[];
  showSystemPrompt?: boolean;
}): React.JSX.Element {
  const { assignment, onChange, readOnly, allowedProviders, showSystemPrompt = true } = props;

  const { modelQuickPicks, agentQuickPicks } = useBrain();
  const activeAllowedProviders =
    allowedProviders && allowedProviders.length > 0
      ? allowedProviders
      : providerOptions.map((option) => option.value);
  const filteredProviderOptions = providerOptions.filter((option) =>
    activeAllowedProviders.includes(option.value)
  );
  const resolvedProvider = activeAllowedProviders.includes(assignment.provider)
    ? assignment.provider
    : (activeAllowedProviders[0] ?? assignment.provider);
  const enabledCheckboxId = React.useId().replace(/:/g, '');

  const updateField = (patch: Partial<AiBrainAssignment>): void => {
    const next = {
      ...assignment,
      ...patch,
    };
    if (!activeAllowedProviders.includes(next.provider)) {
      next.provider = activeAllowedProviders[0] ?? 'model';
    }
    onChange(next);
  };

  return (
    <div className={cn('grid gap-3', readOnly ? 'opacity-70' : '')} aria-disabled={!!readOnly}>
      <div className='flex items-center gap-2 text-xs text-gray-300'>
        <Checkbox
          id={enabledCheckboxId}
          checked={assignment.enabled}
          onCheckedChange={(checked: boolean | 'indeterminate') =>
            updateField({ enabled: Boolean(checked) })
          }
          disabled={!!readOnly}
        />
        <Label htmlFor={enabledCheckboxId} className='cursor-pointer text-xs text-gray-300'>
          Enabled
        </Label>
      </div>

      <div className='grid gap-2 md:grid-cols-2'>
        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Provider</Label>
          <SelectSimple
            value={resolvedProvider}
            onValueChange={(value: string) => updateField({ provider: value as AiBrainProvider })}
            options={filteredProviderOptions}
            disabled={!!readOnly || filteredProviderOptions.length <= 1}
            placeholder='Select provider'
            ariaLabel='Provider'
           title='Select provider'/>
        </div>

        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Temperature</Label>
          <Input
            type='number'
            min={0}
            max={2}
            step={0.1}
            value={assignment.temperature ?? ''}
            aria-label='Temperature'
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField({
                temperature: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            disabled={!!readOnly}
           title='Input field'/>
        </div>

        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Model ID</Label>
          <Input
            value={assignment.modelId}
            aria-label='Model ID'
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField({ modelId: e.target.value })
            }
            placeholder='gpt-4o-mini'
            disabled={!!readOnly || resolvedProvider !== 'model'}
           title='gpt-4o-mini'/>
          {modelQuickPicks.length > 0 ? (
            <SelectSimple
              value=''
              onValueChange={(value: string) => updateField({ modelId: value })}
              options={modelQuickPicks}
              placeholder='Pick model preset'
              disabled={!!readOnly || resolvedProvider !== 'model'}
              size='sm'
              className='mt-1'
              ariaLabel='Model preset'
             title='Pick model preset'/>
          ) : null}
        </div>

        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Agent ID</Label>
          <Input
            value={assignment.agentId}
            aria-label='Agent ID'
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField({ agentId: e.target.value })
            }
            placeholder='agent_xxx'
            disabled={!!readOnly || resolvedProvider !== 'agent'}
           title='agent_xxx'/>
          {agentQuickPicks.length > 0 ? (
            <SelectSimple
              value=''
              onValueChange={(value: string) => updateField({ agentId: value })}
              options={agentQuickPicks}
              placeholder='Pick agent/persona preset'
              disabled={!!readOnly || resolvedProvider !== 'agent'}
              size='sm'
              className='mt-1'
              ariaLabel='Agent preset'
             title='Pick agent/persona preset'/>
          ) : null}
        </div>

        <div className='space-y-1 md:col-span-2'>
          <Label className='text-xs text-gray-400'>Max tokens</Label>
          <Input
            type='number'
            min={1}
            max={8192}
            step={1}
            value={assignment.maxTokens ?? ''}
            aria-label='Max tokens'
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField({ maxTokens: e.target.value === '' ? undefined : Number(e.target.value) })
            }
            disabled={!!readOnly}
           title='Input field'/>
        </div>
      </div>

      {showSystemPrompt ? (
        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>System prompt</Label>
          <Textarea
            value={assignment.systemPrompt ?? ''}
            aria-label='System prompt'
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              updateField({ systemPrompt: e.target.value })
            }
            placeholder='Optional system prompt enforced by Brain'
            disabled={!!readOnly}
            className='min-h-[120px]'
           title='Optional system prompt enforced by Brain'/>
        </div>
      ) : null}

      <div className='space-y-1'>
        <Label className='text-xs text-gray-400'>Notes</Label>
        <Textarea
          value={assignment.notes ?? ''}
          aria-label='Notes'
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            updateField({ notes: e.target.value })
          }
          placeholder='Optional notes for this assignment'
          disabled={!!readOnly}
         title='Optional notes for this assignment'/>
      </div>
    </div>
  );
}
