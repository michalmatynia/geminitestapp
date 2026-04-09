'use client';

import { useCallback, useMemo } from 'react';

import type { BrainModelDescriptor } from '@/shared/contracts/ai-brain';
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
  descriptors: Record<string, BrainModelDescriptor>;
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
    const discovered = Array.isArray(modelsQuery.data?.models) ? modelsQuery.data.models : [];
    const sourceCatalogModels = [
      ...(modelsQuery.data?.sources?.modelPresets ?? []),
      ...(modelsQuery.data?.sources?.paidModels ?? []),
      ...(modelsQuery.data?.sources?.configuredOllamaModels ?? []),
      ...(modelsQuery.data?.sources?.liveOllamaModels ?? []),
    ];
    const candidates = normalizeUnique([...discovered, ...sourceCatalogModels]);
    const compatible = candidates.filter((modelId: string): boolean => {
      if (!targetFamilies) return true;
      const descriptor = modelsQuery.data?.descriptors?.[modelId];
      if (!descriptor?.family) {
        // Preserve model discoverability when the catalog cannot classify a model yet.
        return true;
      }
      return targetFamilies.includes(descriptor.family);
    });
    return normalizeUnique([...compatible, ...(effectiveModelId ? [effectiveModelId] : [])]);
  }, [
    effectiveModelId,
    modelsQuery.data?.descriptors,
    modelsQuery.data?.models,
    modelsQuery.data?.sources,
    targetFamilies,
  ]);

  const sourceWarnings = useMemo((): string[] => {
    const message = modelsQuery.data?.warning?.message?.trim() ?? '';
    return message ? [message] : [];
  }, [modelsQuery.data?.warning?.message]);

  const refresh = useCallback((): void => {
    void modelsQuery.refetch();
  }, [modelsQuery.refetch]);

  return {
    models,
    descriptors: modelsQuery.data?.descriptors ?? {},
    isLoading: modelsQuery.isLoading || settingsStore.isLoading,
    assignment,
    effectiveModelId,
    sourceWarnings,
    refresh,
  };
}
