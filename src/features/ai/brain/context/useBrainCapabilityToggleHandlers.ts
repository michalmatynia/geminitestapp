'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import {
  getBrainCapabilityDefinition,
  resolveBrainCapabilityAssignment,
  sanitizeBrainAssignmentForProviders,
  type AiBrainCapabilityKey,
  type AiBrainSettings,
} from '../settings';

interface BrainCapabilityToggleHandlersParams {
  setSettings: Dispatch<SetStateAction<AiBrainSettings>>;
}

interface BrainCapabilityToggleHandlersResult {
  setCapabilityEnabled: (capability: AiBrainCapabilityKey, enabled: boolean) => void;
  clearCapabilityOverride: (capability: AiBrainCapabilityKey) => void;
  toggleCapabilityOverride: (capability: AiBrainCapabilityKey, enabled: boolean) => void;
}

export function useBrainCapabilityToggleHandlers({
  setSettings,
}: BrainCapabilityToggleHandlersParams): BrainCapabilityToggleHandlersResult {
  const setCapabilityEnabled = useCallback((capability: AiBrainCapabilityKey, enabled: boolean): void => {
    setSettings((prev) => {
      const def = getBrainCapabilityDefinition(capability);
      const allowed = def.policy === 'agent-or-model' ? ['model', 'agent'] as const : ['model'] as const;
      return {
        ...prev,
        capabilities: {
          ...prev.capabilities,
          [capability]: sanitizeBrainAssignmentForProviders(
            { ...(prev.capabilities[capability] ?? resolveBrainCapabilityAssignment(prev, capability)), enabled },
            [...allowed]
          ),
        },
      };
    });
  }, [setSettings]);

  const clearCapabilityOverride = useCallback((capability: AiBrainCapabilityKey): void => {
    setSettings((prev) => {
      if (!prev.capabilities[capability]) return prev;
      const next = { ...prev.capabilities };
      delete next[capability];
      return { ...prev, capabilities: next };
    });
  }, [setSettings]);

  const toggleCapabilityOverride = useCallback((capability: AiBrainCapabilityKey, enabled: boolean): void => {
    setSettings((prev) => {
      if (!enabled) {
        const next = { ...prev.capabilities };
        delete next[capability];
        return { ...prev, capabilities: next };
      }
      return {
        ...prev,
        capabilities: {
          ...prev.capabilities,
          [capability]: prev.capabilities[capability] ?? resolveBrainCapabilityAssignment(prev, capability),
        },
      };
    });
  }, [setSettings]);

  return {
    setCapabilityEnabled,
    clearCapabilityOverride,
    toggleCapabilityOverride,
  };
}
