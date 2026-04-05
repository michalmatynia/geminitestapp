import { type Query } from '@tanstack/react-query';

import type { ChatbotJobsResponse } from '@/shared/contracts/chatbot';
import type { ProductJob } from '@/shared/contracts/integrations/domain';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui/queries';
import { createListQueryV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { jobKeys } from '@/shared/lib/query-key-exports';

import {
  getIntegrationJobs,
  getChatbotJobs,
  getTraderaQueueHealth,
  type TraderaQueueHealthResponse,
} from '../api';

export function useIntegrationJobs(): ListQuery<ProductJob> {
  const queryKey = jobKeys.integrations();
  return createListQueryV2({
    queryKey,
    queryFn: ({ signal }) => getIntegrationJobs(signal),
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
      const hasActiveListings = data.some(
        (job) =>
          Array.isArray(job.listings) &&
          job.listings.some((listing: { status?: string }) =>
            activeStatuses.has((listing.status ?? '').trim().toLowerCase())
          )
      );
      return hasActiveListings ? 2500 : false;
    },
    transformError: (error: unknown): Error =>
      error instanceof Error
        ? error
        : new Error('Failed to load integration jobs. Please try again.'),
    meta: {
      source: 'jobs.hooks.useIntegrationJobs',
      operation: 'list',
      resource: 'jobs.integrations',
      domain: 'jobs',
      queryKey,
      tags: ['jobs', 'integrations'],
      description: 'Loads jobs integrations.'},
  });
}

export { jobKeys };

export function useChatbotJobs(scope: string = 'all'): SingleQuery<ChatbotJobsResponse> {
  const queryKey = jobKeys.chatbot(scope);
  return createSingleQueryV2({
    id: scope,
    queryKey,
    queryFn: () => getChatbotJobs(scope),
    meta: {
      source: 'jobs.hooks.useChatbotJobs',
      operation: 'detail',
      resource: 'jobs.chatbot',
      domain: 'jobs',
      queryKey,
      tags: ['jobs', 'chatbot'],
      description: 'Loads jobs chatbot.'},
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
      domain: 'jobs',
      queryKey,
      tags: ['jobs', 'tradera'],
      description: 'Loads jobs tradera health.'},
  });
}
