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
    if (normalized === '' || seen.has(normalized)) return;
    seen.add(normalized);
    output.push(normalized);
  });
  return output;
};

type BrainModelsQueryData = ReturnType<typeof useBrainModels>['data'];

const readDiscoveredModels = (data: BrainModelsQueryData): string[] => {
  const models = data?.models;
  return Array.isArray(models) ? models : [];
};

const readSourceCatalogModels = (data: BrainModelsQueryData): string[] => {
  const sources = data?.sources;
  if (sources === undefined) return [];
  return [
    ...sources.modelPresets,
    ...sources.paidModels,
    ...sources.configuredOllamaModels,
    ...sources.liveOllamaModels,
  ];
};

const isCompatibleModel = (
  modelId: string,
  descriptors: Record<string, BrainModelDescriptor> | undefined,
  targetFamilies: readonly string[] | null
): boolean => {
  if (targetFamilies === null) return true;
  const descriptor = descriptors?.[modelId];
  if (descriptor === undefined) return true;
  return targetFamilies.includes(descriptor.family);
};

const resolveTargetFamilies = (
  capability: AiBrainCapabilityKey | undefined
): readonly string[] | null =>
  capability === undefined ? null : getBrainCapabilityModelFamilies(capability);

const buildModelOptions = (input: {
  data: BrainModelsQueryData;
  effectiveModelId: string;
  targetFamilies: readonly string[] | null;
}): string[] => {
  const discovered = readDiscoveredModels(input.data);
  const sourceCatalogModels = readSourceCatalogModels(input.data);
  const candidates = normalizeUnique([...discovered, ...sourceCatalogModels]);
  const compatible = candidates.filter((modelId: string): boolean =>
    isCompatibleModel(modelId, input.data?.descriptors, input.targetFamilies)
  );
  return normalizeUnique([
    ...compatible,
    ...(input.effectiveModelId !== '' ? [input.effectiveModelId] : []),
  ]);
};

const resolveSourceWarnings = (message: string | undefined): string[] => {
  const normalized = message?.trim() ?? '';
  return normalized !== '' ? [normalized] : [];
};

const readDescriptors = (
  data: BrainModelsQueryData
): Record<string, BrainModelDescriptor> => data?.descriptors ?? {};

const isAnyStoreLoading = (left: boolean, right: boolean): boolean => left || right;

export function useBrainModelOptions({
  feature,
  capability,
  enabled = true,
}: UseBrainModelOptionsInput): UseBrainModelOptionsResult {
  const settingsStore = useSettingsStore();
  const { assignment, effectiveModelId } = useBrainAssignment({ feature, capability });
  const modelsQuery = useBrainModels({ enabled });
  const targetFamilies = resolveTargetFamilies(capability);

  const models = useMemo((): string[] => buildModelOptions({
    data: modelsQuery.data,
    effectiveModelId,
    targetFamilies,
  }), [effectiveModelId, modelsQuery.data, targetFamilies]);

  const sourceWarnings = useMemo(
    (): string[] => resolveSourceWarnings(modelsQuery.data?.warning?.message),
    [modelsQuery.data]
  );

  const refresh = useCallback((): void => {
    void modelsQuery.refetch();
  }, [modelsQuery.refetch]);

  return {
    models,
    descriptors: readDescriptors(modelsQuery.data),
    isLoading: isAnyStoreLoading(modelsQuery.isLoading, settingsStore.isLoading),
    assignment,
    effectiveModelId,
    sourceWarnings,
    refresh,
  };
}
