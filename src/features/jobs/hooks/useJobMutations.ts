'use client';

import { useQueryClient } from '@tanstack/react-query';

import { createCreateMutationV2, createDeleteMutationV2 } from '@/shared/lib/query-factories-v2';
import type { UpdateMutation, VoidMutation } from '@/shared/contracts/ui';

import { 
  performProductAiJobAction, 
  deleteProductAiJob, 
  clearProductAiJobs,
  updateChatbotJob,
  deleteChatbotJob,
  clearChatbotJobs,
  cancelListing
} from '../api';
import { jobKeys } from './useJobQueries';

export function useProductAiJobMutation(): UpdateMutation<unknown, { jobId: string; action: 'retry' | 'cancel' }> {
  const queryClient = useQueryClient();
  return createCreateMutationV2({
    mutationFn: ({ jobId, action }) => performProductAiJobAction(jobId, action),
    mutationKey: jobKeys.all,
    meta: {
      source: 'jobs.hooks.useProductAiJobMutation',
      operation: 'create',
      resource: 'jobs.product-ai.action',
      mutationKey: jobKeys.all,
      tags: ['jobs', 'product-ai', 'action'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useDeleteProductAiJobMutation(): VoidMutation<string> {
  const queryClient = useQueryClient();
  return createDeleteMutationV2({
    mutationFn: (jobId) => deleteProductAiJob(jobId).then(() => {}),
    mutationKey: jobKeys.all,
    meta: {
      source: 'jobs.hooks.useDeleteProductAiJobMutation',
      operation: 'delete',
      resource: 'jobs.product-ai',
      mutationKey: jobKeys.all,
      tags: ['jobs', 'product-ai', 'delete'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useClearProductAiJobsMutation(): VoidMutation<{ scope: string }> {
  const queryClient = useQueryClient();
  return createDeleteMutationV2({
    mutationFn: ({ scope }) => clearProductAiJobs(scope).then(() => {}),
    mutationKey: jobKeys.all,
    meta: {
      source: 'jobs.hooks.useClearProductAiJobsMutation',
      operation: 'delete',
      resource: 'jobs.product-ai.clear',
      mutationKey: jobKeys.all,
      tags: ['jobs', 'product-ai', 'clear'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useChatbotJobMutation(): UpdateMutation<unknown, { jobId: string; action: 'retry' | 'cancel' }> {
  const queryClient = useQueryClient();
  return createCreateMutationV2({
    mutationFn: ({ jobId, action }) => updateChatbotJob(jobId, action),
    mutationKey: jobKeys.all,
    meta: {
      source: 'jobs.hooks.useChatbotJobMutation',
      operation: 'create',
      resource: 'jobs.chatbot.action',
      mutationKey: jobKeys.all,
      tags: ['jobs', 'chatbot', 'action'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useDeleteChatbotJobMutation(): VoidMutation<{ jobId: string; force?: boolean }> {
  const queryClient = useQueryClient();
  return createDeleteMutationV2({
    mutationFn: ({ jobId, force }) => deleteChatbotJob(jobId, force),
    mutationKey: jobKeys.all,
    meta: {
      source: 'jobs.hooks.useDeleteChatbotJobMutation',
      operation: 'delete',
      resource: 'jobs.chatbot',
      mutationKey: jobKeys.all,
      tags: ['jobs', 'chatbot', 'delete'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useClearChatbotJobsMutation(): VoidMutation<{ scope: string }> {
  const queryClient = useQueryClient();
  return createDeleteMutationV2({
    mutationFn: ({ scope }) => clearChatbotJobs(scope).then(() => {}),
    mutationKey: jobKeys.all,
    meta: {
      source: 'jobs.hooks.useClearChatbotJobsMutation',
      operation: 'delete',
      resource: 'jobs.chatbot.clear',
      mutationKey: jobKeys.all,
      tags: ['jobs', 'chatbot', 'clear'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useCancelListingMutation(): VoidMutation<{ productId: string; listingId: string }> {
  const queryClient = useQueryClient();
  return createDeleteMutationV2({
    mutationFn: ({ productId, listingId }) => cancelListing(productId, listingId),
    mutationKey: jobKeys.integrations(),
    meta: {
      source: 'jobs.hooks.useCancelListingMutation',
      operation: 'delete',
      resource: 'jobs.integrations.listing',
      mutationKey: jobKeys.integrations(),
      tags: ['jobs', 'integrations', 'listing', 'cancel'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.integrations() });
    },
  });
}
