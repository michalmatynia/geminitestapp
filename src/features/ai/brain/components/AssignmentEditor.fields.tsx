'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { SelectSimpleOption } from '@/shared/contracts/ui/controls';
import type { BrainModelFamily } from '@/shared/lib/ai-brain/settings';
import { inferBrainModelVendor } from '@/shared/lib/ai-brain/model-vendor';
import { Badge, Checkbox, Input, Label, Textarea } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { cn } from '@/shared/utils/ui-utils';

import type { AiBrainAssignment, AiBrainProvider } from '../settings';
import {
  type AssignmentPatchHandler,
  VENDOR_COLORS,
  VENDOR_LABELS,
} from './AssignmentEditor.helpers';

type ModelFieldProps = {
  assignment: AiBrainAssignment;
  disabled: boolean;
  modelFamily: BrainModelFamily | undefined;
  modelPicks: SelectSimpleOption[];
  resolvedProvider: AiBrainProvider;
  showModelIdInput: boolean;
  updateField: AssignmentPatchHandler;
};

type AgentFieldProps = {
  agentPicks: SelectSimpleOption[];
  assignment: AiBrainAssignment;
  disabled: boolean;
  resolvedProvider: AiBrainProvider;
  updateField: AssignmentPatchHandler;
};

function VendorBadge({ modelId }: { modelId: string }): React.JSX.Element | null {
  if (modelId.trim().length === 0) return null;
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

const resolveSelectedModelPickValue = (
  modelPicks: SelectSimpleOption[],
  modelId: string
): string => (modelPicks.some((option) => option.value === modelId) ? modelId : '');

const resolveModelPresetOptions = (
  modelPicks: SelectSimpleOption[],
  modelId: string
): SelectSimpleOption[] => {
  const trimmedModelId = modelId.trim();
  if (trimmedModelId.length === 0 || modelPicks.some((option) => option.value === trimmedModelId)) {
    return modelPicks;
  }
  return [
    {
      value: trimmedModelId,
      label: trimmedModelId,
      description: 'current',
    },
    ...modelPicks,
  ];
};

const getModelPresetPlaceholder = (modelFamily: BrainModelFamily | undefined): string =>
  modelFamily === 'image_generation' ? 'Pick image generation model' : 'Pick model preset';

function ModelIdInputBlock(props: {
  assignment: AiBrainAssignment;
  disabled: boolean;
  resolvedProvider: AiBrainProvider;
  showModelIdInput: boolean;
  updateField: AssignmentPatchHandler;
}): React.JSX.Element | null {
  const { assignment, disabled, resolvedProvider, showModelIdInput, updateField } = props;
  if (!showModelIdInput) return null;
  return (
    <div className='flex items-center gap-1.5'>
      <Input
        value={assignment.modelId}
        aria-label='Model ID'
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          updateField({ modelId: e.target.value })
        }
        placeholder='gpt-4o-mini'
        disabled={disabled || resolvedProvider !== 'model'}
        title='gpt-4o-mini'
        className='flex-1'
      />
      <VendorBadge modelId={assignment.modelId} />
    </div>
  );
}

function ModelPresetPicker(props: ModelFieldProps): React.JSX.Element | null {
  const {
    assignment,
    disabled,
    modelFamily,
    modelPicks,
    resolvedProvider,
    showModelIdInput,
    updateField,
  } = props;
  if (modelPicks.length === 0) return null;
  const options = resolveModelPresetOptions(modelPicks, assignment.modelId);
  return (
    <div className='flex items-center gap-1.5'>
      <SelectSimple
        value={resolveSelectedModelPickValue(options, assignment.modelId.trim())}
        onValueChange={(value: string) => updateField({ modelId: value })}
        options={options}
        placeholder={getModelPresetPlaceholder(modelFamily)}
        disabled={disabled || resolvedProvider !== 'model'}
        size='sm'
        className='mt-1 flex-1'
        ariaLabel='Model preset'
        title='Pick model preset'
      />
      {!showModelIdInput ? <VendorBadge modelId={assignment.modelId} /> : null}
    </div>
  );
}

