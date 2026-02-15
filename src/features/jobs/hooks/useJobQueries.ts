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
    refetchInterval: (data) => {
      if (!Array.isArray(data)) return 5000;
      const activeStatuses = new Set([
        'queued',
        'queued_relist',
        'pending',
        'running',
        'processing',
        'in_progress',
      ]);
      const hasActiveListings = data.some((job) =>
        Array.isArray(job.listings) &&
        job.listings.some((listing: { status?: string }) =>
          activeStatuses.has((listing.status ?? '').trim().toLowerCase())
        )
      );
      return hasActiveListings ? 2500 : false;
    },
  });
}

export function useProductAiJobs(scope: string = 'all'): SingleQuery<{ jobs: ProductAiJob[] }> {
  return createSingleQuery({
    id: scope,
    queryKey: jobKeys.productAi(scope),
    queryFn: () => getProductAiJobs(scope),
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
    id: scope,
    queryKey: jobKeys.chatbot(scope),
    queryFn: () => getChatbotJobs(scope),
  });
}

export function useTraderaQueueHealth(): SingleQuery<TraderaQueueHealthResponse> {
  return createSingleQuery({
    id: 'tradera-health',
    queryKey: jobKeys.traderaQueueHealth(),
    queryFn: getTraderaQueueHealth,
    refetchInterval: 5000,
    staleTime: 0,
  });
}
