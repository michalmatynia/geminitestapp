'use client';

import type { UpdateMutation, VoidMutation } from '@/shared/contracts/ui';
import { createCreateMutationV2, createDeleteMutationV2 } from '@/shared/lib/query-factories-v2';

import {
  updateChatbotJob,
  clearChatbotJobs,
  cancelListing,
} from '../api';
import { jobKeys } from './useJobQueries';

export function useChatbotJobMutation(): UpdateMutation<
  unknown,
  { jobId: string; action: 'retry' | 'cancel' }
  > {
  return createCreateMutationV2({
    mutationFn: ({ jobId, action }) => updateChatbotJob(jobId, action),
    mutationKey: jobKeys.all,
    transformError: (error: unknown): Error =>
      error instanceof Error
        ? error
        : new Error('Failed to perform chatbot job action. Please try again.'),
    meta: {
      source: 'jobs.hooks.useChatbotJobMutation',
      operation: 'create',
      resource: 'jobs.chatbot.action',
      domain: 'jobs',
      mutationKey: jobKeys.all,
      tags: ['jobs', 'chatbot', 'action'],
    },
    invalidateKeys: [jobKeys.all],
  });
}

export function useClearChatbotJobsMutation(): VoidMutation<{ scope: string }> {
  return createDeleteMutationV2({
    mutationFn: ({ scope }) => clearChatbotJobs(scope).then(() => {}),
    mutationKey: jobKeys.all,
    transformError: (error: unknown): Error =>
      error instanceof Error ? error : new Error('Failed to clear chatbot jobs. Please try again.'),
    meta: {
      source: 'jobs.hooks.useClearChatbotJobsMutation',
      operation: 'delete',
      resource: 'jobs.chatbot.clear',
      domain: 'jobs',
      mutationKey: jobKeys.all,
      tags: ['jobs', 'chatbot', 'clear'],
    },
    invalidateKeys: [jobKeys.all],
  });
}

export function useCancelListingMutation(): VoidMutation<{ productId: string; listingId: string }> {
  return createDeleteMutationV2({
    mutationFn: ({ productId, listingId }) => cancelListing(productId, listingId),
    mutationKey: jobKeys.integrations(),
    transformError: (error: unknown): Error =>
      error instanceof Error ? error : new Error('Failed to cancel listing. Please try again.'),
    meta: {
      source: 'jobs.hooks.useCancelListingMutation',
      operation: 'delete',
      resource: 'jobs.integrations.listing',
      domain: 'jobs',
      mutationKey: jobKeys.integrations(),
      tags: ['jobs', 'integrations', 'listing', 'cancel'],
    },
    invalidateKeys: [jobKeys.integrations()],
  });
}
