'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';

import { useBrain } from '../context/BrainContext';
import type { AiBrainCapabilityKey } from '../settings';
import { BrainRoutingEditForm } from './BrainRoutingEditForm';
import {
  useCapabilityDefinition,
  useModalIdentity,
  useSyncedRouteState,
} from './BrainRoutingEditModal.parts';

export interface BrainRoutingEditModalProps {
  open?: boolean;
  capability?: AiBrainCapabilityKey | null;
  onClose?: () => void;
}

export function BrainRoutingEditModal(props: BrainRoutingEditModalProps): React.JSX.Element | null {
  const { toast } = useToast();
  const updateSetting = useUpdateSetting();
  const { open, capability, onClose } = useModalIdentity(props);
  const brain = useBrain();
  const [state, setState] = useSyncedRouteState(
    open,
    capability,
    brain.settings,
    brain.effectiveCapabilityAssignments
  );
  const overrideCheckboxId = React.useId().replace(/:/g, '');
  const capabilityDefinition = useCapabilityDefinition(capability);

  if (open !== true || capability === null || capabilityDefinition === null || state === null) {
    return null;
  }
  if (onClose === undefined) {
    throw internalError(
      'BrainRoutingEditModal must be used within BrainRoutingProvider or receive explicit modal props'
    );
  }

  return (
    <BrainRoutingEditForm
      capability={capability}
      checkboxId={overrideCheckboxId}
      clearCapabilityOverride={brain.clearCapabilityOverride}
      definition={capabilityDefinition}
      effectiveAssignments={brain.effectiveCapabilityAssignments}
      handleCapabilityChange={brain.handleCapabilityChange}
      isSaving={updateSetting.isPending}
      onClose={onClose}
      open={open}
      persistSetting={updateSetting.mutateAsync}
      settings={brain.settings}
      setState={setState}
      state={state}
      toast={toast}
    />
  );
}
