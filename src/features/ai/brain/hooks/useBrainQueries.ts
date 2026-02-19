'use client';

import type { 
  ChatbotModelsResponseDto, 
  InsightsSnapshotDto 
} from '@/shared/contracts/ai-brain';
import type { SystemLogMetricsDto as SystemLogMetrics } from '@/shared/contracts/observability';
import { api } from '@/shared/lib/api-client';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { brainKeys } from '@/shared/lib/query-key-exports';
import type { 
  AiInsightRecord, 
  AiPathRuntimeAnalyticsSummary, 
  AnalyticsSummaryDto, 
} from '@/shared/types';
import type { SingleQuery } from '@/shared/types/query-result-types';

export { brainKeys };

export type ChatbotModelsResponse = ChatbotModelsResponseDto;

export type InsightsSnapshot = InsightsSnapshotDto;

export function useOllamaModels(): SingleQuery<ChatbotModelsResponse> {
  const queryKey = brainKeys.ollamaModels();
  return createSingleQueryV2<ChatbotModelsResponse>({
    queryKey,
    queryFn: () => api.get<ChatbotModelsResponse>('/api/chatbot'),
    id: 'ollama-models',
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
    meta: {
      source: 'brain.hooks.useOllamaModels',
      operation: 'polling',
      resource: 'brain.ollama-models',
      domain: 'global',
      queryKey,
      tags: ['brain', 'ollama-models'],
    },
  });
}

export function useBrainAnalyticsSummary(): SingleQuery<AnalyticsSummaryDto> {
  const queryKey = brainKeys.analyticsSummary();
  return createSingleQueryV2<AnalyticsSummaryDto>({
    queryKey,
    queryFn: () => api.get<AnalyticsSummaryDto>('/api/analytics/summary', {
      params: { range: '24h', scope: 'all' }
    }),
    id: 'analytics-summary',
    refetchInterval: 30_000,
    meta: {
      source: 'brain.hooks.useBrainAnalyticsSummary',
      operation: 'polling',
      resource: 'brain.analytics-summary',
      domain: 'global',
      queryKey,
      tags: ['brain', 'analytics-summary'],
    },
  });
}

export function useBrainLogMetrics(): SingleQuery<SystemLogMetrics> {
  const queryKey = brainKeys.logMetrics();
  return createSingleQueryV2<SystemLogMetrics>({
    queryKey,
    queryFn: async (): Promise<SystemLogMetrics> => {
      const data = await api.get<{ metrics?: SystemLogMetrics }>('/api/system/logs/metrics', {
        params: { level: 'error' }
      });
      if (!data.metrics) throw new Error('Missing metrics payload.');
      return data.metrics;
    },
    id: 'log-metrics',
    refetchInterval: 30_000,
    meta: {
      source: 'brain.hooks.useBrainLogMetrics',
      operation: 'polling',
      resource: 'brain.log-metrics',
      domain: 'global',
      queryKey,
      tags: ['brain', 'log-metrics'],
    },
  });
}

export function useBrainInsights(): SingleQuery<InsightsSnapshot> {
  const queryKey = brainKeys.insights();
  return createSingleQueryV2<InsightsSnapshot>({
    queryKey,
    queryFn: async (): Promise<InsightsSnapshot> => {
      const [analyticsData, logsData] = await Promise.all([
        api.get<{ insights?: AiInsightRecord[] }>('/api/analytics/insights', { params: { limit: 5 } }),
        api.get<{ insights?: AiInsightRecord[] }>('/api/system/logs/insights', { params: { limit: 5 } }),
      ]);
      return {
        analytics: analyticsData.insights ?? [],
        logs: logsData.insights ?? [],
      };
    },
    id: 'insights',
    refetchInterval: 30_000,
    meta: {
      source: 'brain.hooks.useBrainInsights',
      operation: 'polling',
      resource: 'brain.insights',
      domain: 'global',
      queryKey,
      tags: ['brain', 'insights'],
    },
  });
}

export function useBrainRuntimeAnalytics(): SingleQuery<AiPathRuntimeAnalyticsSummary> {
  const queryKey = brainKeys.runtimeAnalytics();
  return createSingleQueryV2<AiPathRuntimeAnalyticsSummary>({
    queryKey,
    queryFn: async (): Promise<AiPathRuntimeAnalyticsSummary> => {
      const data = await api.get<{ summary?: AiPathRuntimeAnalyticsSummary }>('/api/ai-paths/runtime-analytics/summary', {
        params: { range: '24h' }
      });
      if (!data.summary) throw new Error('Missing runtime analytics payload.');
      return data.summary;
    },
    id: 'runtime-analytics',
    refetchInterval: 30_000,
    meta: {
      source: 'brain.hooks.useBrainRuntimeAnalytics',
      operation: 'polling',
      resource: 'brain.runtime-analytics',
      domain: 'global',
      queryKey,
      tags: ['brain', 'runtime-analytics'],
    },
  });
}
