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
  const brainSettings = useMemo(() => parseBrainSettings(rawBrainSettings), [rawBrainSettings]);

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
