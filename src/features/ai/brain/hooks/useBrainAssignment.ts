'use client';

import { useMemo } from 'react';

import {
  defaultBrainSettings,
  resolveBrainAssignment,
  resolveBrainCapabilityAssignment,
  type AiBrainAssignment,
  type AiBrainCapabilityKey,
  type AiBrainFeature,
} from '@/shared/lib/ai-brain/settings';

import { useBrainRoutingSettings } from './useBrainQueries';

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
  const routingQuery = useBrainRoutingSettings();
  const brainSettings = routingQuery.data?.settings ?? defaultBrainSettings;

  const assignment = useMemo(() => {
    if (capability !== undefined) {
      return resolveBrainCapabilityAssignment(brainSettings, capability);
    }
    if (feature !== undefined) {
      return resolveBrainAssignment(brainSettings, feature);
    }
    throw new Error('useBrainAssignment requires a feature or capability.');
  }, [brainSettings, capability, feature]);

  return {
    assignment,
    effectiveModelId: assignment.modelId.trim(),
  };
}
