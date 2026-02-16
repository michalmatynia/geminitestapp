'use client';

import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createSingleQueryV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { AiPathRuntimeAnalyticsSummary } from '@/shared/types/domain/ai-paths';
import type { AiTriggerButtonRecord } from '@/shared/types/domain/ai-trigger-buttons';
import type { ListQuery, VoidMutation, SingleQuery } from '@/shared/types/query-result-types';

import { 
  fetchAiPathsSettingsCached, 
  invalidateAiPathsSettingsCache, 
  updateAiPathsSetting 
} from '../lib/settings-store-client';

export function useAiPathsSettingsQuery(): ListQuery<{ key: string; value: string }> {
  const queryKey = QUERY_KEYS.ai.aiPaths.settings();
  return createListQueryV2({
    queryKey,
    queryFn: async () => await fetchAiPathsSettingsCached({ bypassCache: true }),
    meta: {
      source: 'aiPaths.hooks.useAiPathsSettingsQuery',
      operation: 'list',
      resource: 'ai-paths.settings',
      domain: 'global',
      queryKey,
      tags: ['ai-paths', 'settings'],
    },
  });
}

export function useUpdateAiPathsSettingMutation(): VoidMutation<{ key: string; value: string }> {
  const queryClient = useQueryClient();
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
      domain: 'global',
      mutationKey,
      tags: ['ai-paths', 'settings', 'update'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.aiPaths.settings() });
    },
  });
}

export function useAiPathsTriggerButtonsQuery(): SingleQuery<AiTriggerButtonRecord[]> {
  const queryKey = QUERY_KEYS.ai.aiPaths.triggerButtons();
  return createSingleQueryV2({
    queryKey,
    queryFn: () => api.get<AiTriggerButtonRecord[]>('/api/ai-paths/trigger-buttons'),
    id: 'trigger-buttons',
    meta: {
      source: 'aiPaths.hooks.useAiPathsTriggerButtonsQuery',
      operation: 'detail',
      resource: 'ai-paths.trigger-buttons',
      domain: 'global',
      queryKey,
      tags: ['ai-paths', 'trigger-buttons'],
    },
  });
}

export function useAiPathRuntimeAnalytics(
  range: string,
  enabled: boolean = true
): SingleQuery<AiPathRuntimeAnalyticsSummary> {
  const queryKey = QUERY_KEYS.ai.aiPaths.runtimeAnalytics(range);
  return createSingleQueryV2({
    queryKey,
    queryFn: () => api.get<AiPathRuntimeAnalyticsSummary>('/api/ai-paths/runtime-analytics', { params: { range } }),
    id: range,
    enabled,
    meta: {
      source: 'aiPaths.hooks.useAiPathRuntimeAnalytics',
      operation: 'detail',
      resource: 'ai-paths.runtime-analytics',
      domain: 'global',
      queryKey,
      tags: ['ai-paths', 'runtime-analytics'],
    },
  });
}

export function useAiPathsQueueStatusQuery(): SingleQuery<{ status: string; active: number; queued: number; total: number }> {
  const queryKey = QUERY_KEYS.ai.aiPaths.queueStatus();
  return createSingleQueryV2({
    queryKey,
    queryFn: () => api.get<{ status: string; active: number; queued: number; total: number }>('/api/ai-paths/queue-status'),
    id: 'queue-status',
    meta: {
      source: 'aiPaths.hooks.useAiPathsQueueStatusQuery',
      operation: 'detail',
      resource: 'ai-paths.queue-status',
      domain: 'global',
      queryKey,
      tags: ['ai-paths', 'queue-status'],
    },
  });
}
