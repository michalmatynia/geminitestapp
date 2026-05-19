'use client';

import React from 'react';

import { FormModal } from '@/shared/ui/forms-and-actions.public';
import { Checkbox, Label } from '@/shared/ui/primitives.public';

import {
  resolveBrainAssignment,
  type AiBrainAssignment,
  type AiBrainCapabilityKey,
  type AiBrainProvider,
  type AiBrainSettings,
  type BrainCapabilityDefinition,
} from '../settings';
import { AssignmentEditor } from './AssignmentEditor';
import {
  type BrainRoutingEditModalState,
  type PersistRoutingSettingsFn,
  type ToastFn,
  getAllowedProviders,
  mergeAssignmentState,
  persistRoute,
  resolveSourceLabel,
  toggleOverrideState,
} from './BrainRoutingEditModal.parts';

type BrainRoutingEditFormProps = {
  capability: AiBrainCapabilityKey;
  checkboxId: string;
  clearCapabilityOverride: (capability: AiBrainCapabilityKey) => void;
  definition: BrainCapabilityDefinition;
  effectiveAssignments: Record<AiBrainCapabilityKey, AiBrainAssignment>;
  handleCapabilityChange: (capability: AiBrainCapabilityKey, assignment: AiBrainAssignment) => void;
  isSaving: boolean;
  onClose: () => void;
  open: boolean;
  persistRoutingSettings: PersistRoutingSettingsFn;
  settings: AiBrainSettings;
  setState: React.Dispatch<React.SetStateAction<BrainRoutingEditModalState | null>>;
  state: BrainRoutingEditModalState;
  toast: ToastFn;
};

type RouteFormModel = {
  allowedProviders: AiBrainProvider[];
  featureEnabled: boolean;
  handleAssignmentChange: (next: AiBrainAssignment) => void;
  handleOverrideChange: (checked: boolean | 'indeterminate') => void;
  handleSave: () => void;
  sourceLabel: string;
};

function buildRouteFormModel(props: BrainRoutingEditFormProps): RouteFormModel {
  const {
    capability,
    clearCapabilityOverride,
    definition,
    effectiveAssignments,
    handleCapabilityChange,
    onClose,
    persistRoutingSettings,
    settings,
    setState,
    state,
    toast,
  } = props;
  const featureEnabled = resolveBrainAssignment(settings, definition.feature).enabled;
  const allowedProviders = getAllowedProviders(definition);
  const handleOverrideChange = (checked: boolean | 'indeterminate'): void => {
    setState((previous) =>
      toggleOverrideState(previous, Boolean(checked), effectiveAssignments[capability])
    );
  };
  const handleAssignmentChange = (next: AiBrainAssignment): void => {
    setState((previous) => mergeAssignmentState(previous, next));
  };
  const handleSave = (): void => {
    void persistRoute({
      allowedProviders,
      capability,
      clearCapabilityOverride,
      handleCapabilityChange,
      onClose,
      persistRoutingSettings,
      settings,
      state,
      toast,
    });
  };
  return {
    allowedProviders,
    featureEnabled,
    handleAssignmentChange,
    handleOverrideChange,
    handleSave,
    sourceLabel: resolveSourceLabel(settings, definition, capability, featureEnabled),
  };
}

function RouteSourceCard(props: {
  capability: AiBrainCapabilityKey;
  sourceLabel: string;
}): React.JSX.Element {
  const { capability, sourceLabel } = props;
  return (
    <div className='rounded-md border border-border/60 bg-card/40 p-3 text-xs text-gray-300'>
      <div className='font-semibold text-gray-100'>{capability}</div>
      <div className='mt-1 text-gray-400'>
        Source: <span className='text-gray-300'>{sourceLabel}</span>
      </div>
    </div>
  );
}

function OverrideToggle(props: {
  checked: boolean;
  checkboxId: string;
  onChange: (checked: boolean | 'indeterminate') => void;
}): React.JSX.Element {
  const { checked, checkboxId, onChange } = props;
  return (
    <div className='flex items-center gap-2 text-xs text-gray-300'>
      <Checkbox id={checkboxId} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={checkboxId} className='cursor-pointer text-xs text-gray-300'>
        Use capability-specific override
      </Label>
    </div>
  );
}

function RouteWarnings(props: {
  featureEnabled: boolean;
  overrideEnabled: boolean;
}): React.JSX.Element {
  const { featureEnabled, overrideEnabled } = props;
  return (
    <>
      {!featureEnabled ? (
        <div className='text-[11px] text-amber-300'>
          This feature is currently off. Route settings are staged, but they will stay inactive
          until the feature is turned back on.
        </div>
      ) : null}
      {!overrideEnabled ? (
        <div className='text-[11px] text-gray-500'>
          Override is off. Saving will clear this route override and use fallback inheritance.
        </div>
      ) : null}
    </>
  );
}

const hasRouteApiKeyOverride = (assignment: AiBrainAssignment): boolean =>
  typeof assignment.apiKey === 'string' && assignment.apiKey.trim().length > 0;

function RouteCredentialNotice({
  state,
}: {
  state: BrainRoutingEditModalState;
}): React.JSX.Element | null {
  if (!state.overrideEnabled || !hasRouteApiKeyOverride(state.assignment)) return null;
  return (
    <div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200'>
      This route has its own API key override. Product Studio will use this route key before AI
      Brain provider settings or OPENAI_API_KEY.
    </div>
  );
}

function RouteModalBody(props: {
  capability: AiBrainCapabilityKey;
  checkboxId: string;
  definition: BrainCapabilityDefinition;
  formModel: RouteFormModel;
  state: BrainRoutingEditModalState;
}): React.JSX.Element {
  const { capability, checkboxId, definition, formModel, state } = props;
  return (
    <div className='space-y-4'>
      <RouteSourceCard capability={capability} sourceLabel={formModel.sourceLabel} />
      <OverrideToggle
        checked={state.overrideEnabled}
        checkboxId={checkboxId}
        onChange={formModel.handleOverrideChange}
      />
      <RouteCredentialNotice state={state} />
      <AssignmentEditor
        assignment={state.assignment}
        onChange={formModel.handleAssignmentChange}
        readOnly={!state.overrideEnabled}
        allowedProviders={formModel.allowedProviders}
        modelFamily={definition.modelFamily}
        showModelIdInput={false}
      />
      <RouteWarnings
        featureEnabled={formModel.featureEnabled}
        overrideEnabled={state.overrideEnabled}
      />
    </div>
  );
}

export function BrainRoutingEditForm(props: BrainRoutingEditFormProps): React.JSX.Element {
  const { capability, checkboxId, definition, isSaving, onClose, open, state } = props;
  const formModel = buildRouteFormModel(props);
  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={`Edit Route: ${definition.label}`}
      subtitle='Apply saves this route immediately so server actions can use it.'
      onSave={formModel.handleSave}
      isSaving={isSaving}
      disableCloseWhileSaving
      saveText='Apply'
      size='lg'
    >
      <RouteModalBody
        capability={capability}
        checkboxId={checkboxId}
        definition={definition}
        formModel={formModel}
        state={state}
      />
    </FormModal>
  );
}
