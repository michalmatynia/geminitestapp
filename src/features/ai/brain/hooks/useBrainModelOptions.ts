'use client';

import { useMemo } from 'react';

import type { AiBrainFeature } from '@/features/ai/brain/settings';
import {
  AI_BRAIN_SETTINGS_KEY,
  parseBrainSettings,
  resolveBrainAssignment,
  type AiBrainAssignment,
} from '@/features/ai/brain/settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import { useBrainModels } from './useBrainQueries';

type UseBrainModelOptionsInput = {
  feature: AiBrainFeature;
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
  enabled = true,
}: UseBrainModelOptionsInput): UseBrainModelOptionsResult {
  const settingsStore = useSettingsStore();
  const rawBrainSettings = settingsStore.get(AI_BRAIN_SETTINGS_KEY);
  const brainSettings = useMemo(
    () => parseBrainSettings(rawBrainSettings),
    [rawBrainSettings],
  );
  const assignment = useMemo(
    () => resolveBrainAssignment(brainSettings, feature),
    [brainSettings, feature],
  );
  const modelsQuery = useBrainModels({ enabled });

  const models = useMemo((): string[] => {
    const discovered = Array.isArray(modelsQuery.data?.models)
      ? modelsQuery.data?.models ?? []
      : [];
    return normalizeUnique([
      ...discovered,
      ...(assignment.modelId ? [assignment.modelId] : []),
    ]);
  }, [assignment.modelId, modelsQuery.data?.models]);

  const sourceWarnings = useMemo((): string[] => {
    const message = modelsQuery.data?.warning?.message?.trim() ?? '';
    return message ? [message] : [];
  }, [modelsQuery.data?.warning?.message]);

  return {
    models,
    isLoading: modelsQuery.isLoading || settingsStore.isLoading,
    assignment,
    effectiveModelId: assignment.modelId?.trim() ?? '',
    sourceWarnings,
    refresh: (): void => {
      void modelsQuery.refetch();
    },
  };
}
