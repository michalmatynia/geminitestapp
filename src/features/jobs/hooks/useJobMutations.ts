'use client';

import { useQueryClient } from '@tanstack/react-query';

import { createCreateMutation, createDeleteMutation } from '@/shared/lib/query-factories';
import type { UpdateMutation, VoidMutation } from '@/shared/types/query-result-types';

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
  return createCreateMutation({
    mutationFn: ({ jobId, action }) => performProductAiJobAction(jobId, action),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: jobKeys.all });
      },
    },
  });
}

export function useDeleteProductAiJobMutation(): VoidMutation<string> {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: (jobId) => deleteProductAiJob(jobId).then(() => {}),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: jobKeys.all });
      },
    },
  });
}

export function useClearProductAiJobsMutation(): VoidMutation<{ scope: string }> {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: ({ scope }) => clearProductAiJobs(scope).then(() => {}),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: jobKeys.all });
      },
    },
  });
}

export function useChatbotJobMutation(): UpdateMutation<unknown, { jobId: string; action: 'retry' | 'cancel' }> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: ({ jobId, action }) => updateChatbotJob(jobId, action),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: jobKeys.all });
      },
    },
  });
}

export function useDeleteChatbotJobMutation(): VoidMutation<{ jobId: string; force?: boolean }> {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: ({ jobId, force }) => deleteChatbotJob(jobId, force),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: jobKeys.all });
      },
    },
  });
}

export function useClearChatbotJobsMutation(): VoidMutation<{ scope: string }> {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: ({ scope }) => clearChatbotJobs(scope).then(() => {}),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: jobKeys.all });
      },
    },
  });
}

export function useCancelListingMutation(): VoidMutation<{ productId: string; listingId: string }> {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: ({ productId, listingId }) => cancelListing(productId, listingId),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: jobKeys.integrations() });
      },
    },
  });
}
