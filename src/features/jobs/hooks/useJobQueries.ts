'use client';

import { type Query } from '@tanstack/react-query';

import { createListQuery, createSingleQuery } from '@/shared/lib/query-factories';
import { jobKeys } from '@/shared/lib/query-key-exports';
import type { ProductAiJob } from '@/shared/types/domain/jobs';
import type { ProductJob } from '@/shared/types/domain/listing-jobs';
import type { ListQuery, SingleQuery } from '@/shared/types/query-result-types';

import {
  getIntegrationJobs,
  getProductAiJobs,
  getChatbotJobs,
  getTraderaQueueHealth,
  type TraderaQueueHealthResponse,
} from '../api';


export function useIntegrationJobs(): ListQuery<ProductJob> {
  return createListQuery({
    queryKey: jobKeys.integrations(),
    queryFn: getIntegrationJobs,
    options: {
      refetchInterval: (query: Query<ProductJob[], Error>): number | false => {
        const jobs = query.state.data;
        if (!Array.isArray(jobs)) return 5000;
        const activeStatuses = new Set([
          'queued',
          'queued_relist',
          'pending',
          'running',
          'processing',
          'in_progress',
        ]);
        const hasActiveListings = jobs.some((job) =>
          Array.isArray(job.listings) &&
          job.listings.some((listing: { status?: string }) =>
            activeStatuses.has((listing.status ?? '').trim().toLowerCase())
          )
        );
        return hasActiveListings ? 2500 : false;
      },
      refetchIntervalInBackground: true,
    },
  });
}

export function useProductAiJobs(scope: string = 'all'): SingleQuery<{ jobs: ProductAiJob[] }> {
  return createSingleQuery({
    queryKey: jobKeys.productAi(scope),
    queryFn: () => getProductAiJobs(scope),
    options: {
      refetchInterval: (query: Query<{ jobs: ProductAiJob[] }, Error>): number | false => {
        const data = query.state.data;
        if (!data || !Array.isArray(data.jobs)) return 5000;
        const hasActive = data.jobs.some((job: ProductAiJob) => job.status === 'pending' || job.status === 'running');
        const hasScheduled = data.jobs.some((job: ProductAiJob) => hasScheduledMarker(job.payload));
        return hasActive || hasScheduled ? 5000 : false;
      },
      refetchIntervalInBackground: true,
    },
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

export { jobKeys };

export function useChatbotJobs(scope: string = 'all'): SingleQuery<{ jobs: unknown[] }> {
  return createSingleQuery({
    queryKey: jobKeys.chatbot(scope),
    queryFn: () => getChatbotJobs(scope),
  });
}

export function useTraderaQueueHealth(): SingleQuery<TraderaQueueHealthResponse> {
  return createSingleQuery({
    queryKey: jobKeys.traderaQueueHealth(),
    queryFn: getTraderaQueueHealth,
    options: {
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
      staleTime: 0,
    },
  });
}
