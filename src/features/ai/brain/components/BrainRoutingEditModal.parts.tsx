'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  AI_BRAIN_SETTINGS_KEY,
  getBrainCapabilityDefinition,
  sanitizeBrainAssignmentForProviders,
  type AiBrainAssignment,
  type AiBrainCapabilityKey,
  type AiBrainProvider,
  type AiBrainSettings,
  type BrainCapabilityDefinition,
} from '../settings';
import {
  useOptionalBrainRoutingActionsContext,
  useOptionalBrainRoutingStateContext,
} from './BrainRoutingContext';

export type BrainRoutingEditModalState = {
  overrideEnabled: boolean;
  assignment: AiBrainAssignment;
};

export type ToastFn = (message: string, options: { variant: 'success' | 'error' }) => void;
export type PersistSettingFn = (payload: { key: string; value: string }) => Promise<unknown>;

export type BrainRoutingEditModalIdentityProps = {
  open?: boolean;
  capability?: AiBrainCapabilityKey | null;
  onClose?: () => void;
};

export const resolveOpenState = (
  explicitOpen: boolean | undefined,
  editingCapability: AiBrainCapabilityKey | null | undefined
): boolean => {
  if (explicitOpen !== undefined) return explicitOpen;
  return editingCapability !== undefined && editingCapability !== null;
};

export const getAllowedProviders = (definition: BrainCapabilityDefinition): AiBrainProvider[] => {
  if (definition.policy === 'agent-or-model') return ['model', 'agent'];
  return ['model'];
};

const buildRouteState = (
  settings: AiBrainSettings,
  effectiveAssignments: Record<AiBrainCapabilityKey, AiBrainAssignment>,
  capability: AiBrainCapabilityKey
): BrainRoutingEditModalState => {
  const overrideAssignment = settings.capabilities[capability];
  if (overrideAssignment !== undefined) {
    return { overrideEnabled: true, assignment: overrideAssignment };
  }
  return { overrideEnabled: false, assignment: effectiveAssignments[capability] };
};

export const resolveSourceLabel = (
  settings: AiBrainSettings,
  definition: BrainCapabilityDefinition,
  capability: AiBrainCapabilityKey,
  featureEnabled: boolean
): string => {
  if (!featureEnabled) return 'Feature disabled';
  if (settings.capabilities[capability] !== undefined) return 'Capability override';
  if (settings.assignments[definition.feature] !== undefined) return 'Feature fallback';
  return 'Global defaults';
};

const buildNextSettings = (
  settings: AiBrainSettings,
  capability: AiBrainCapabilityKey,
  state: BrainRoutingEditModalState,
  allowedProviders: AiBrainProvider[]
): AiBrainSettings => {
  const capabilities = { ...settings.capabilities };
  if (state.overrideEnabled) {
    capabilities[capability] = sanitizeBrainAssignmentForProviders(
      state.assignment,
      allowedProviders
    );
  } else {
    delete capabilities[capability];
  }
  return { ...settings, capabilities };
};

export const mergeAssignmentState = (
  previous: BrainRoutingEditModalState | null,
  assignment: AiBrainAssignment
): BrainRoutingEditModalState | null =>
  previous === null ? previous : { ...previous, assignment };

export const toggleOverrideState = (
  previous: BrainRoutingEditModalState | null,
  enabled: boolean,
  fallbackAssignment: AiBrainAssignment
): BrainRoutingEditModalState | null => {
  if (previous === null || enabled === previous.overrideEnabled) return previous;
  return {
    overrideEnabled: enabled,
    assignment: enabled ? fallbackAssignment : previous.assignment,
  };
};

export function useModalIdentity(props: BrainRoutingEditModalIdentityProps): {
  open: boolean;
  capability: AiBrainCapabilityKey | null;
  onClose: (() => void) | undefined;
} {
  const stateContext = useOptionalBrainRoutingStateContext();
  const actionsContext = useOptionalBrainRoutingActionsContext();
  const editingCapability = stateContext?.editingCapability;
  return {
    open: resolveOpenState(props.open, editingCapability),
    capability: props.capability ?? editingCapability ?? null,
    onClose: props.onClose ?? actionsContext?.onCloseEdit,
  };
}

export function useCapabilityDefinition(
  capability: AiBrainCapabilityKey | null
): BrainCapabilityDefinition | null {
  return useMemo(
    () => (capability === null ? null : getBrainCapabilityDefinition(capability)),
    [capability]
  );
}

export function useSyncedRouteState(
  open: boolean,
  capability: AiBrainCapabilityKey | null,
  settings: AiBrainSettings,
  effectiveAssignments: Record<AiBrainCapabilityKey, AiBrainAssignment>
): [
  BrainRoutingEditModalState | null,
  React.Dispatch<React.SetStateAction<BrainRoutingEditModalState | null>>,
] {
  const [state, setState] = useState<BrainRoutingEditModalState | null>(null);
  useEffect(() => {
    if (open !== true || capability === null) {
      setState(null);
      return;
    }
    setState(buildRouteState(settings, effectiveAssignments, capability));
  }, [capability, effectiveAssignments, open, settings]);
  return [state, setState];
}

export async function persistRoute(props: {
  allowedProviders: AiBrainProvider[];
  capability: AiBrainCapabilityKey;
  clearCapabilityOverride: (capability: AiBrainCapabilityKey) => void;
  handleCapabilityChange: (capability: AiBrainCapabilityKey, assignment: AiBrainAssignment) => void;
  onClose: () => void;
  persistSetting: PersistSettingFn;
  settings: AiBrainSettings;
  state: BrainRoutingEditModalState;
  toast: ToastFn;
}): Promise<void> {
  const {
    allowedProviders,
    capability,
    clearCapabilityOverride,
    handleCapabilityChange,
    onClose,
    persistSetting,
    settings,
    state,
    toast,
  } = props;
  try {
    const nextSettings = buildNextSettings(settings, capability, state, allowedProviders);
    await persistSetting({ key: AI_BRAIN_SETTINGS_KEY, value: serializeSetting(nextSettings) });
    if (state.overrideEnabled) {
      handleCapabilityChange(capability, state.assignment);
    } else {
      clearCapabilityOverride(capability);
    }
    toast('Brain route saved.', { variant: 'success' });
    onClose();
  } catch (error: unknown) {
    logClientCatch(error, { source: 'BrainRoutingEditModal', action: 'saveRoute', capability });
    toast('Failed to save Brain route.', { variant: 'error' });
  }
}
