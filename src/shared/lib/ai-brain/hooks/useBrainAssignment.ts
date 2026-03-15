'use client';

import { useMemo } from 'react';

import {
  AI_BRAIN_SETTINGS_KEY,
  parseBrainSettings,
  resolveBrainAssignment,
  resolveBrainCapabilityAssignment,
  type AiBrainAssignment,
  type AiBrainCapabilityKey,
  type AiBrainFeature,
} from '@/shared/lib/ai-brain/settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type UseBrainAssignmentInput = {
  feature?: AiBrainFeature;
  capability?: AiBrainCapabilityKey;
};

type UseBrainAssignmentResult = {
  assignment: AiBrainAssignment;
  effectiveModelId: string;
};

export function useBrainAssignment({
  feature,
  capability,
}: UseBrainAssignmentInput): UseBrainAssignmentResult {
  const settingsStore = useSettingsStore();
  const rawBrainSettings = settingsStore.get(AI_BRAIN_SETTINGS_KEY);
  const brainSettings = useMemo(() => {
    try {
      return parseBrainSettings(rawBrainSettings);
    } catch (error: unknown) {
      logClientError(error);
      logClientError(error, {
        context: {
          source: 'useBrainAssignment',
          action: 'parseBrainSettings',
          settingKey: AI_BRAIN_SETTINGS_KEY,
        },
      });
      throw error;
    }
  }, [rawBrainSettings]);

  const assignment = useMemo(() => {
    if (capability) {
      return resolveBrainCapabilityAssignment(brainSettings, capability);
    }
    if (feature) {
      return resolveBrainAssignment(brainSettings, feature);
    }
    throw new Error('useBrainAssignment requires a feature or capability.');
  }, [brainSettings, capability, feature]);

  return {
    assignment,
    effectiveModelId: assignment.modelId.trim(),
  };
}
