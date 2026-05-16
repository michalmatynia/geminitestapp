'use client';

/**
 * Assignment Editor Component
 * 
 * Main UI component for configuring AI Brain assignments.
 * Manages the form state and orchestration of model selection,
 * provider-specific settings, and credential management.
 * 
 * Features:
 * - Dynamic Form Generation: Renders fields based on the selected provider/vendor.
 * - State Management: Handles patching and validation of assignment configurations.
 * - Reactive UI: Updates based on selected AI model family and vendor.
 * 
 * Usage:
 * Typically used within the Brain routing or assignment management pages.
 */

import React from 'react';

import type { BrainModelVendor } from '@/shared/contracts/ai-brain';
import type { SelectSimpleOption } from '@/shared/contracts/ui/controls';
import type { BrainModelFamily } from '@/shared/lib/ai-brain/settings';
import { cn } from '@/shared/utils/ui-utils';

import { useBrain } from '../context/BrainContext';
import type { AiBrainAssignment, AiBrainProvider } from '../settings';
import { ApiKeyField } from './AssignmentEditor.api-key-field';
import {
  AgentField,
  EnabledField,
  ModelField,
  NumberField,
  ProviderField,
  TextAreaField,
} from './AssignmentEditor.fields';
import {
  filterQuickPicksByFamily,
  getActiveAllowedProviders,
  type AssignmentPatchHandler,
  providerOptions,
  resolveProvider,
  resolveSelectedVendor,
} from './AssignmentEditor.helpers';

type AssignmentEditorProps = {
  /** The current assignment state to edit */
  assignment: AiBrainAssignment;
  /** Callback for when the assignment state changes */
  onChange: (next: AiBrainAssignment) => void;
  /** Whether the editor is in read-only mode */
  readOnly?: boolean;
  /** Optional filter for available providers */
  allowedProviders?: AiBrainProvider[];
  /** Flag to show system prompt editing section */
  showSystemPrompt?: boolean;
  /** Flag to show model ID input field */
  showModelIdInput?: boolean;
  /** Model family filter */
  modelFamily?: BrainModelFamily;
};

type AssignmentEditorFieldsProps = {
  agentPicks: SelectSimpleOption[];
  assignment: AiBrainAssignment;
  disabled: boolean;
  enabledCheckboxId: string;
  modelFamily: BrainModelFamily | undefined;
  modelPicks: SelectSimpleOption[];
  providerSelectOptions: typeof providerOptions;
  resolvedProvider: AiBrainProvider;
  selectedVendor: BrainModelVendor | null;
  showModelIdInput: boolean;
  showSystemPrompt: boolean;
  updateField: AssignmentPatchHandler;
};

/**
 * Field for configuring max token limit.
 */
function MaxTokensField(props: {
  assignment: AiBrainAssignment;
  disabled: boolean;
  updateField: AssignmentPatchHandler;
}): React.JSX.Element {
  const { assignment, disabled, updateField } = props;
  return (
    <div className='md:col-span-2'>
      <NumberField
        label='Max tokens'
        value={assignment.maxTokens}
        min={1}
        max={8192}
        step={1}
        disabled={disabled}
        field='maxTokens'
        updateField={updateField}
      />
    </div>
  );
}

/**
 * Conditionally displays an API key field for override scenarios.
 */
function OptionalApiKeyField(props: {
  assignment: AiBrainAssignment;
  disabled: boolean;
  selectedVendor: BrainModelVendor | null;
  updateField: AssignmentPatchHandler;
}): React.JSX.Element | null {
  const { assignment, disabled, selectedVendor, updateField } = props;
  const overrideActive =
    typeof assignment.apiKey === 'string' && assignment.apiKey.trim().length > 0;
  if ((selectedVendor === null || selectedVendor === 'ollama') && !overrideActive) return null;
  return (
    <ApiKeyField
      assignment={assignment}
      disabled={disabled}
      selectedVendor={
        selectedVendor === null || selectedVendor === 'ollama' ? 'openai' : selectedVendor
      }
      updateField={updateField}
    />
  );
}

