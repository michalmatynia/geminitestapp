'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import {
  getAllowedProvidersForFeature,
} from './brain-runtime-shared';
import {
  resolveBrainAssignment,
  sanitizeBrainAssignmentForProviders,
  type AiBrainFeature,
  type AiBrainSettings,
} from '../settings';

interface BrainFeatureToggleHandlersParams {
  setSettings: Dispatch<SetStateAction<AiBrainSettings>>;
  setOverridesEnabled: Dispatch<SetStateAction<Record<AiBrainFeature, boolean>>>;
}

interface BrainFeatureToggleHandlersResult {
  setFeatureEnabled: (feature: AiBrainFeature, enabled: boolean) => void;
  toggleOverride: (feature: AiBrainFeature, enabled: boolean) => void;
}

export function useBrainFeatureToggleHandlers({
  setSettings,
  setOverridesEnabled,
}: BrainFeatureToggleHandlersParams): BrainFeatureToggleHandlersResult {
  const setFeatureEnabled = useCallback((feature: AiBrainFeature, enabled: boolean): void => {
    setOverridesEnabled((prev) => ({ ...prev, [feature]: true }));
    setSettings((prev) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        [feature]: sanitizeBrainAssignmentForProviders(
          { ...(prev.assignments[feature] ?? resolveBrainAssignment(prev, feature)), enabled },
          getAllowedProvidersForFeature(feature)
        ),
      },
    }));
  }, [setOverridesEnabled, setSettings]);

  const toggleOverride = useCallback((feature: AiBrainFeature, enabled: boolean): void => {
    setOverridesEnabled((prev) => ({ ...prev, [feature]: enabled }));
    setSettings((prev) => {
      if (!enabled) {
        const next = { ...prev.assignments };
        delete next[feature];
        return { ...prev, assignments: next };
      }
      return {
        ...prev,
        assignments: {
          ...prev.assignments,
          [feature]: prev.assignments[feature] ?? resolveBrainAssignment(prev, feature),
        },
      };
    });
  }, [setOverridesEnabled, setSettings]);

  return { setFeatureEnabled, toggleOverride };
}
