'use client';

import { api } from '@/shared/lib/api-client';
import { createSingleQuery } from '@/shared/lib/query-factories-v2';
import { brainKeys } from '@/shared/lib/query-key-exports';
import type { 
  AiInsightRecord, 
  AiPathRuntimeAnalyticsSummary, 
  AnalyticsSummaryDto, 
  SystemLogMetrics 
} from '@/shared/types';
import type { SingleQuery } from '@/shared/types/query-result-types';

export { brainKeys };

export type ChatbotModelsResponse = {
  models?: string[];
  warning?: { code?: string; message?: string };
};

export type InsightsSnapshot = {
  analytics: AiInsightRecord[];
  logs: AiInsightRecord[];
};

export function useOllamaModels(): SingleQuery<ChatbotModelsResponse> {
  return createSingleQuery<ChatbotModelsResponse>({
    queryKey: () => brainKeys.ollamaModels(),
    queryFn: () => api.get<ChatbotModelsResponse>('/api/chatbot'),
    id: 'ollama-models',
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
  });
}

export function useBrainAnalyticsSummary(): SingleQuery<AnalyticsSummaryDto> {
  return createSingleQuery<AnalyticsSummaryDto>({
    queryKey: () => brainKeys.analyticsSummary(),
    queryFn: () => api.get<AnalyticsSummaryDto>('/api/analytics/summary', {
      params: { range: '24h', scope: 'all' }
    }),
    id: 'analytics-summary',
    refetchInterval: 30_000,
  });
}

export function useBrainLogMetrics(): SingleQuery<SystemLogMetrics> {
  return createSingleQuery<SystemLogMetrics>({
    queryKey: () => brainKeys.logMetrics(),
    queryFn: async (): Promise<SystemLogMetrics> => {
      const data = await api.get<{ metrics?: SystemLogMetrics }>('/api/system/logs/metrics', {
        params: { level: 'error' }
      });
      if (!data.metrics) throw new Error('Missing metrics payload.');
      return data.metrics;
    },
    id: 'log-metrics',
    refetchInterval: 30_000,
  });
}

export function useBrainInsights(): SingleQuery<InsightsSnapshot> {
  return createSingleQuery<InsightsSnapshot>({
    queryKey: () => brainKeys.insights(),
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
  });
}

export function useBrainRuntimeAnalytics(): SingleQuery<AiPathRuntimeAnalyticsSummary> {
  return createSingleQuery<AiPathRuntimeAnalyticsSummary>({
    queryKey: () => brainKeys.runtimeAnalytics(),
    queryFn: async (): Promise<AiPathRuntimeAnalyticsSummary> => {
      const data = await api.get<{ summary?: AiPathRuntimeAnalyticsSummary }>('/api/ai-paths/runtime-analytics/summary', {
        params: { range: '24h' }
      });
      if (!data.summary) throw new Error('Missing runtime analytics payload.');
      return data.summary;
    },
    id: 'runtime-analytics',
    refetchInterval: 30_000,
  });
}