function AssignmentFieldsGrid(props: AssignmentEditorFieldsProps): React.JSX.Element {
  const {
    agentPicks,
    assignment,
    disabled,
    modelFamily,
    modelPicks,
    providerSelectOptions,
    resolvedProvider,
    selectedVendor,
    showModelIdInput,
    updateField,
  } = props;
  return (
    <div className='grid gap-2 md:grid-cols-2'>
      <ProviderField
        disabled={disabled}
        options={providerSelectOptions}
        resolvedProvider={resolvedProvider}
        updateField={updateField}
      />
      <NumberField
        label='Temperature'
        value={assignment.temperature}
        min={0}
        max={2}
        step={0.1}
        disabled={disabled}
        field='temperature'
        updateField={updateField}
      />
      <ModelField
        assignment={assignment}
        disabled={disabled}
        modelFamily={modelFamily}
        modelPicks={modelPicks}
        resolvedProvider={resolvedProvider}
        showModelIdInput={showModelIdInput}
        updateField={updateField}
      />
      <AgentField
        agentPicks={agentPicks}
        assignment={assignment}
        disabled={disabled}
        resolvedProvider={resolvedProvider}
        updateField={updateField}
      />
      <MaxTokensField assignment={assignment} disabled={disabled} updateField={updateField} />
      <OptionalApiKeyField
        assignment={assignment}
        disabled={disabled}
        selectedVendor={selectedVendor}
        updateField={updateField}
      />
    </div>
  );
}

function AssignmentTextFields(props: {
  assignment: AiBrainAssignment;
  disabled: boolean;
  showSystemPrompt: boolean;
  updateField: AssignmentPatchHandler;
}): React.JSX.Element {
  const { assignment, disabled, showSystemPrompt, updateField } = props;
  return (
    <>
      {showSystemPrompt ? (
        <TextAreaField
          label='System prompt'
          value={assignment.systemPrompt}
          placeholder='Optional system prompt enforced by Brain'
          disabled={disabled}
          minHeight
          onChange={(value) => updateField({ systemPrompt: value })}
        />
      ) : null}
      <TextAreaField
        label='Notes'
        value={assignment.notes}
        placeholder='Optional notes for this assignment'
        disabled={disabled}
        onChange={(value) => updateField({ notes: value })}
      />
    </>
  );
}

function AssignmentEditorFields(props: AssignmentEditorFieldsProps): React.JSX.Element {
  const { assignment, disabled, enabledCheckboxId, updateField } = props;
  return (
    <>
      <EnabledField
        assignment={assignment}
        disabled={disabled}
        enabledCheckboxId={enabledCheckboxId}
        updateField={updateField}
      />
      <AssignmentFieldsGrid {...props} />
      <AssignmentTextFields
        assignment={assignment}
        disabled={disabled}
        showSystemPrompt={props.showSystemPrompt}
        updateField={updateField}
      />
    </>
  );
}

export function AssignmentEditor(props: AssignmentEditorProps): React.JSX.Element {
  const {
    assignment,
    allowedProviders,
    modelFamily,
    onChange,
    readOnly,
    showModelIdInput = true,
    showSystemPrompt = true,
  } = props;
  const { modelQuickPicks, modelDescriptors, agentQuickPicks } = useBrain();
  const disabled = readOnly === true;
  const activeAllowedProviders = getActiveAllowedProviders(allowedProviders);
  const providerSelectOptions = providerOptions.filter((option) =>
    activeAllowedProviders.includes(option.value)
  );
  const resolvedProvider = resolveProvider(assignment.provider, activeAllowedProviders);
  const selectedVendor = resolveSelectedVendor(resolvedProvider, assignment.modelId, modelDescriptors);
  const enabledCheckboxId = React.useId().replace(/:/g, '');
  const modelPicks = filterQuickPicksByFamily(modelQuickPicks, modelDescriptors, modelFamily);
  const updateField = (patch: Partial<AiBrainAssignment>): void => {
    const next = { ...assignment, ...patch };
    next.provider = activeAllowedProviders.includes(next.provider)
      ? next.provider
      : (activeAllowedProviders[0] ?? 'model');
    onChange(next);
  };

  return (
    <div className={cn('grid gap-3', disabled ? 'opacity-70' : '')} aria-disabled={disabled}>
      <AssignmentEditorFields
        agentPicks={agentQuickPicks}
        assignment={assignment}
        disabled={disabled}
        enabledCheckboxId={enabledCheckboxId}
        modelFamily={modelFamily}
        modelPicks={modelPicks}
        providerSelectOptions={providerSelectOptions}
        resolvedProvider={resolvedProvider}
        selectedVendor={selectedVendor}
        showModelIdInput={showModelIdInput}
        showSystemPrompt={showSystemPrompt}
        updateField={updateField}
      />
    </div>
  );
}
