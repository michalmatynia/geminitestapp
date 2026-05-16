'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import {
  getAllowedProvidersForFeature,
} from './brain-runtime-shared';
import {
  getBrainCapabilityDefinition,
  sanitizeBrainAssignmentForProviders,
  type AiBrainAssignment,
  type AiBrainCapabilityKey,
  type AiBrainFeature,
  type AiBrainSettings,
} from '../settings';

interface BrainAssignmentHandlersParams {
  setSettings: Dispatch<SetStateAction<AiBrainSettings>>;
}

interface BrainAssignmentHandlersResult {
  handleDefaultChange: (next: AiBrainAssignment) => void;
  handleOverrideChange: (feature: AiBrainFeature, next: AiBrainAssignment) => void;
  handleCapabilityChange: (capability: AiBrainCapabilityKey, next: AiBrainAssignment) => void;
}

export function useBrainAssignmentHandlers({
  setSettings,
}: BrainAssignmentHandlersParams): BrainAssignmentHandlersResult {
  const handleDefaultChange = useCallback((next: AiBrainAssignment): void => {
    setSettings((prev) => ({
      ...prev,
      defaults: sanitizeBrainAssignmentForProviders(next, ['model']),
    }));
  }, [setSettings]);

  const handleOverrideChange = useCallback((feature: AiBrainFeature, next: AiBrainAssignment): void => {
    setSettings((prev) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        [feature]: sanitizeBrainAssignmentForProviders(next, getAllowedProvidersForFeature(feature)),
      },
    }));
  }, [setSettings]);

  const handleCapabilityChange = useCallback((capability: AiBrainCapabilityKey, next: AiBrainAssignment): void => {
    setSettings((prev) => ({
      ...prev,
      capabilities: {
        ...prev.capabilities,
        [capability]: sanitizeBrainAssignmentForProviders(
          next,
          getBrainCapabilityDefinition(capability).policy === 'agent-or-model' ? ['model', 'agent'] : ['model']
        ),
      },
    }));
  }, [setSettings]);

  return {
    handleDefaultChange,
    handleOverrideChange,
    handleCapabilityChange,
  };
}
