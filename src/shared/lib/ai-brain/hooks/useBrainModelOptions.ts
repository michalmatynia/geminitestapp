'use client';

import { useMemo } from 'react';

import {
  getBrainCapabilityModelFamilies,
  type AiBrainAssignment,
  type AiBrainCapabilityKey,
  type AiBrainFeature,
} from '@/shared/lib/ai-brain/settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import { useBrainAssignment } from './useBrainAssignment';
import { useBrainModels } from './useBrainQueries';

type UseBrainModelOptionsInput = {
  feature?: AiBrainFeature;
  capability?: AiBrainCapabilityKey;
  enabled?: boolean;
};

type UseBrainModelOptionsResult = {
  models: string[];
  isLoading: boolean;
  assignment: AiBrainAssignment;
  effectiveModelId: string;
  sourceWarnings: string[];
  refresh: () => void;
};

const normalizeUnique = (values: string[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  values.forEach((value: string): void => {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    output.push(normalized);
  });
  return output;
};

export function useBrainModelOptions({
  feature,
  capability,
  enabled = true,
}: UseBrainModelOptionsInput): UseBrainModelOptionsResult {
  const settingsStore = useSettingsStore();
  const { assignment, effectiveModelId } = useBrainAssignment({ feature, capability });
  const modelsQuery = useBrainModels({ enabled });
  const targetFamilies = capability ? getBrainCapabilityModelFamilies(capability) : null;

  const models = useMemo((): string[] => {
    const discovered = Array.isArray(modelsQuery.data?.models)
      ? (modelsQuery.data?.models ?? []).filter((modelId) => {
          if (!targetFamilies) return true;
          const descriptor = modelsQuery.data?.descriptors?.[modelId];
          return Boolean(descriptor?.family && targetFamilies.includes(descriptor.family));
        })
      : [];
    return normalizeUnique([...discovered, ...(effectiveModelId ? [effectiveModelId] : [])]);
  }, [effectiveModelId, modelsQuery.data?.descriptors, modelsQuery.data?.models, targetFamilies]);

  const sourceWarnings = useMemo((): string[] => {
    const message = modelsQuery.data?.warning?.message?.trim() ?? '';
    return message ? [message] : [];
  }, [modelsQuery.data?.warning?.message]);

  return {
    models,
    isLoading: modelsQuery.isLoading || settingsStore.isLoading,
    assignment,
    effectiveModelId,
    sourceWarnings,
    refresh: (): void => {
      void modelsQuery.refetch();
    },
  };
}
