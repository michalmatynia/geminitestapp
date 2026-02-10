'use client';

import { useQuery, type UseQueryResult, type Query } from '@tanstack/react-query';

import type { ProductAiJob } from '@/shared/types/domain/jobs';
import type { ProductJob } from '@/shared/types/domain/listing-jobs';

import { getIntegrationJobs, getProductAiJobs, getChatbotJobs } from '../api';

export const jobKeys = {
  all: ['jobs'] as const,
  integrations: ['jobs', 'integrations'] as const,
  productAi: ['jobs', 'product-ai'] as const,
  chatbot: ['jobs', 'chatbot'] as const,
};

export function useIntegrationJobs(): UseQueryResult<ProductJob[]> {
  return useQuery({
    queryKey: jobKeys.integrations,
    queryFn: getIntegrationJobs,
  });
}

export function useProductAiJobs(scope: string = 'all'): UseQueryResult<{ jobs: ProductAiJob[] }> {
  return useQuery({
    queryKey: [...jobKeys.productAi, scope],
    queryFn: () => getProductAiJobs(scope),
    refetchInterval: (query: Query<{ jobs: ProductAiJob[] }, Error>): number | false => {
      const data = query.state.data;
      if (!data || !Array.isArray(data.jobs)) return 5000;
      const hasActive = data.jobs.some((job: ProductAiJob) => job.status === 'pending' || job.status === 'running');
      const hasScheduled = data.jobs.some((job: ProductAiJob) => hasScheduledMarker(job.payload));
      return hasActive || hasScheduled ? 5000 : false;
    },
    refetchIntervalInBackground: true,
  });
}

const hasScheduledMarker = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') return false;
  const record = payload as Record<string, unknown>;
  const keys = ['runAt', 'scheduledAt', 'scheduleAt', 'nextRunAt', 'schedule', 'scheduled', 'cron'];
  if (keys.some((key: string) => record[key])) return true;
  const context = record['context'];
  if (context && typeof context === 'object') {
    const ctx = context as Record<string, unknown>;
    if (keys.some((key: string) => ctx[key])) return true;
  }
  return false;
};

export function useChatbotJobs(scope: string = 'all'): UseQueryResult<{ jobs: unknown[] }> {
  return useQuery({
    queryKey: [...jobKeys.chatbot, scope],
    queryFn: () => getChatbotJobs(scope),
  });
}
