'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { jobKeys } from './useJobQueries';

export function useProductAiJobMutation(): UseMutationResult<unknown, Error, { jobId: string; action: 'retry' | 'cancel' }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, action }: { jobId: string; action: 'retry' | 'cancel' }): Promise<unknown> => {
      const res = await fetch(`/api/products/ai-jobs/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`Failed to ${action} product AI job`);
      return res.json() as Promise<unknown>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.productAi });
    },
  });
}

export function useDeleteProductAiJobMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string): Promise<void> => {
      const res = await fetch(`/api/products/ai-jobs/${jobId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete product AI job');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.productAi });
    },
  });
}

export function useClearProductAiJobsMutation(): UseMutationResult<void, Error, { scope: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ scope }: { scope: string }): Promise<void> => {
      const res = await fetch(`/api/products/ai-jobs?scope=${scope}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to clear product AI jobs');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.productAi });
    },
  });
}

export function useChatbotJobMutation(): UseMutationResult<unknown, Error, { jobId: string; action: 'retry' | 'cancel' }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, action }: { jobId: string; action: 'retry' | 'cancel' }): Promise<unknown> => {
      const res = await fetch(`/api/chatbot/jobs/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`Failed to ${action} chatbot job`);
      return res.json() as Promise<unknown>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.chatbot });
    },
  });
}

export function useDeleteChatbotJobMutation(): UseMutationResult<void, Error, { jobId: string; force?: boolean }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, force }: { jobId: string; force?: boolean }): Promise<void> => {
      const url = force ? `/api/chatbot/jobs/${jobId}?force=true` : `/api/chatbot/jobs/${jobId}`;
      const res = await fetch(url, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete chatbot job');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.chatbot });
    },
  });
}

export function useClearChatbotJobsMutation(): UseMutationResult<void, Error, { scope: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ scope }: { scope: string }): Promise<void> => {
      const res = await fetch(`/api/chatbot/jobs?scope=${scope}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to clear chatbot jobs');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.chatbot });
    },
  });
}

export function useCancelListingMutation(): UseMutationResult<void, Error, { productId: string; listingId: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, listingId }: { productId: string; listingId: string }): Promise<void> => {
      const res = await fetch(`/api/integrations/products/${productId}/listings/${listingId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to cancel listing');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.integrations });
    },
  });
}
