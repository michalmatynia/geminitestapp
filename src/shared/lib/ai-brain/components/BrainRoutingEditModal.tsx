'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { internalError } from '@/shared/errors/app-error';
import { Checkbox, FormModal, Label } from '@/shared/ui';

import { useBrain } from '../context/BrainContext';
import {
  getBrainCapabilityDefinition,
  type AiBrainAssignment,
  type AiBrainCapabilityKey,
} from '../settings';
import { AssignmentEditor } from './AssignmentEditor';
import {
  useOptionalBrainRoutingActionsContext,
  useOptionalBrainRoutingStateContext,
} from './BrainRoutingContext';

type BrainRoutingEditModalState = {
  overrideEnabled: boolean;
  assignment: AiBrainAssignment;
};

export interface BrainRoutingEditModalProps {
  open?: boolean;
  capability?: AiBrainCapabilityKey | null;
  onClose?: () => void;
}

export function BrainRoutingEditModal(props: BrainRoutingEditModalProps): React.JSX.Element | null {
  const stateContext = useOptionalBrainRoutingStateContext();
  const actionsContext = useOptionalBrainRoutingActionsContext();
  const open = props.open ?? Boolean(stateContext?.editingCapability);
  const capability = props.capability ?? stateContext?.editingCapability ?? null;
  const onClose = props.onClose ?? actionsContext?.onCloseEdit;

  const {
    settings,
    effectiveCapabilityAssignments,
    handleCapabilityChange,
    clearCapabilityOverride,
  } = useBrain();
  const [state, setState] = useState<BrainRoutingEditModalState | null>(null);
  const overrideCheckboxId = React.useId().replace(/:/g, '');

  const capabilityDefinition = useMemo(
    () => (capability ? getBrainCapabilityDefinition(capability) : null),
    [capability]
  );

  useEffect(() => {
    if (!open || !capability) {
      setState(null);
      return;
    }
    const overrideEnabled = Boolean(settings.capabilities[capability]);
    const assignment = overrideEnabled
      ? (settings.capabilities[capability] ?? effectiveCapabilityAssignments[capability])
      : effectiveCapabilityAssignments[capability];
    setState({
      overrideEnabled,
      assignment,
    });
  }, [capability, effectiveCapabilityAssignments, open, settings.capabilities]);

  if (!open || !capability || !capabilityDefinition || !state) return null;
  if (!onClose) {
    throw internalError(
      'BrainRoutingEditModal must be used within BrainRoutingProvider or receive explicit modal props'
    );
  }

  const sourceLabel = settings.capabilities[capability]
    ? 'Capability override'
    : settings.assignments[capabilityDefinition.feature]
      ? 'Feature fallback'
      : 'Global defaults';

  const allowedProviders =
    capabilityDefinition.policy === 'agent-or-model'
      ? (['model', 'agent'] as const)
      : (['model'] as const);

  const handleSave = (): void => {
    if (state.overrideEnabled) {
      handleCapabilityChange(capability, state.assignment);
    } else {
      clearCapabilityOverride(capability);
    }
    onClose();
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={`Edit Route: ${capabilityDefinition.label}`}
      subtitle='Changes are staged locally. Use Save in the Brain header to persist.'
      onSave={handleSave}
      saveText='Apply'
      size='lg'
    >
      <div className='space-y-4'>
        <div className='rounded-md border border-border/60 bg-card/40 p-3 text-xs text-gray-300'>
          <div className='font-semibold text-gray-100'>{capability}</div>
          <div className='mt-1 text-gray-400'>
            Source: <span className='text-gray-300'>{sourceLabel}</span>
          </div>
        </div>

        <div className='flex items-center gap-2 text-xs text-gray-300'>
          <Checkbox
            id={overrideCheckboxId}
            checked={state.overrideEnabled}
            onCheckedChange={(checked: boolean | 'indeterminate') => {
              const enabled = Boolean(checked);
              setState((prev) => {
                if (!prev) return prev;
                if (enabled === prev.overrideEnabled) return prev;
                return {
                  overrideEnabled: enabled,
                  assignment: enabled
                    ? effectiveCapabilityAssignments[capability]
                    : prev.assignment,
                };
              });
            }}
          />
          <Label htmlFor={overrideCheckboxId} className='cursor-pointer text-xs text-gray-300'>
            Use capability-specific override
          </Label>
        </div>

        <AssignmentEditor
          assignment={state.assignment}
          onChange={(next: AiBrainAssignment) => {
            setState((prev) => (prev ? { ...prev, assignment: next } : prev));
          }}
          readOnly={!state.overrideEnabled}
          allowedProviders={[...allowedProviders]}
        />
        {!state.overrideEnabled ? (
          <div className='text-[11px] text-gray-500'>
            Override is off. Saving will clear this route override and use fallback inheritance.
          </div>
        ) : null}
      </div>
    </FormModal>
  );
}
