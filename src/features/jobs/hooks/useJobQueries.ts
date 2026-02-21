'use client';

import { type Query } from '@tanstack/react-query';

import type { ProductJob } from '@/shared/contracts/integrations';
import type { ProductAiJob } from '@/shared/contracts/jobs';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui';
import { createListQueryV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { jobKeys } from '@/shared/lib/query-key-exports';

import {
  getIntegrationJobs,
  getProductAiJobs,
  getChatbotJobs,
  getTraderaQueueHealth,
  type TraderaQueueHealthResponse,
} from '../api';

export function useIntegrationJobs(): ListQuery<ProductJob> {
  const queryKey = jobKeys.integrations();
  return createListQueryV2({
    queryKey,
    queryFn: getIntegrationJobs,
    refetchInterval: (query: Query<ProductJob[], Error, ProductJob[], readonly unknown[]>) => {
      const data = query.state.data;
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
    meta: {
      source: 'jobs.hooks.useIntegrationJobs',
      operation: 'list',
      resource: 'jobs.integrations',
      queryKey,
      tags: ['jobs', 'integrations'],
    },
  });
}

export function useProductAiJobs(scope: string = 'all'): SingleQuery<{ jobs: ProductAiJob[] }> {
  const queryKey = jobKeys.productAi(scope);
  return createSingleQueryV2({
    id: scope,
    queryKey,
    queryFn: () => getProductAiJobs(scope),
    meta: {
      source: 'jobs.hooks.useProductAiJobs',
      operation: 'detail',
      resource: 'jobs.product-ai',
      queryKey,
      tags: ['jobs', 'product-ai'],
    },
  });
}

export { jobKeys };

export function useChatbotJobs(scope: string = 'all'): SingleQuery<{ jobs: unknown[] }> {
  const queryKey = jobKeys.chatbot(scope);
  return createSingleQueryV2({
    id: scope,
    queryKey,
    queryFn: () => getChatbotJobs(scope),
    meta: {
      source: 'jobs.hooks.useChatbotJobs',
      operation: 'detail',
      resource: 'jobs.chatbot',
      queryKey,
      tags: ['jobs', 'chatbot'],
    },
  });
}

export function useTraderaQueueHealth(): SingleQuery<TraderaQueueHealthResponse> {
  const queryKey = jobKeys.traderaQueueHealth();
  return createSingleQueryV2({
    id: 'tradera-health',
    queryKey,
    queryFn: getTraderaQueueHealth,
    refetchInterval: 5000,
    staleTime: 0,
    meta: {
      source: 'jobs.hooks.useTraderaQueueHealth',
      operation: 'detail',
      resource: 'jobs.tradera-health',
      queryKey,
      tags: ['jobs', 'tradera'],
    },
  });
}
