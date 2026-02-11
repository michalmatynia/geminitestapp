'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

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

export function useProductAiJobMutation(): UseMutationResult<unknown, Error, { jobId: string; action: 'retry' | 'cancel' }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, action }) => performProductAiJobAction(jobId, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useDeleteProductAiJobMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId) => deleteProductAiJob(jobId).then(() => {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useClearProductAiJobsMutation(): UseMutationResult<void, Error, { scope: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scope }) => clearProductAiJobs(scope).then(() => {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useChatbotJobMutation(): UseMutationResult<unknown, Error, { jobId: string; action: 'retry' | 'cancel' }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, action }) => updateChatbotJob(jobId, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useDeleteChatbotJobMutation(): UseMutationResult<void, Error, { jobId: string; force?: boolean }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, force }) => deleteChatbotJob(jobId, force),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useClearChatbotJobsMutation(): UseMutationResult<void, Error, { scope: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scope }) => clearChatbotJobs(scope).then(() => {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useCancelListingMutation(): UseMutationResult<void, Error, { productId: string; listingId: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, listingId }) => cancelListing(productId, listingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.integrations() });
    },
  });
}
