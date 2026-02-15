'use client';

import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { createCreateMutation, createListQuery, createSingleQuery } from '@/shared/lib/query-factories';
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
  return createListQuery({
    queryKey: QUERY_KEYS.ai.aiPaths.settings(),
    queryFn: async () => await fetchAiPathsSettingsCached({ bypassCache: true }),
  });
}

export function useUpdateAiPathsSettingMutation(): VoidMutation<{ key: string; value: string }> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await updateAiPathsSetting(key, value);
      invalidateAiPathsSettingsCache();
    },
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ai.aiPaths.settings() });
      },
    },
  });
}

export function useAiPathsTriggerButtonsQuery(): SingleQuery<AiTriggerButtonRecord[]> {
  return createSingleQuery({
    queryKey: () => QUERY_KEYS.ai.aiPaths.triggerButtons(),
    queryFn: () => api.get<AiTriggerButtonRecord[]>('/api/ai-paths/trigger-buttons'),
    id: 'trigger-buttons',
  });
}

export function useAiPathRuntimeAnalytics(
  range: string,
  enabled: boolean = true
): SingleQuery<AiPathRuntimeAnalyticsSummary> {
  return createSingleQuery({
    queryKey: () => QUERY_KEYS.ai.aiPaths.runtimeAnalytics(range),
    queryFn: () => api.get<AiPathRuntimeAnalyticsSummary>('/api/ai-paths/runtime-analytics', { params: { range } }),
    id: range,
    options: {
      enabled,
    },
  });
}

export function useAiPathsQueueStatusQuery(): SingleQuery<{ status: string; active: number; queued: number; total: number }> {
  return createSingleQuery({
    queryKey: () => QUERY_KEYS.ai.aiPaths.queueStatus(),
    queryFn: () => api.get<{ status: string; active: number; queued: number; total: number }>('/api/ai-paths/queue-status'),
    id: 'queue-status',
  });
}
