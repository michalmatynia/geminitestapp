'use client';

import React from 'react';

import type { BrainModelDescriptor, BrainModelVendor } from '@/shared/contracts/ai-brain';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { BrainModelFamily } from '@/shared/lib/ai-brain/settings';
import { inferBrainModelVendor } from '@/shared/lib/ai-brain/model-vendor';
import { Badge } from '@/shared/ui/primitives.public';
import { Checkbox, Input, Label, Textarea } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { cn } from '@/shared/utils/ui-utils';

import { useBrain } from '../context/BrainContext';
import { type AiBrainAssignment, type AiBrainProvider } from '../settings';

const providerOptions: Array<LabeledOptionDto<AiBrainProvider>> = [
  { value: 'model', label: 'Model' },
  { value: 'agent', label: 'Agent' },
];

const VENDOR_LABELS: Record<BrainModelVendor, string> = {
  openai: 'GPT',
  anthropic: 'Claude',
  gemini: 'Gemini',
  ollama: 'Ollama',
};

const VENDOR_COLORS: Record<BrainModelVendor, string> = {
  openai: 'border-emerald-600/60 text-emerald-300',
  anthropic: 'border-amber-600/60 text-amber-300',
  gemini: 'border-blue-600/60 text-blue-300',
  ollama: 'border-gray-600/60 text-gray-400',
};

const API_KEY_PLACEHOLDERS: Record<BrainModelVendor, string> = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  gemini: 'AIza...',
  ollama: '',
};

function VendorBadge({ modelId }: { modelId: string }): React.JSX.Element | null {
  if (!modelId.trim()) return null;
  const vendor = inferBrainModelVendor(modelId);
  return (
    <Badge
      variant='outline'
      className={cn('h-4 px-1.5 text-[10px] font-medium', VENDOR_COLORS[vendor])}
    >
      {VENDOR_LABELS[vendor]}
    </Badge>
  );
}

const filterQuickPicksByFamily = (
  modelQuickPicks: ReturnType<typeof useBrain>['modelQuickPicks'],
  modelDescriptors: Record<string, BrainModelDescriptor>,
  modelFamily: BrainModelFamily | undefined
): ReturnType<typeof useBrain>['modelQuickPicks'] => {
  if (!modelFamily) return modelQuickPicks;
  return modelQuickPicks.filter((opt) => {
    const descriptor = modelDescriptors[opt.value];
    if (!descriptor?.family) return true;
    return descriptor.family === modelFamily;
  });
};

export function AssignmentEditor(props: {
  assignment: AiBrainAssignment;
  onChange: (next: AiBrainAssignment) => void;
  readOnly?: boolean;
  allowedProviders?: AiBrainProvider[];
  showSystemPrompt?: boolean;
  modelFamily?: BrainModelFamily;
}): React.JSX.Element {
  const {
    assignment,
    onChange,
    readOnly,
    allowedProviders,
    showSystemPrompt = true,
    modelFamily,
  } = props;

  const { modelQuickPicks, modelDescriptors, agentQuickPicks } = useBrain();
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

  const filteredModelPicks = filterQuickPicksByFamily(
    modelQuickPicks,
    modelDescriptors,
    modelFamily
  );

  const selectedVendor =
    resolvedProvider === 'model' && assignment.modelId.trim()
      ? inferBrainModelVendor(assignment.modelId)
      : null;
  const isApiVendor = selectedVendor !== null && selectedVendor !== 'ollama';
  const apiKeyPlaceholder = selectedVendor ? API_KEY_PLACEHOLDERS[selectedVendor] : '';

  const updateField = (patch: Partial<AiBrainAssignment>): void => {
    const next = { ...assignment, ...patch };
    if (!activeAllowedProviders.includes(next.provider)) {
      next.provider = activeAllowedProviders[0] ?? 'model';
    }
    onChange(next);
  };

  return (
    <div className={cn('grid gap-3', readOnly ? 'opacity-70' : '')} aria-disabled={Boolean(readOnly)}>
      <div className='flex items-center gap-2 text-xs text-gray-300'>
        <Checkbox
          id={enabledCheckboxId}
          checked={assignment.enabled}
          onCheckedChange={(checked: boolean | 'indeterminate') =>
            updateField({ enabled: Boolean(checked) })
          }
          disabled={Boolean(readOnly)}
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
            disabled={Boolean(readOnly) || filteredProviderOptions.length <= 1}
            placeholder='Select provider'
            ariaLabel='Provider'
            title='Select provider'
          />
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
            disabled={Boolean(readOnly)}
            title='Input field'
          />
        </div>

        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>
            Model ID
          </Label>
          <div className='flex items-center gap-1.5'>
            <Input
              value={assignment.modelId}
              aria-label='Model ID'
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateField({ modelId: e.target.value })
              }
              placeholder='gpt-4o-mini'
              disabled={Boolean(readOnly) || resolvedProvider !== 'model'}
              title='gpt-4o-mini'
              className='flex-1'
            />
            <VendorBadge modelId={assignment.modelId} />
          </div>
          {filteredModelPicks.length > 0 ? (
            <SelectSimple
              value=''
              onValueChange={(value: string) => updateField({ modelId: value })}
              options={filteredModelPicks}
              placeholder={
                modelFamily === 'image_generation'
                  ? 'Pick image generation model'
                  : 'Pick model preset'
              }
              disabled={Boolean(readOnly) || resolvedProvider !== 'model'}
              size='sm'
              className='mt-1'
              ariaLabel='Model preset'
              title='Pick model preset'
            />
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
            disabled={Boolean(readOnly) || resolvedProvider !== 'agent'}
            title='agent_xxx'
          />
          {agentQuickPicks.length > 0 ? (
            <SelectSimple
              value=''
              onValueChange={(value: string) => updateField({ agentId: value })}
              options={agentQuickPicks}
              placeholder='Pick agent/persona preset'
              disabled={Boolean(readOnly) || resolvedProvider !== 'agent'}
              size='sm'
              className='mt-1'
              ariaLabel='Agent preset'
              title='Pick agent/persona preset'
            />
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
            disabled={Boolean(readOnly)}
            title='Input field'
          />
        </div>

        {isApiVendor ? (
          <div className='space-y-1 md:col-span-2'>
            <Label className='text-xs text-gray-400'>
              API key override{' '}
              <span className='font-normal text-gray-500'>(leave blank to use Brain global key)</span>
            </Label>
            <Input
              type='password'
              value={assignment.apiKey ?? ''}
              aria-label='API key override'
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateField({ apiKey: e.target.value === '' ? undefined : e.target.value })
              }
              placeholder={apiKeyPlaceholder}
              disabled={Boolean(readOnly)}
              title='API key override for this capability'
            />
          </div>
        ) : null}
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
            disabled={Boolean(readOnly)}
            className='min-h-[120px]'
            title='Optional system prompt enforced by Brain'
          />
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
          disabled={Boolean(readOnly)}
          title='Optional notes for this assignment'
        />
      </div>
    </div>
  );
}
