'use client';

import type { UpdateMutation, VoidMutation } from '@/shared/contracts/ui';
import { createCreateMutationV2, createDeleteMutationV2 } from '@/shared/lib/query-factories-v2';

import {
  performProductAiJobAction,
  deleteProductAiJob,
  clearProductAiJobs,
  updateChatbotJob,
  deleteChatbotJob,
  clearChatbotJobs,
  cancelListing,
} from '../api';
import { jobKeys } from './useJobQueries';

export function useProductAiJobMutation(): UpdateMutation<
  unknown,
  { jobId: string; action: 'retry' | 'cancel' }
> {
  return createCreateMutationV2({
    mutationFn: ({ jobId, action }) => performProductAiJobAction(jobId, action),
    mutationKey: jobKeys.all,
    transformError: (error: unknown): Error =>
      error instanceof Error
        ? error
        : new Error('Failed to perform product AI job action. Please try again.'),
    meta: {
      source: 'jobs.hooks.useProductAiJobMutation',
      operation: 'create',
      resource: 'jobs.product-ai.action',
      domain: 'jobs',
      mutationKey: jobKeys.all,
      tags: ['jobs', 'product-ai', 'action'],
    },
    invalidateKeys: [jobKeys.all],
  });
}

export function useDeleteProductAiJobMutation(): VoidMutation<string> {
  return createDeleteMutationV2({
    mutationFn: (jobId) => deleteProductAiJob(jobId).then(() => {}),
    mutationKey: jobKeys.all,
    transformError: (error: unknown): Error =>
      error instanceof Error
        ? error
        : new Error('Failed to delete product AI job. Please try again.'),
    meta: {
      source: 'jobs.hooks.useDeleteProductAiJobMutation',
      operation: 'delete',
      resource: 'jobs.product-ai',
      domain: 'jobs',
      mutationKey: jobKeys.all,
      tags: ['jobs', 'product-ai', 'delete'],
    },
    invalidateKeys: [jobKeys.all],
  });
}

export function useClearProductAiJobsMutation(): VoidMutation<{ scope: string }> {
  return createDeleteMutationV2({
    mutationFn: ({ scope }) => clearProductAiJobs(scope).then(() => {}),
    mutationKey: jobKeys.all,
    transformError: (error: unknown): Error =>
      error instanceof Error
        ? error
        : new Error('Failed to clear product AI jobs. Please try again.'),
    meta: {
      source: 'jobs.hooks.useClearProductAiJobsMutation',
      operation: 'delete',
      resource: 'jobs.product-ai.clear',
      domain: 'jobs',
      mutationKey: jobKeys.all,
      tags: ['jobs', 'product-ai', 'clear'],
    },
    invalidateKeys: [jobKeys.all],
  });
}

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

export function useDeleteChatbotJobMutation(): VoidMutation<{ jobId: string; force?: boolean }> {
  return createDeleteMutationV2({
    mutationFn: ({ jobId, force }) => deleteChatbotJob(jobId, force),
    mutationKey: jobKeys.all,
    transformError: (error: unknown): Error =>
      error instanceof Error ? error : new Error('Failed to delete chatbot job. Please try again.'),
    meta: {
      source: 'jobs.hooks.useDeleteChatbotJobMutation',
      operation: 'delete',
      resource: 'jobs.chatbot',
      domain: 'jobs',
      mutationKey: jobKeys.all,
      tags: ['jobs', 'chatbot', 'delete'],
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
