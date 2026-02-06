'use client';

import { useQuery, type UseQueryResult, type Query } from '@tanstack/react-query';

import type { ProductAiJob } from '@/shared/types/jobs';
import type { ProductJob } from '@/shared/types/listing-jobs';

export const jobKeys = {
  all: ['jobs'] as const,
  integrations: ['jobs', 'integrations'] as const,
  productAi: ['jobs', 'product-ai'] as const,
  chatbot: ['jobs', 'chatbot'] as const,
};

export function useIntegrationJobs(): UseQueryResult<ProductJob[]> {
  return useQuery({
    queryKey: jobKeys.integrations,
    queryFn: async (): Promise<ProductJob[]> => {
      const res = await fetch('/api/integrations/jobs');
      if (!res.ok) throw new Error('Failed to load integration jobs');
      return (await res.json()) as ProductJob[];
    },
  });
}

export function useProductAiJobs(scope: string = 'all'): UseQueryResult<{ jobs: ProductAiJob[] }> {
  return useQuery({
    queryKey: [...jobKeys.productAi, scope],
    queryFn: async (): Promise<{ jobs: ProductAiJob[] }> => {
      const res = await fetch(`/api/products/ai-jobs?scope=${scope}`);
      if (!res.ok) throw new Error('Failed to load product AI jobs');
      return (await res.json()) as { jobs: ProductAiJob[] };
    },
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
  const context = record.context;
  if (context && typeof context === 'object') {
    const ctx = context as Record<string, unknown>;
    if (keys.some((key: string) => ctx[key])) return true;
  }
  return false;
};

export function useChatbotJobs(scope: string = 'all'): UseQueryResult<{ jobs: unknown[] }> {
  return useQuery({
    queryKey: [...jobKeys.chatbot, scope],
    queryFn: async (): Promise<{ jobs: unknown[] }> => {
      const res = await fetch(`/api/chatbot/jobs?scope=${scope}`);
      if (!res.ok) throw new Error('Failed to load chatbot jobs');
      return (await res.json()) as { jobs: unknown[] };
    },
  });
}
