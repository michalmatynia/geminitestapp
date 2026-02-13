'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { brainKeys } from '@/shared/lib/query-key-exports';
import type { 
  AiInsightRecord, 
  AiPathRuntimeAnalyticsSummary, 
  AnalyticsSummaryDto, 
  SystemLogMetrics 
} from '@/shared/types';

export { brainKeys };

export type ChatbotModelsResponse = {
  models?: string[];
  warning?: { code?: string; message?: string };
};

export type InsightsSnapshot = {
  analytics: AiInsightRecord[];
  logs: AiInsightRecord[];
};

export function useOllamaModels(): UseQueryResult<ChatbotModelsResponse, Error> {
  return useQuery({
    queryKey: brainKeys.ollamaModels(),
    queryFn: () => api.get<ChatbotModelsResponse>('/api/chatbot'),
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
  });
}

export function useBrainAnalyticsSummary(): UseQueryResult<AnalyticsSummaryDto, Error> {
  return useQuery({
    queryKey: brainKeys.analyticsSummary(),
    queryFn: () => api.get<AnalyticsSummaryDto>('/api/analytics/summary', {
      params: { range: '24h', scope: 'all' }
    }),
    refetchInterval: 30_000,
  });
}

export function useBrainLogMetrics(): UseQueryResult<SystemLogMetrics, Error> {
  return useQuery({
    queryKey: brainKeys.logMetrics(),
    queryFn: async (): Promise<SystemLogMetrics> => {
      const data = await api.get<{ metrics?: SystemLogMetrics }>('/api/system/logs/metrics', {
        params: { level: 'error' }
      });
      if (!data.metrics) throw new Error('Missing metrics payload.');
      return data.metrics;
    },
    refetchInterval: 30_000,
  });
}

export function useBrainInsights(): UseQueryResult<InsightsSnapshot, Error> {
  return useQuery({
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
    refetchInterval: 30_000,
  });
}

export function useBrainRuntimeAnalytics(): UseQueryResult<AiPathRuntimeAnalyticsSummary, Error> {
  return useQuery({
    queryKey: brainKeys.runtimeAnalytics(),
    queryFn: async (): Promise<AiPathRuntimeAnalyticsSummary> => {
      const data = await api.get<{ summary?: AiPathRuntimeAnalyticsSummary }>('/api/ai-paths/runtime-analytics/summary', {
        params: { range: '24h' }
      });
      if (!data.summary) throw new Error('Missing runtime analytics payload.');
      return data.summary;
    },
    refetchInterval: 30_000,
  });
}