export function EnabledField(props: {
  assignment: AiBrainAssignment;
  disabled: boolean;
  enabledCheckboxId: string;
  updateField: AssignmentPatchHandler;
}): React.JSX.Element {
  const { assignment, disabled, enabledCheckboxId, updateField } = props;
  return (
    <div className='flex items-center gap-2 text-xs text-gray-300'>
      <Checkbox
        id={enabledCheckboxId}
        checked={assignment.enabled}
        onCheckedChange={(checked: boolean | 'indeterminate') =>
          updateField({ enabled: Boolean(checked) })
        }
        disabled={disabled}
      />
      <Label htmlFor={enabledCheckboxId} className='cursor-pointer text-xs text-gray-300'>
        Enabled
      </Label>
    </div>
  );
}

export function ProviderField(props: {
  disabled: boolean;
  options: Array<LabeledOptionDto<AiBrainProvider>>;
  resolvedProvider: AiBrainProvider;
  updateField: AssignmentPatchHandler;
}): React.JSX.Element {
  const { disabled, options, resolvedProvider, updateField } = props;
  return (
    <div className='space-y-1'>
      <Label className='text-xs text-gray-400'>Provider</Label>
      <SelectSimple
        value={resolvedProvider}
        onValueChange={(value: string) => updateField({ provider: value as AiBrainProvider })}
        options={options}
        disabled={disabled || options.length <= 1}
        placeholder='Select provider'
        ariaLabel='Provider'
        title='Select provider'
      />
    </div>
  );
}

export function NumberField(props: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  field: 'temperature' | 'maxTokens';
  updateField: AssignmentPatchHandler;
}): React.JSX.Element {
  const { disabled, field, label, max, min, step, updateField, value } = props;
  return (
    <div className='space-y-1'>
      <Label className='text-xs text-gray-400'>{label}</Label>
      <Input
        type='number'
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        aria-label={label}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          updateField({ [field]: e.target.value === '' ? undefined : Number(e.target.value) })
        }
        disabled={disabled}
        title='Input field'
      />
    </div>
  );
}

export function ModelField(props: ModelFieldProps): React.JSX.Element {
  const { assignment, disabled, resolvedProvider, showModelIdInput, updateField } = props;
  const label = showModelIdInput ? 'Model ID' : 'Model';
  return (
    <div className='space-y-1'>
      <Label className='text-xs text-gray-400'>{label}</Label>
      <ModelIdInputBlock
        assignment={assignment}
        disabled={disabled}
        resolvedProvider={resolvedProvider}
        showModelIdInput={showModelIdInput}
        updateField={updateField}
      />
      <ModelPresetPicker {...props} />
    </div>
  );
}

export function AgentField(props: AgentFieldProps): React.JSX.Element {
  const { agentPicks, assignment, disabled, resolvedProvider, updateField } = props;
  return (
    <div className='space-y-1'>
      <Label className='text-xs text-gray-400'>Agent ID</Label>
      <Input
        value={assignment.agentId}
        aria-label='Agent ID'
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          updateField({ agentId: e.target.value })
        }
        placeholder='agent_xxx'
        disabled={disabled || resolvedProvider !== 'agent'}
        title='agent_xxx'
      />
      {agentPicks.length > 0 ? (
        <SelectSimple
          value=''
          onValueChange={(value: string) => updateField({ agentId: value })}
          options={agentPicks}
          placeholder='Pick agent/persona preset'
          disabled={disabled || resolvedProvider !== 'agent'}
          size='sm'
          className='mt-1'
          ariaLabel='Agent preset'
          title='Pick agent/persona preset'
        />
      ) : null}
    </div>
  );
}

export function TextAreaField(props: {
  label: string;
  value: string | null | undefined;
  placeholder: string;
  disabled: boolean;
  minHeight?: boolean;
  onChange: (value: string) => void;
}): React.JSX.Element {
  const { disabled, label, minHeight = false, onChange, placeholder, value } = props;
  return (
    <div className='space-y-1'>
      <Label className='text-xs text-gray-400'>{label}</Label>
      <Textarea
        value={value ?? ''}
        aria-label={label}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={minHeight ? 'min-h-[120px]' : undefined}
        title={placeholder}
      />
    </div>
  );
}
