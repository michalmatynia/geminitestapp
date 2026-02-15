'use client';

import { brainKeys } from '@/shared/lib/query-key-exports';
import { api } from '@/shared/lib/api-client';
import { createSingleQuery } from '@/shared/lib/query-factories';
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
  return createSingleQuery({
    queryKey: brainKeys.ollamaModels(),
    queryFn: () => api.get<ChatbotModelsResponse>('/api/chatbot'),
    options: {
      staleTime: 1000 * 60,
      refetchInterval: 1000 * 60,
    },
  });
}

export function useBrainAnalyticsSummary(): SingleQuery<AnalyticsSummaryDto> {
  return createSingleQuery({
    queryKey: brainKeys.analyticsSummary(),
    queryFn: () => api.get<AnalyticsSummaryDto>('/api/analytics/summary', {
      params: { range: '24h', scope: 'all' }
    }),
    options: {
      refetchInterval: 30_000,
    },
  });
}

export function useBrainLogMetrics(): SingleQuery<SystemLogMetrics> {
  return createSingleQuery({
    queryKey: brainKeys.logMetrics(),
    queryFn: async (): Promise<SystemLogMetrics> => {
      const data = await api.get<{ metrics?: SystemLogMetrics }>('/api/system/logs/metrics', {
        params: { level: 'error' }
      });
      if (!data.metrics) throw new Error('Missing metrics payload.');
      return data.metrics;
    },
    options: {
      refetchInterval: 30_000,
    },
  });
}

export function useBrainInsights(): SingleQuery<InsightsSnapshot> {
  return createSingleQuery({
    queryKey: brainKeys.insights(),
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
    options: {
      refetchInterval: 30_000,
    },
  });
}

export function useBrainRuntimeAnalytics(): SingleQuery<AiPathRuntimeAnalyticsSummary> {
  return createSingleQuery({
    queryKey: brainKeys.runtimeAnalytics(),
    queryFn: async (): Promise<AiPathRuntimeAnalyticsSummary> => {
      const data = await api.get<{ summary?: AiPathRuntimeAnalyticsSummary }>('/api/ai-paths/runtime-analytics/summary', {
        params: { range: '24h' }
      });
      if (!data.summary) throw new Error('Missing runtime analytics payload.');
      return data.summary;
    },
    options: {
      refetchInterval: 30_000,
    },
  });
}
