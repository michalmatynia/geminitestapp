'use client';

import type { AiPathRuntimeAnalyticsSummary } from '@/shared/contracts/ai-paths';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import type { ListQuery, VoidMutation, SingleQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createSingleQueryV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import {
  fetchAiPathsSettingsCached,
  invalidateAiPathsSettingsCache,
  updateAiPathsSetting,
} from '../settings-store-client';

export function useAiPathsSettingsQuery(): ListQuery<{ key: string; value: string }> {
  const queryKey = QUERY_KEYS.ai.aiPaths.settings();
  return createListQueryV2({
    queryKey,
    queryFn: async () => await fetchAiPathsSettingsCached({ bypassCache: true }),
    meta: {
      source: 'aiPaths.hooks.useAiPathsSettingsQuery',
      operation: 'list',
      resource: 'ai-paths.settings',
      domain: 'ai_paths',
      queryKey,
      tags: ['ai-paths', 'settings'],
      description: 'Loads ai paths settings.'},
  });
}

export function useUpdateAiPathsSettingMutation(): VoidMutation<{ key: string; value: string }> {
  const mutationKey = QUERY_KEYS.ai.aiPaths.mutation('update-setting');
  return createUpdateMutationV2({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await updateAiPathsSetting(key, value);
      invalidateAiPathsSettingsCache();
    },
    mutationKey,
    meta: {
      source: 'aiPaths.hooks.useUpdateAiPathsSettingMutation',
      operation: 'update',
      resource: 'ai-paths.settings',
      domain: 'ai_paths',
      mutationKey,
      tags: ['ai-paths', 'settings', 'update'],
      description: 'Updates ai paths settings.'},
    invalidateKeys: [QUERY_KEYS.ai.aiPaths.settings()],
  });
}

export function useAiPathsTriggerButtonsQuery(): SingleQuery<AiTriggerButtonRecord[]> {
  const queryKey = QUERY_KEYS.ai.aiPaths.triggerButtons();
  return createSingleQueryV2({
    queryKey,
    queryFn: () => api.get<AiTriggerButtonRecord[]>('/api/ai-paths/trigger-buttons'),
    id: 'trigger-buttons',
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    meta: {
      source: 'aiPaths.hooks.useAiPathsTriggerButtonsQuery',
      operation: 'detail',
      resource: 'ai-paths.trigger-buttons',
      domain: 'ai_paths',
      queryKey,
      tags: ['ai-paths', 'trigger-buttons'],
      description: 'Loads ai paths trigger buttons.'},
  });
}

export function useAiPathRuntimeAnalytics(
  range: string,
  enabled: boolean = true
): SingleQuery<AiPathRuntimeAnalyticsSummary> {
  const queryKey = QUERY_KEYS.ai.aiPaths.runtimeAnalytics(range);
  return createSingleQueryV2({
    queryKey,
    queryFn: async () => {
      const response = await api.get<{ summary?: AiPathRuntimeAnalyticsSummary }>(
        '/api/ai-paths/runtime-analytics/summary',
        { params: { range } }
      );
      if (!response.summary) {
        throw new Error('Missing runtime analytics payload.');
      }
      return response.summary;
    },
    id: range,
    enabled,
    meta: {
      source: 'aiPaths.hooks.useAiPathRuntimeAnalytics',
      operation: 'detail',
      resource: 'ai-paths.runtime-analytics',
      domain: 'ai_paths',
      queryKey,
      tags: ['ai-paths', 'runtime-analytics'],
      description: 'Loads ai paths runtime analytics.'},
  });
}
